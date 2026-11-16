// Forma exacta del JSON que debe devolver la IA, validada con zod.
// Coincide con las columnas y valores permitidos de la tabla `opportunities`.
import { z } from "zod";
import { AREAS, EDUCATION, FUNDING, LANGS, MODALITIES, REGIONS, TYPES } from "./config";

const iso2 = z.string().regex(/^[A-Z]{2}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const url = z.string().regex(/^https?:\/\/\S+$/i);

export const ExtractionSchema = z.object({
  is_opportunity: z.boolean(),
  is_open: z.boolean().nullable(),
  title: z.string().max(220),
  organization: z.string().max(220).nullable(),
  type: z.enum(TYPES),
  summary: z.string().max(450).nullable(),
  destination_countries: z.array(iso2).max(80),
  region: z.enum(REGIONS).nullable(),
  modality: z.enum(MODALITIES).nullable(),
  funding: z.enum(FUNDING),
  cost_note: z.string().max(300).nullable(),
  min_age: z.number().int().min(0).max(120).nullable(),
  max_age: z.number().int().min(0).max(120).nullable(),
  eligible_nationalities: z.array(iso2).max(250),
  education_levels: z.array(z.enum(EDUCATION)),
  languages: z.array(z.enum(LANGS)),
  areas: z.array(z.string()).max(5),
  benefits: z.array(z.string().max(240)).max(8),
  requirements: z.array(z.string().max(240)).max(8),
  deadline: date.nullable(),
  rolling_deadline: z.boolean(),
  start_date: date.nullable(),
  end_date: date.nullable(),
  application_url: url.nullable(),
  official_url: url.nullable(),
  scam_signals: z.array(z.string().max(160)).max(6),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
const int = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
const isoDate = (v: unknown): string | null => {
  const s = str(v);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : s;
};
const httpUrl = (v: unknown): string | null => {
  const s = str(v);
  return s && /^https?:\/\/\S+$/i.test(s) ? s : null;
};
const codes = (v: unknown) =>
  [...new Set(arr(v).map((c) => String(c).toUpperCase().trim()).filter((c) => /^[A-Z]{2}$/.test(c)))];
const lines = (v: unknown, max: number) =>
  arr(v).map((x) => str(x)).filter((x): x is string => !!x).map((x) => x.slice(0, 240)).slice(0, max);

/**
 * Limpia la respuesta cruda de la IA antes de validarla: descarta valores fuera
 * de las listas permitidas en lugar de rechazar todo el registro. Lo que no se
 * puede interpretar queda vacío (nunca se inventa).
 */
export function sanitizeExtraction(raw: unknown): Extraction {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const clean = {
    is_opportunity: r.is_opportunity !== false,
    is_open: typeof r.is_open === "boolean" ? r.is_open : null,
    title: (str(r.title) ?? "").slice(0, 220),
    organization: str(r.organization)?.slice(0, 220) ?? null,
    type: pick(r.type, TYPES) ?? "otro",
    summary: str(r.summary)?.slice(0, 450) ?? null,
    destination_countries: codes(r.destination_countries).slice(0, 80),
    region: pick(r.region, REGIONS),
    modality: pick(r.modality, MODALITIES),
    funding: pick(r.funding, FUNDING) ?? "desconocido",
    cost_note: str(r.cost_note)?.slice(0, 300) ?? null,
    min_age: int(r.min_age),
    max_age: int(r.max_age),
    eligible_nationalities: codes(r.eligible_nationalities),
    education_levels: arr(r.education_levels).map((x) => pick(x, EDUCATION)).filter((x) => x !== null),
    languages: arr(r.languages).map((x) => pick(x, LANGS)).filter((x) => x !== null),
    areas: arr(r.areas).filter((x): x is string => typeof x === "string" && AREAS.includes(x)).slice(0, 5),
    benefits: lines(r.benefits, 8),
    requirements: lines(r.requirements, 8),
    deadline: isoDate(r.deadline),
    rolling_deadline: r.rolling_deadline === true,
    start_date: isoDate(r.start_date),
    end_date: isoDate(r.end_date),
    application_url: httpUrl(r.application_url),
    official_url: httpUrl(r.official_url),
    scam_signals: lines(r.scam_signals, 6).map((x) => x.slice(0, 160)),
  };
  return ExtractionSchema.parse(clean);
}
