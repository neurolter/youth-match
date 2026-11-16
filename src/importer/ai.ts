// Extracción con IA: Gemini (principal) y Claude (alternativa si hay ANTHROPIC_API_KEY).
// La respuesta es JSON y SIEMPRE se valida con zod antes de usarla.
import { ANTHROPIC_MODEL, AREAS, EDUCATION, FUNDING, GEMINI_MODEL, LANGS, MODALITIES, REGIONS, TYPES } from "./config";
import { clip } from "./content";
import { sanitizeExtraction, type Extraction } from "./schema";
import type { Page, Source } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AiUsage = { calls: number; inputTokens: number; outputTokens: number; provider: string };
export const usage: AiUsage = { calls: 0, inputTokens: 0, outputTokens: 0, provider: "" };

const list = (xs: readonly string[]) => xs.map((x) => `"${x}"`).join(", ");

const SYSTEM = `Eres el asistente de datos de Youth Match, una plataforma en español de oportunidades internacionales para jóvenes de Latinoamérica.
Recibirás el texto de UNA página web (y a veces sus bases en PDF o el texto de la fuente oficial). Devuelve SOLO un objeto JSON con estos campos:

- is_opportunity (boolean): true solo si la página describe UNA convocatoria concreta a la que una persona puede postular. false si es una lista de varias oportunidades, una noticia, resultados o una página general.
- is_open (boolean o null): false si la convocatoria ya cerró; null si no se sabe.
- title (string): título en español, corto y claro. Conserva los nombres propios en su idioma original (programa, universidad). Sin "Fully Funded", sin emojis.
- organization (string o null): quién ofrece la oportunidad (no el sitio que la difunde).
- type: uno de ${list(TYPES)}.
- summary (string): máximo 2 frases en español, con tus propias palabras, que digan qué es y para quién.
- destination_countries (array de códigos ISO-2 en mayúsculas): países donde se realiza. Vacío si es virtual o no se indica.
- region: uno de ${list(REGIONS)} o null. Usa "online" si es virtual.
- modality: uno de ${list(MODALITIES)} o null.
- funding: uno de ${list(FUNDING)}. "total" solo si cubre los costos principales (matrícula o participación, y viaje y estadía cuando es presencial). "parcial" si cubre una parte. "sin_financiamiento" si el participante paga todo. "desconocido" si no se dice.
- cost_note (string o null): cuotas o costos que paga el participante, si los hay.
- min_age, max_age (enteros o null): solo si la convocatoria pone límites de edad.
- eligible_nationalities (array ISO-2): llénalo SOLO si la convocatoria se restringe a ciertas nacionalidades o países de residencia. Vacío = abierta a todas.
- education_levels (array): valores de ${list(EDUCATION)} a los que va dirigida. Vacío si no se indica.
- languages (array): idiomas requeridos, entre ${list(LANGS)}.
- areas (array, máximo 3): temas, SOLO de esta lista exacta: ${list(AREAS)}.
- benefits (array, máximo 6): lo que recibe el participante, en frases cortas en español. Sé CONCRETO: incluye montos, porcentajes y qué cubre exactamente cuando el texto lo diga (ej.: "Matrícula completa", "Estipendio de 1.200 € al mes", "Pasaje de ida y vuelta", "Cubre el 50 % de la matrícula"). Si el financiamiento es parcial, di qué parte cubre y qué no.
- requirements (array, máximo 8): requisitos principales en frases cortas en español: nacionalidad o residencia, edad, nivel de estudios, promedio, idioma (con el examen o nivel si se indica), experiencia y documentos clave.
- deadline (YYYY-MM-DD o null): fecha límite de postulación, en la zona horaria de la fuente. Si hay varias, la de la fase de postulación vigente.
- rolling_deadline (boolean): true solo si la convocatoria dice que está siempre abierta o que es permanente.
- start_date, end_date (YYYY-MM-DD o null): fechas del programa, no de la postulación.
- application_url (string o null): el enlace para postular a ESTA oportunidad. Debe ser EXACTAMENTE uno de los enlaces de la lista "ENLACES". Nunca la página principal de un sitio.
- official_url (string o null): la página oficial del organizador sobre ESTA oportunidad, tomada de la lista "ENLACES".
- scam_signals (array): señales de posible estafa que veas (cobros por postular poco claros, promesas irreales, organizador imposible de identificar, pedir dinero por adelantado). Vacío si no hay.

Reglas:
1. NUNCA inventes datos. Si algo no está en el texto, usa null, un array vacío o "desconocido".
2. Escribe en español neutro y con tus propias palabras: no copies frases completas de la fuente.
3. Las fechas van en formato YYYY-MM-DD. Si falta el día exacto, usa null.
4. Responde solo con el JSON, sin explicaciones.`;

export function buildPrompt(page: Page, source: Source, today: string): string {
  const links = page.links.slice(0, 40).map((l) => `- ${l.text || "(sin texto)"} → ${l.url}`).join("\n");
  const parts = [
    `FECHA DE HOY: ${today}`,
    `FUENTE: ${source.name} (${source.tier === 3 ? "agregador: difunde oportunidades de terceros" : "fuente oficial"})`,
    `ZONA HORARIA DE LA FUENTE: ${page.timezone ?? "no indicada"}`,
    `URL DE LA PÁGINA: ${page.url}`,
    page.facts && Object.keys(page.facts).length
      ? `DATOS CONFIRMADOS POR LA FUENTE (no los contradigas): ${JSON.stringify(page.facts)}`
      : "",
    `ENLACES:\n${links || "(ninguno)"}`,
    `TEXTO DE LA PÁGINA:\n${clip(page.text, 14000)}`,
    page.officialText ? `TEXTO DE LA FUENTE OFICIAL (${page.officialUrl}):\n${clip(page.officialText, 6000)}` : "",
  ];
  return parts.filter(Boolean).join("\n\n");
}

function parseJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("La IA no devolvió JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Llama a `fn` reintentando con espera creciente si la API responde 429 o 5xx. */
async function withRetry(fn: () => Promise<Response>, label: string): Promise<Response> {
  let wait = 5000;
  for (let attempt = 1; ; attempt++) {
    const res = await fn();
    if (res.ok) return res;
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= 5) {
      const body = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`${label} respondió ${res.status}: ${body}`);
    }
    const header = Number(res.headers.get("retry-after"));
    await sleep(Math.min(header > 0 ? header * 1000 : wait, 90000));
    wait *= 2;
  }
}

async function gemini(prompt: string, key: string): Promise<string> {
  // Si el modelo configurado dejara de existir, se usa el alias oficial "último Flash".
  const models = [...new Set([GEMINI_MODEL, "gemini-flash-latest"])];
  let last: unknown;
  for (const model of models) {
    try {
      const res = await withRetry(
        () =>
          fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            // La clave va en una cabecera, nunca en la URL (para que no aparezca en logs).
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 4096 },
            }),
            signal: AbortSignal.timeout(90000),
          }),
        `Gemini (${model})`,
      );
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
      };
      usage.inputTokens += data.usageMetadata?.promptTokenCount ?? 0;
      usage.outputTokens += (data.usageMetadata?.candidatesTokenCount ?? 0) + (data.usageMetadata?.thoughtsTokenCount ?? 0);
      usage.provider = `gemini:${model}`;
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text) throw new Error("Gemini devolvió una respuesta vacía");
      return text;
    } catch (e) {
      last = e;
      if (!(e instanceof Error) || !/respondió 404/.test(e.message)) throw e;
    }
  }
  throw last;
}

async function claude(prompt: string, key: string): Promise<string> {
  const res = await withRetry(
    () =>
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 4096,
          system: SYSTEM,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(90000),
      }),
    "Claude",
  );
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  usage.inputTokens += data.usage?.input_tokens ?? 0;
  usage.outputTokens += data.usage?.output_tokens ?? 0;
  usage.provider = `claude:${ANTHROPIC_MODEL}`;
  return data.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") ?? "";
}

export const aiAvailable = () => Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

/** Convierte una página en datos estructurados. Lanza un error si la IA falla o el JSON no es válido. */
export async function extract(page: Page, source: Source, today: string): Promise<Extraction> {
  const prompt = buildPrompt(page, source, today);
  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !claudeKey) throw new Error("Falta GEMINI_API_KEY (o ANTHROPIC_API_KEY)");

  usage.calls++;
  let raw: string;
  try {
    raw = geminiKey ? await gemini(prompt, geminiKey) : await claude(prompt, claudeKey!);
  } catch (e) {
    if (!geminiKey || !claudeKey) throw e;
    raw = await claude(prompt, claudeKey); // Gemini falló: se intenta con Claude.
  }
  return sanitizeExtraction(parseJson(raw));
}
