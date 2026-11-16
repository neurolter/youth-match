// Configuración del importador. Este código corre con `tsx` (npm run importar),
// fuera de Next.js: no importes nada de `next/*` ni de src/lib/supabase/server.ts.
import { INTERESTS } from "../lib/constants";

export const USER_AGENT =
  "YouthMatchBot/1.0 (+https://youth-matchdos.vercel.app; importador de oportunidades para jóvenes)";

export const TYPES = [
  "beca", "intercambio", "congreso", "voluntariado", "pasantia", "competencia",
  "liderazgo", "curso", "fellowship", "campamento", "otro",
] as const;
export const REGIONS = [
  "global", "latinoamerica", "norteamerica", "europa", "asia", "africa",
  "oceania", "medio_oriente", "online",
] as const;
export const MODALITIES = ["presencial", "virtual", "hibrida"] as const;
export const FUNDING = ["total", "parcial", "sin_financiamiento", "desconocido"] as const;
export const EDUCATION = ["secundaria", "pregrado", "graduado", "posgrado", "profesional"] as const;
export const LANGS = ["es", "en", "pt", "fr", "de", "it", "zh", "ja", "ru"] as const;
export const AREAS: readonly string[] = INTERESTS;

/** Tope de páginas de detalle que se procesan por fuente en cada ejecución. */
export const MAX_PAGES_PER_RUN = Number(process.env.IMPORT_MAX_PAGES ?? 40);
/** Milisegundos mínimos entre dos peticiones al mismo dominio (1 por segundo). */
export const MIN_DELAY_MS = 1100;
/** Ejecuciones seguidas sin aparecer en la fuente antes de marcar como expirada. */
export const MISSED_RUNS_TO_EXPIRE = 3;
/** Ejecuciones fallidas seguidas antes de poner la fuente en `con_errores`. */
export const FAILED_RUNS_TO_FLAG = 3;

// Modelo Flash estable más reciente según https://ai.google.dev/gemini-api/docs/models
// (verificado en noviembre de 2026). Se puede cambiar con la variable GEMINI_MODEL.
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5";

/** Dominios acortadores de enlaces: señal de poca transparencia. */
export const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "cutt.ly", "rb.gy", "goo.gl", "ow.ly", "is.gd",
  "shorturl.at", "rebrand.ly", "lnkd.in", "opd.to", "tiny.cc", "buff.ly",
];
