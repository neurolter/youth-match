// Importador de oportunidades de Youth Match.
//
//   npm run importar                         → las fuentes a las que les toca (según frequency_hours)
//   npm run importar -- --fuente=oea-becas   → una sola fuente, ahora
//   npm run importar -- --todas              → todas las fuentes activas, sin mirar la frecuencia
//   npm run importar -- --forzar             → volver a pasar por la IA aunque la página no haya cambiado
//   npm run importar -- --max=10             → tope de páginas por fuente en esta ejecución
//
// Corre con `tsx`, fuera de Next.js. Variables: NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SECRET_KEY y GEMINI_API_KEY (o ANTHROPIC_API_KEY).
import { appendFileSync, existsSync } from "node:fs";
import { aiAvailable, extract, usage } from "./ai";
import { closeBrowser, newPage } from "./browser";
import { CONNECTORS } from "./connectors";
import { Http } from "./http";
import { runSource } from "./pipeline";
import { isDue } from "./schedule";
import { SupabaseStore, type RunResult } from "./store";
import type { Source } from "./types";

// Precio por millón de tokens (USD) de Gemini 3.8 Flash para estimar el costo: 0,75 de entrada y 3,75 de
// salida hasta el 31-dic-2026 (después, 1,50 y 7,50). Ajustable con AI_PRICE_INPUT y AI_PRICE_OUTPUT.
const PRICE_IN = Number(process.env.AI_PRICE_INPUT ?? 0.75);
const PRICE_OUT = Number(process.env.AI_PRICE_OUTPUT ?? 3.75);

function args() {
  const argv = process.argv.slice(2);
  const value = (name: string) => {
    const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
    if (i < 0) return undefined;
    return argv[i].includes("=") ? argv[i].split("=").slice(1).join("=") : argv[i + 1];
  };
  const flag = (name: string, env: string) => argv.includes(`--${name}`) || process.env[env] === "true";
  return {
    fuente: (value("fuente") ?? process.env.IMPORT_FUENTE ?? "").trim() || undefined,
    todas: flag("todas", "IMPORT_TODAS"),
    forzar: flag("forzar", "IMPORT_FORZAR"),
    max: Number(value("max") ?? process.env.IMPORT_MAX_PAGES) || undefined,
  };
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const opt = args();
  if (!aiAvailable()) throw new Error("Falta GEMINI_API_KEY (o ANTHROPIC_API_KEY): sin IA no se puede extraer.");

  const store = new SupabaseStore();
  const all = await store.sources();
  let selected: Source[];
  if (opt.fuente) {
    selected = all.filter((s) => s.slug === opt.fuente);
    if (!selected.length) throw new Error(`No existe la fuente "${opt.fuente}". Disponibles: ${all.map((s) => s.slug).join(", ")}`);
    if (!CONNECTORS[opt.fuente]) throw new Error(`La fuente "${opt.fuente}" todavía no tiene conector.`);
  } else {
    selected = all.filter((s) => CONNECTORS[s.slug] && (opt.todas ? s.status !== "pausada" : isDue(s)));
  }
  const pending = all.filter((s) => !CONNECTORS[s.slug]).map((s) => s.slug);
  console.log(`Fuentes a ejecutar (${selected.length}): ${selected.map((s) => s.slug).join(", ") || "ninguna"}`);
  if (pending.length) console.log(`Sin conector todavía (${pending.length}): ${pending.join(", ")}`);

  const http = new Http();
  const results: { source: Source; result: RunResult }[] = [];
  const queue = [...selected];
  // Hasta 3 fuentes a la vez: son dominios distintos, y cada dominio mantiene su límite de 1 petición por segundo.
  await Promise.all(
    Array.from({ length: Math.min(3, queue.length) }, async () => {
      for (let source = queue.shift(); source; source = queue.shift()) {
        const slug = source.slug;
        console.log(`\n▶ ${source.name}`);
        const result = await runSource(source, {
          store,
          connector: CONNECTORS[slug],
          extract,
          force: opt.forzar,
          maxPages: opt.max,
          ctx: { source, http, newPage, log: (m) => console.log(`[${slug}]${m}`) },
        }).catch((e): RunResult => ({
          status: "error", found: 0, created: 0, updated: 0, expired: 0,
          errors: [{ message: e instanceof Error ? e.message : String(e) }],
        }));
        results.push({ source, result });
        console.log(`[${slug}] ${result.status}: ${result.found} encontradas, ${result.created} nuevas, ${result.updated} actualizadas, ${result.expired} expiradas, ${result.errors.length} errores`);
      }
    }),
  );
  await closeBrowser();

  const cost = (usage.inputTokens * PRICE_IN + usage.outputTokens * PRICE_OUT) / 1_000_000;
  const lines = [
    "## Importador de Youth Match",
    "",
    "| Fuente | Estado | Encontradas | Nuevas | Actualizadas | Expiradas | Errores |",
    "|---|---|---|---|---|---|---|",
    ...results.map(({ source, result: r }) => `| ${source.name} | ${r.status} | ${r.found} | ${r.created} | ${r.updated} | ${r.expired} | ${r.errors.length} |`),
    "",
    `IA: ${usage.calls} llamadas (${usage.provider || "sin uso"}), ${usage.inputTokens} tokens de entrada y ${usage.outputTokens} de salida. Costo estimado: US$ ${cost.toFixed(3)}.`,
    `Peticiones web: ${http.requests}.`,
    ...results.filter(({ result }) => result.errors.length).flatMap(({ source, result }) => [
      "",
      `**Errores en ${source.name}:**`,
      ...result.errors.slice(0, 8).map((e) => `- ${e.url ? `${e.url}: ` : ""}${e.message}`),
    ]),
  ];
  console.log(`\n${lines.join("\n")}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);

  // El workflow solo se marca como fallido si TODAS las fuentes fallaron.
  if (results.length && results.every(({ result }) => result.status === "error")) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error(`El importador se detuvo: ${e instanceof Error ? e.message : e}`);
  await closeBrowser();
  process.exitCode = 1;
});
