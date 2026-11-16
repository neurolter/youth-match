// Becas Santander (Santander Open Academy).
// Listado: sitemaps públicos (uno por tipo de programa). Detalle: la misma API
// pública en JSON que usa su página; si falla, se abre la página con el
// navegador headless. Cada programa vive en /es/program/<slug>.
import { extractContent } from "../content";
import { dateInZone, htmlToText } from "../normalize";
import type { Connector, Ctx, Facts, ListItem, Page } from "../types";

const SITE = "https://app.santanderopenacademy.com";
const SITEMAPS = [`${SITE}/sitemaps/soa-courses-es.xml`, `${SITE}/sitemaps/soa-grants-es.xml`];
const API = "https://api-manager.universia.net/becas-core-applicants/api/programs";

export type Program = {
  slug?: string;
  name?: string;
  promoter?: string;
  status?: string;
  pub_status?: string;
  mode?: string;
  timeZone?: string;
  allOriginCountries?: boolean;
  countriesOfOrigin?: string[];
  benefits?: Record<string, unknown>;
  duration?: string;
  total_scholarships?: number;
  marketingTitle?: string;
  summary?: string;
  description?: string;
  requirements?: string;
  additionalInfo?: string;
  stages?: { value?: number; startDate?: string; endDate?: string }[];
  legalDocuments?: { title?: string; preview?: string }[];
  faqs?: { question?: string; description?: string }[];
};

export function parseSitemap(xml: string): ListItem[] {
  const items: ListItem[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+\/es\/program\/([^<\s/]+))\s*<\/loc>/g)) {
    items.push({ url: m[1], externalId: decodeURIComponent(m[2]) });
  }
  return items;
}

const MODES: Record<string, Facts["modality"]> = { faceToFace: "presencial", online: "virtual", blended: "hibrida", hybrid: "hibrida" };
const BENEFITS: Record<string, string> = {
  accomodation: "alojamiento",
  tuition: "matrícula",
  travel: "viaje",
  courses: "cursos",
  subsistenceAllowance: "ayuda de manutención",
  helpResearch: "ayuda a la investigación",
};

/** Convierte la respuesta de la API en una página lista para la IA. */
export function programToPage(p: Program, url: string, now = new Date()): Page {
  const tz = p.timeZone || "Europe/Madrid";
  // La postulación es la primera fase. Su fin llega como medianoche del día siguiente, por eso se resta 1 segundo.
  const stage = p.stages?.find((s) => s.value === 1) ?? p.stages?.[0];
  const end = stage?.endDate ? new Date(new Date(stage.endDate).getTime() - 1000) : null;
  const deadline = end ? dateInZone(end.toISOString(), tz) : null;

  const benefits = Object.entries(BENEFITS).filter(([k]) => p.benefits?.[k] === true).map(([, label]) => label);
  const faqs = (p.faqs ?? []).slice(0, 8).map((f) => `P: ${f.question ?? ""}\nR: ${htmlToText(f.description ?? "")}`);
  const text = [
    p.name,
    p.promoter ? `Ofrecido por: ${p.promoter}` : "",
    p.marketingTitle,
    htmlToText(p.summary ?? ""),
    htmlToText(p.description ?? ""),
    htmlToText(p.requirements ?? ""),
    htmlToText(p.additionalInfo ?? ""),
    p.duration ? `Duración: ${p.duration}` : "",
    p.total_scholarships ? `Plazas: ${p.total_scholarships}` : "",
    benefits.length ? `La fuente marca que incluye: ${benefits.join(", ")}.` : "",
    ...faqs,
  ].filter(Boolean).join("\n");

  const facts: Facts = { application_url: url };
  if (p.name) facts.title = p.name;
  if (p.promoter) facts.organization = p.promoter;
  if (p.mode && MODES[p.mode]) facts.modality = MODES[p.mode];
  if (deadline) facts.deadline = deadline;
  if (p.allOriginCountries === false && p.countriesOfOrigin?.length) {
    facts.eligible_nationalities = p.countriesOfOrigin.filter((c) => /^[A-Z]{2}$/.test(c));
  }

  return {
    url,
    externalId: p.slug ?? url,
    text,
    links: (p.legalDocuments ?? []).filter((d) => d.preview).map((d) => ({ text: d.title ?? "Bases", url: d.preview! })),
    facts,
    timezone: tz,
    closed: p.status !== "open" || (p.pub_status !== undefined && p.pub_status !== "published") || (!!end && end < now),
  };
}

/** Plan B: abrir la página con el navegador y leer lo que ve una persona. */
async function headless(item: ListItem, ctx: Ctx): Promise<Page | null> {
  const page = await ctx.newPage();
  try {
    await ctx.http.throttle(new URL(item.url).hostname);
    await page.goto(item.url, { waitUntil: "networkidle", timeout: 45000 });
    const html = await page.content();
    if (/\/es\/404/.test(html.slice(0, 2000))) return null;
    const ld = /"@type":"EducationalOccupationalProgram"[^<]*/.exec(html)?.[0] ?? "";
    const end = /"applicationEndDate":"([^"]+)"/.exec(ld)?.[1];
    const content = extractContent(html, item.url, ["main"]);
    const closed = /convocatoria (cerrada|finalizada)|plazo (cerrado|finalizado)/i.test(content.text) || (!!end && new Date(end) < new Date());
    return {
      url: item.url,
      externalId: item.externalId ?? item.url,
      text: content.text,
      links: content.links,
      facts: { application_url: item.url, ...(end ? { deadline: dateInZone(new Date(new Date(end).getTime() - 1000).toISOString(), "Europe/Madrid") } : {}) },
      timezone: "Europe/Madrid",
      closed,
    };
  } finally {
    await page.close();
  }
}

export const santander: Connector = {
  complete: true,
  maxPages: 250, // la API responde rápido y las convocatorias cerradas no gastan IA
  async list(ctx) {
    const items: ListItem[] = [];
    for (const url of SITEMAPS) {
      try {
        items.push(...parseSitemap(await ctx.http.text(url)));
      } catch (e) {
        ctx.log(`  sitemap no disponible (${url}): ${e instanceof Error ? e.message : e}`);
      }
    }
    if (!items.length) throw new Error("No se pudo leer ningún sitemap de Santander Open Academy");
    return items;
  },
  async detail(item, ctx) {
    try {
      const res = await ctx.http.json<{ data?: Program }>(`${API}/${encodeURIComponent(item.externalId!)}?locale=es`);
      if (res.data?.name) return programToPage(res.data, item.url);
    } catch (e) {
      ctx.log(`  API de Santander falló para ${item.externalId}; se usa el navegador (${e instanceof Error ? e.message : e})`);
    }
    return headless(item, ctx);
  },
};
