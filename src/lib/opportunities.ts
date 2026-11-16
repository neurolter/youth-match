import type { Opportunity, Profile } from "@/lib/supabase/types";
import {
  EDUCATION_LEVELS,
  OPPORTUNITY_TYPES,
  REGIONS,
  countryName,
  type EducationLevel,
  type OpportunityType,
} from "@/lib/constants";

const TZ = "America/Guayaquil";

/** Fecha de hoy en Ecuador como YYYY-MM-DD */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Días que faltan hasta la fecha límite (null si no hay). */
export function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const today = new Date(todayISO() + "T00:00:00Z").getTime();
  const end = new Date(deadline + "T00:00:00Z").getTime();
  return Math.round((end - today) / 86_400_000);
}

export function formatDate(
  date: string | null,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
) {
  if (!date) return null;
  return new Intl.DateTimeFormat("es-EC", { ...opts, timeZone: "UTC" }).format(
    new Date(date + "T00:00:00Z"),
  );
}

export function deadlineLabel(
  o: Pick<Opportunity, "deadline" | "rolling_deadline">,
) {
  if (o.rolling_deadline)
    return { text: "Convocatoria abierta todo el año", tone: "green" as const };
  const d = daysLeft(o.deadline);
  if (d === null)
    return { text: "Fecha límite por confirmar", tone: "slate" as const };
  if (d < 0) return { text: "Cerrada", tone: "slate" as const };
  if (d === 0) return { text: "¡Cierra hoy!", tone: "red" as const };
  if (d === 1) return { text: "Cierra mañana", tone: "red" as const };
  if (d <= 7) return { text: `Cierra en ${d} días`, tone: "red" as const };
  if (d <= 30) return { text: `Cierra en ${d} días`, tone: "amber" as const };
  return {
    text: `Hasta el ${formatDate(o.deadline, { day: "numeric", month: "short", year: "numeric" })}`,
    tone: "slate" as const,
  };
}

export function typeLabel(type: string) {
  return OPPORTUNITY_TYPES[type as OpportunityType] ?? OPPORTUNITY_TYPES.otro;
}

export function regionLabel(region: string | null) {
  return region ? (REGIONS[region as keyof typeof REGIONS] ?? region) : null;
}

/** Columnas necesarias para las tarjetas (evita traer descripciones largas). */
export const CARD_COLUMNS =
  "id, slug, title, organization, type, summary, region, destination_countries, modality, funding, deadline, rolling_deadline, is_premium, image_url, min_age, max_age, eligible_nationalities, education_levels, languages, areas, trust_score, published_at" as const;

export type OpportunityCardData = Pick<
  Opportunity,
  | "id"
  | "slug"
  | "title"
  | "organization"
  | "type"
  | "summary"
  | "region"
  | "destination_countries"
  | "modality"
  | "funding"
  | "deadline"
  | "rolling_deadline"
  | "is_premium"
  | "image_url"
  | "min_age"
  | "max_age"
  | "eligible_nationalities"
  | "education_levels"
  | "languages"
  | "areas"
  | "trust_score"
  | "published_at"
>;

// ---------------------------------------------------------------------------
// Recomendaciones "Para ti"
// ---------------------------------------------------------------------------
export type Match = {
  opportunity: OpportunityCardData;
  score: number;
  reasons: string[];
};

// Cómo se dice "lo que buscas" para cada tipo
const LOOKING_FOR: Record<string, string> = {
  beca: "Buscas becas",
  intercambio: "Buscas intercambios",
  congreso: "Buscas congresos",
  voluntariado: "Buscas voluntariados",
  pasantia: "Buscas pasantías",
  competencia: "Buscas competencias",
  liderazgo: "Buscas programas de liderazgo",
  curso: "Buscas cursos",
  fellowship: "Buscas fellowships",
  campamento: "Buscas campamentos",
};

export function matchOpportunities(
  profile: Profile,
  list: OpportunityCardData[],
): Match[] {
  const age = profile.birth_year
    ? new Date().getFullYear() - profile.birth_year
    : null;
  const results: Match[] = [];

  for (const o of list) {
    // Razones en orden de importancia: [peso, texto]
    const why: [number, string][] = [];
    let score = 0;

    // Filtros duros: si no cumple, no se recomienda
    if (
      age !== null &&
      ((o.min_age && age < o.min_age) || (o.max_age && age > o.max_age))
    )
      continue;
    if (
      o.eligible_nationalities.length &&
      profile.nationality &&
      !o.eligible_nationalities.includes(profile.nationality)
    )
      continue;
    if (
      o.education_levels.length &&
      profile.education_level &&
      !o.education_levels.includes(profile.education_level)
    )
      continue;
    if (profile.only_funded && !["total", "parcial"].includes(o.funding))
      continue;

    if (
      o.eligible_nationalities.length &&
      profile.nationality &&
      o.eligible_nationalities.includes(profile.nationality)
    ) {
      score += 10;
      why.push([5, `Es para jóvenes de ${countryName(profile.nationality)}`]);
    }
    if (profile.opportunity_types.includes(o.type)) {
      score += 30;
      why.push([4, LOOKING_FOR[o.type] ?? typeLabel(o.type).label]);
    }
    const sharedAreas = o.areas.filter((a) => profile.interests.includes(a));
    if (sharedAreas.length) {
      score += Math.min(20, sharedAreas.length * 10);
      why.push([
        3,
        `Te interesa ${sharedAreas[0].charAt(0).toLowerCase()}${sharedAreas[0].slice(1)}`,
      ]);
    }
    if (
      o.education_levels.length &&
      profile.education_level &&
      o.education_levels.includes(profile.education_level)
    ) {
      why.push([
        2,
        `Para tu nivel: ${EDUCATION_LEVELS[profile.education_level as EducationLevel]?.toLowerCase() ?? profile.education_level}`,
      ]);
    }
    if (o.region && profile.regions.includes(o.region)) {
      score += 15;
      why.push([
        2,
        o.region === "online"
          ? "Prefieres opciones en línea"
          : `Quieres ir a ${regionLabel(o.region)}`,
      ]);
    } else if (o.region === "global" || o.region === "online") {
      score += 5;
    }
    if (age !== null && (o.min_age || o.max_age))
      why.push([1, "Cumples la edad"]);
    if (
      o.languages.length &&
      profile.languages.length &&
      !o.languages.some((l) => profile.languages.includes(l))
    ) {
      score -= 20;
    }
    if (o.funding === "total") {
      score += 10;
      why.push([1, "100 % financiada"]);
    } else if (o.funding === "parcial") {
      score += 4;
    }
    // Los microvoluntariados en línea solo suben si la persona busca voluntariados
    if (o.type === "voluntariado" && o.modality === "virtual" && !profile.opportunity_types.includes("voluntariado")) score -= 15;
    const d = daysLeft(o.deadline);
    if (d !== null && d >= 0 && d <= 21) score += 5;
    score += Math.round((o.trust_score - 50) / 10);

    const reasons = why.sort((a, b) => b[0] - a[0]).map(([, text]) => text);
    results.push({ opportunity: o, score, reasons: reasons.slice(0, 3) });
  }

  return results.sort((a, b) => b.score - a.score);
}

/** ¿Puede postular alguien de esta nacionalidad? (null = no sabemos su nacionalidad) */
export function eligibleFor(
  o: Pick<OpportunityCardData, "eligible_nationalities">,
  nationality: string | null | undefined,
) {
  if (!o.eligible_nationalities.length) return true;
  if (!nationality) return null;
  return o.eligible_nationalities.includes(nationality);
}

/** Voluntariados en línea (microtareas): se agrupan aparte en Descubrir. */
export const isOnlineVolunteering = (
  o: Pick<OpportunityCardData, "type" | "modality">,
) => o.type === "voluntariado" && o.modality === "virtual";

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
