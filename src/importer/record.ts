// Convierte (página + extracción de la IA) en un registro de `opportunities`:
// elige el link de postulación, calcula la confianza y decide si se publica.
import { SHORTENERS } from "./config";
import { canonicalUrl, fingerprint, hostOf } from "./normalize";
import type { Extraction } from "./schema";
import type { Page, Source } from "./types";

const REGION_OF: Record<string, string[]> = {
  latinoamerica: "AR BO BR CL CO CR CU DO EC SV GT HN MX NI PA PY PE PR UY VE".split(" "),
  norteamerica: ["US", "CA"],
  europa: "ES PT FR DE IT GB NL BE CH SE NO FI DK IE AT PL HU CZ RU GR RO BG HR SI SK EE LV LT LU MT CY IS UA RS".split(" "),
  asia: "CN JP KR IN SG TW TH VN MY ID PH PK BD LK NP KZ UZ MN HK".split(" "),
  medio_oriente: "AE QA SA IL TR JO LB KW OM BH IR IQ EG".split(" "),
  africa: "ZA KE MA NG GH ET TZ UG RW SN TN DZ CM CI ZM ZW MZ AO BW NA MU".split(" "),
  oceania: ["AU", "NZ", "FJ"],
};

export function regionOf(countries: string[]): string | null {
  const regions = new Set(
    countries.map((c) => Object.keys(REGION_OF).find((r) => REGION_OF[r].includes(c)) ?? "?"),
  );
  if (regions.size === 1 && !regions.has("?")) return [...regions][0];
  return countries.length > 1 ? "global" : null;
}

const isHomepage = (url: string) => {
  try {
    const u = new URL(url);
    return (u.pathname === "/" || u.pathname === "") && !u.search;
  } catch {
    return true;
  }
};
const isShortener = (url: string) => SHORTENERS.includes(hostOf(url));

export type OpportunityFields = {
  source_id: string;
  external_id: string;
  canonical_url: string;
  fingerprint: string;
  title: string;
  organization: string;
  type: string;
  summary: string | null;
  destination_countries: string[];
  region: string | null;
  modality: string;
  funding: string;
  cost_note: string | null;
  min_age: number | null;
  max_age: number | null;
  eligible_nationalities: string[];
  education_levels: string[];
  languages: string[];
  areas: string[];
  benefits: string[];
  requirements: string[];
  deadline: string | null;
  rolling_deadline: boolean;
  start_date: string | null;
  end_date: string | null;
  application_url: string | null;
  trust_score: number;
  review_notes: string | null;
};

export type Built = {
  fields: OpportunityFields;
  /** "publicada" o "revision", según las reglas de publicación. */
  status: "publicada" | "revision";
  /** true si la convocatoria ya cerró (no se crea; si existía, se expira). */
  closed: boolean;
  /** Para agregadores: ¿se encontró y verificó la fuente oficial? */
  officialVerified: boolean;
};

type Input = {
  page: Page;
  ex: Extraction;
  source: Source;
  today: string;
  /** Resultado de comprobar el link de postulación: true, false (roto) o null (no se pudo). */
  linkOk: boolean | null;
};

/** Elige el link de postulación. La IA solo puede proponer enlaces que existan en la página. */
export function pickApplicationUrl(page: Page, ex: Extraction, source: Source): { app: string | null; official: string | null } {
  const inPage = new Set([...page.links.map((l) => canonicalUrl(l.url)), canonicalUrl(page.url)]);
  const valid = (u: string | null | undefined): u is string => !!u && inPage.has(canonicalUrl(u)) && !isHomepage(u);

  if (source.tier !== 3) {
    const app = page.facts?.application_url ?? (valid(ex.application_url) ? ex.application_url : null) ?? page.url;
    return { app, official: page.url };
  }

  // Agregador: el link debe salir del agregador hacia la organización oficial.
  const own = new Set([hostOf(page.url), hostOf(source.url)]);
  const external = (u: string | null | undefined): u is string => valid(u) && !own.has(hostOf(u));
  const official = [ex.official_url, page.officialUrl, ex.application_url].find(external) ?? null;
  const app = [ex.application_url, ex.official_url, page.officialUrl].find(external) ?? null;
  return { app, official };
}

/** Puntaje de confianza de 0 a 100. */
/** Por debajo de este puntaje nada se publica solo: va a revisión. */
export const MIN_TRUST_TO_PUBLISH = 45;

export function trustScore(f: Omit<OpportunityFields, "trust_score" | "review_notes">, source: Source, o: {
  linkOk: boolean | null;
  officialVerified: boolean;
  scamSignals: number;
}): number {
  let score = source.tier === 1 ? 70 : source.tier === 2 ? 55 : 35;

  // Campos completos: hasta +15
  if (f.deadline || f.rolling_deadline) score += 4;
  if (f.funding !== "desconocido") score += 3;
  if (f.summary) score += 2;
  if (f.requirements.length) score += 2;
  if (f.benefits.length) score += 2;
  if (f.destination_countries.length || f.region) score += 2;

  // El link responde: +10. Roto: -15.
  if (o.linkOk === true) score += 10;
  if (o.linkOk === false) score -= 15;

  if (source.tier === 3) {
    // Agregador con fuente oficial verificada: +15. Sin ella, nunca pasa de 30.
    if (o.officialVerified) score += 15;
    else score = Math.min(score, 30);
  }

  if (f.application_url && isShortener(f.application_url)) score -= 10;
  score -= Math.min(o.scamSignals * 20, 45);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function buildRecord({ page, ex, source, today, linkOk }: Input): Built {
  // Los datos estructurados de la fuente mandan sobre lo que interpretó la IA.
  const facts = Object.fromEntries(Object.entries(page.facts ?? {}).filter(([, v]) => v !== null && v !== undefined));
  const m: Extraction = { ...ex, ...facts };

  const { app, official } = pickApplicationUrl(page, m, source);
  const officialVerified = source.tier !== 3 || (!!official && linkOk !== false);
  const canonical = canonicalUrl(source.tier === 3 ? (official ?? app ?? page.url) : page.url);

  const virtual = m.modality === "virtual" || m.region === "online";
  const destination = virtual && m.modality !== "hibrida" ? [] : m.destination_countries;
  const region = virtual ? "online" : (m.region ?? regionOf(destination));
  const modality = m.modality ?? (virtual ? "virtual" : "presencial");

  const title = m.title.trim();
  const organization = m.organization?.trim() || null;

  const signals = [...m.scam_signals];
  if (app && isShortener(app)) signals.push("El link de postulación usa un acortador de enlaces");

  const base = {
    source_id: source.id,
    external_id: page.externalId,
    canonical_url: canonical,
    fingerprint: fingerprint(canonical, title, organization),
    title,
    organization: organization ?? "Por confirmar",
    type: m.type,
    summary: m.summary,
    destination_countries: destination,
    region,
    modality,
    funding: m.funding,
    cost_note: m.cost_note,
    min_age: m.min_age,
    max_age: m.max_age,
    eligible_nationalities: m.eligible_nationalities,
    education_levels: m.education_levels,
    languages: m.languages,
    areas: m.areas,
    benefits: m.benefits,
    requirements: m.requirements,
    deadline: m.deadline,
    rolling_deadline: m.rolling_deadline,
    start_date: m.start_date,
    end_date: m.end_date,
    application_url: app,
  };

  // Datos clave para publicar sola (regla 7).
  const missing: string[] = [];
  if (title.length < 3) missing.push("título");
  if (!organization) missing.push("organización");
  if (!app) missing.push(source.tier === 3 ? "fuente oficial verificable" : "link de postulación");
  if (!m.deadline && !m.rolling_deadline) missing.push("fecha límite");
  if (!m.requirements.length) missing.push("requisitos");
  if (!m.benefits.length) missing.push("beneficios");

  const notes: string[] = [];
  if (missing.length) notes.push(`Falta: ${missing.join(", ")}.`);
  if (linkOk === false) notes.push("El link de postulación no responde.");
  if (linkOk === null && app) notes.push("No se pudo comprobar el link automáticamente.");
  if (m.modality === null && !virtual) notes.push("La fuente no indica la modalidad; se asumió presencial.");
  if (signals.length) notes.push(`Señales de alerta: ${signals.join("; ")}.`);
  if (source.tier === 3) notes.push(`Visto en el agregador: ${page.url}`);

  const trust = trustScore(base, source, { linkOk, officialVerified, scamSignals: signals.length });
  if (trust < MIN_TRUST_TO_PUBLISH) notes.push("Confianza baja: revisa si cobra inscripción antes de publicar.");

  const closed = m.is_open === false || (!m.rolling_deadline && !!m.deadline && m.deadline < today) || page.closed === true;
  const publish = source.auto_publish && !missing.length && linkOk !== false && signals.length === 0 && trust >= MIN_TRUST_TO_PUBLISH;

  return {
    fields: {
      ...base,
      trust_score: trust,
      review_notes: notes.length ? notes.join(" ") : null,
    },
    status: publish ? "publicada" : "revision",
    closed,
    officialVerified,
  };
}
