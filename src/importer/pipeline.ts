// Recorrido completo de UNA fuente: listar → visitar cada detalle → IA (solo si
// la página es nueva o cambió) → deduplicar → guardar → expirar → registrar la ejecución.
import { FAILED_RUNS_TO_FLAG, MAX_PAGES_PER_RUN, MISSED_RUNS_TO_EXPIRE } from "./config";
import { RobotsDisallowed } from "./http";
import { canonicalUrl, sha256, slugify, titleKey, today as todayEc } from "./normalize";
import { buildRecord, type Built } from "./record";
import type { Extraction } from "./schema";
import type { Opp, PageRow, RunResult, Store } from "./store";
import type { Connector, Ctx, ListItem, Page, Source } from "./types";

export type Deps = {
  store: Store;
  ctx: Ctx;
  connector: Connector;
  extract(page: Page, source: Source, today: string): Promise<Extraction>;
  /** Volver a pasar por la IA aunque la página no haya cambiado. */
  force?: boolean;
  maxPages?: number;
  today?: string;
};

/** Resultados que significan "esta página ya se procesó con éxito". */
const SETTLED = new Set(["creada", "actualizada", "duplicada", "descartada", "cerrada", "rechazada"]);

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 400);

export const pageHash = (p: Page) => sha256(JSON.stringify([p.text, p.facts ?? null, p.closed ?? false]));

async function uniqueSlug(store: Store, title: string, organization: string): Promise<string> {
  const base = slugify(title.length < 25 ? `${title} ${organization}` : title);
  if (!(await store.slugTaken(base))) return base;
  for (let n = 2; n < 50; n++) {
    const candidate = `${base.slice(0, 76)}-${n}`;
    if (!(await store.slugTaken(candidate))) return candidate;
  }
  return `${base.slice(0, 66)}-${Date.now().toString(36)}`;
}

/** Campos cuyo cambio cuenta como "actualizada" (p. ej. una fecha extendida). */
const TRACKED = [
  "title", "organization", "type", "summary", "destination_countries", "region", "modality", "funding", "cost_note",
  "min_age", "max_age", "eligible_nationalities", "education_levels", "languages", "areas", "benefits", "requirements",
  "deadline", "rolling_deadline", "start_date", "end_date", "application_url", "canonical_url",
] as const;

type Outcome = "creada" | "actualizada" | "sin_cambios" | "duplicada" | "rechazada" | "cerrada";

/** Guarda una oportunidad: la crea, la actualiza o la une a un registro que ya existía. */
export async function upsertOpportunity(
  store: Store,
  source: Source,
  built: Built,
  known: Opp | null,
  /** Otras URL con las que pudo guardarse antes el mismo registro (p. ej. la URL sin normalizar). */
  extraUrls: string[] = [],
): Promise<{ id: string | null; outcome: Outcome }> {
  const f = built.fields;
  const existing =
    known ??
    (await store.findOpportunity({
      fingerprint: f.fingerprint,
      urls: [f.canonical_url, f.application_url ?? "", ...extraUrls].filter(Boolean),
      sourceId: source.id,
      externalId: f.external_id,
      titleKey: titleKey(f.title, f.organization),
    }));
  const now = new Date().toISOString();

  if (!existing) {
    if (built.closed) return { id: null, outcome: "cerrada" };
    const id = await store.insertOpportunity({
      ...f,
      slug: await uniqueSlug(store, f.title, f.organization),
      status: built.status,
      published_at: built.status === "publicada" ? now : null,
    });
    return { id, outcome: "creada" };
  }

  // Lo que el administrador rechazó no se vuelve a tocar.
  if (existing.status === "rechazada") return { id: existing.id, outcome: "rechazada" };

  if (built.closed) {
    if (existing.status === "publicada" || existing.status === "revision") {
      await store.updateOpportunity(existing.id, { status: "expirada", last_seen_at: now });
    }
    return { id: existing.id, outcome: "cerrada" };
  }

  // El mismo registro visto desde otra fuente: gana la fuente más confiable (tier menor).
  const otherSource = existing.source_id !== source.id;
  if (otherSource && source.tier >= (existing.source_tier ?? 3)) {
    await store.updateOpportunity(existing.id, { last_seen_at: now });
    return { id: existing.id, outcome: "duplicada" };
  }

  const changed = otherSource || TRACKED.some((k) => JSON.stringify(existing[k]) !== JSON.stringify(f[k]));
  // Una publicada sigue publicada; una en revisión o expirada se vuelve a evaluar.
  const status = existing.status === "publicada" || existing.status === "borrador" ? existing.status : built.status;
  await store.updateOpportunity(existing.id, {
    ...f,
    status,
    published_at: status === "publicada" ? (existing.published_at ?? now) : existing.published_at,
    last_seen_at: now,
  });
  return { id: existing.id, outcome: changed || status !== existing.status ? "actualizada" : "sin_cambios" };
}

export async function runSource(source: Source, deps: Deps): Promise<RunResult> {
  const { store, ctx, connector } = deps;
  const today = deps.today ?? todayEc();
  const runId = await store.startRun(source.id);
  const result: RunResult = { status: "ok", found: 0, created: 0, updated: 0, expired: 0, errors: [] };

  try {
    // 1. Listar
    const seenUrls = new Set<string>();
    const items: ListItem[] = [];
    for (const item of await connector.list(ctx)) {
      const key = canonicalUrl(item.url);
      if (seenUrls.has(key)) continue;
      seenUrls.add(key);
      items.push({ ...item, url: item.url.trim() });
    }
    result.found = items.length;

    const known = new Map<string, PageRow>((await store.pages(source.id)).map((p) => [canonicalUrl(p.url), p]));
    const pageOf = (item: ListItem) => known.get(canonicalUrl(item.url));

    // 2. Presentes y ausentes en el listado
    const present = items.map(pageOf).filter((p): p is PageRow => !!p);
    await store.setMissed(present.filter((p) => p.missed_runs > 0).map((p) => p.id), 0);
    await store.touchOpportunities(present.map((p) => p.opportunity_id).filter((id): id is string => !!id));

    if (connector.complete !== false && items.length > 0) {
      const absent = [...known.entries()].filter(([url]) => !seenUrls.has(url)).map(([, p]) => p);
      const byCount = new Map<number, string[]>();
      for (const p of absent) {
        const n = p.missed_runs + 1;
        byCount.set(n, [...(byCount.get(n) ?? []), p.id]);
        // 3 ejecuciones seguidas sin aparecer → expirada
        if (n === MISSED_RUNS_TO_EXPIRE && p.opportunity_id) {
          const opp = await store.opportunity(p.opportunity_id);
          if (opp?.status === "publicada" && opp.source_id === source.id) {
            await store.updateOpportunity(opp.id, { status: "expirada" });
            result.expired++;
          }
        }
      }
      for (const [n, ids] of byCount) await store.setMissed(ids, n);
    }

    // 3. Visitar detalles: primero las páginas nuevas, luego las que llevan más tiempo sin revisarse
    const limit = deps.maxPages ?? connector.maxPages ?? MAX_PAGES_PER_RUN;
    const queue = [...items].sort((a, b) => {
      const pa = pageOf(a), pb = pageOf(b);
      if (!pa || !pb) return Number(!!pa) - Number(!!pb);
      return pa.last_seen_at.localeCompare(pb.last_seen_at);
    });

    for (const item of queue.slice(0, limit)) {
      const prev = pageOf(item);
      try {
        const page = await connector.detail(item, ctx);
        if (!page) {
          await store.savePage({ source_id: source.id, url: item.url, external_id: item.externalId ?? null, content_hash: null, opportunity_id: prev?.opportunity_id ?? null, last_result: "descartada" });
          continue;
        }
        const hash = pageHash(page);
        const row = { source_id: source.id, url: item.url, external_id: page.externalId, content_hash: hash };
        const current = prev?.opportunity_id ? await store.opportunity(prev.opportunity_id) : null;

        // La fuente dice que cerró: no hace falta la IA.
        if (page.closed) {
          if (current && (current.status === "publicada" || current.status === "revision") && current.source_id === source.id) {
            await store.updateOpportunity(current.id, { status: "expirada" });
            result.expired++;
          }
          await store.savePage({ ...row, opportunity_id: prev?.opportunity_id ?? null, last_result: "cerrada" });
          continue;
        }

        // Ahorro: si la página no cambió desde la última vez, no se llama a la IA.
        if (!deps.force && prev && prev.content_hash === hash && SETTLED.has(prev.last_result ?? "")) {
          await store.savePage({ ...row, opportunity_id: prev.opportunity_id, last_result: prev.last_result });
          continue;
        }

        // Ahorro: la misma publicación ya la procesó otra fuente (p. ej. el feed de
        // conferencias y el feed general de Opportunities Corners). No se paga la IA dos veces.
        if (!deps.force) {
          const other = await store.pageElsewhere(item.url, hash, source.id);
          if (other && SETTLED.has(other.last_result ?? "")) {
            await store.savePage({ ...row, opportunity_id: null, last_result: "duplicada" });
            continue;
          }
        }

        const ex = await deps.extract(page, source, today);
        if (!ex.is_opportunity) {
          await store.savePage({ ...row, opportunity_id: prev?.opportunity_id ?? null, last_result: "descartada" });
          continue;
        }

        // Elegir el link y comprobar que responde antes de calcular la confianza.
        const draft = buildRecord({ page, ex, source, today, linkOk: null });
        const app = draft.fields.application_url;
        const linkOk = !app ? null : canonicalUrl(app) === canonicalUrl(page.url) ? true : await ctx.http.linkOk(app);
        const built = buildRecord({ page, ex, source, today, linkOk });

        const { id, outcome } = await upsertOpportunity(store, source, built, current, source.tier === 3 ? [] : [page.url]);
        if (outcome === "creada") result.created++;
        if (outcome === "actualizada") result.updated++;
        if (outcome === "cerrada" && current && current.status === "publicada") result.expired++;
        await store.savePage({ ...row, opportunity_id: id, last_result: outcome === "sin_cambios" ? "actualizada" : outcome });
        ctx.log(`  ${outcome}: ${built.fields.title}`);
      } catch (e) {
        result.errors.push({ url: item.url, message: errorMessage(e) });
        ctx.log(`  error en ${item.url}: ${errorMessage(e)}`);
      }
    }

    const processed = Math.min(queue.length, limit);
    result.status = result.errors.length === 0 ? "ok" : result.errors.length >= processed ? "error" : "parcial";
  } catch (e) {
    result.status = "error";
    result.errors.push({
      message: e instanceof RobotsDisallowed ? `Fuente omitida: ${e.message}` : errorMessage(e),
    });
    ctx.log(`  la fuente falló: ${errorMessage(e)}`);
  }

  await store.finishRun(runId, result);

  // 3 fallos seguidos → con_errores. Si vuelve a funcionar, se reactiva sola.
  const recent = await store.lastRunStatuses(source.id, FAILED_RUNS_TO_FLAG);
  const failing = recent.length >= FAILED_RUNS_TO_FLAG && recent.every((s) => s === "error");
  const status = failing ? "con_errores" : source.status === "con_errores" && result.status !== "error" ? "activa" : undefined;
  await store.updateSource(source.id, { last_run_at: new Date().toISOString(), ...(status ? { status } : {}) });
  return result;
}
