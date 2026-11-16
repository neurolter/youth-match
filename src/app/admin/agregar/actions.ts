"use server";

// "Agregar por enlace": el admin pega el link de una convocatoria que vio él
// mismo, la IA llena los campos y él revisa antes de guardar. Sirve también
// para fuentes que bloquean el acceso automático: en ese caso se pega el texto.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { aiAvailable, extract } from "@/importer/ai";
import { EDUCATION, FUNDING, LANGS, MODALITIES, REGIONS, TYPES } from "@/importer/config";
import { extractContent } from "@/importer/content";
import { documentText } from "@/importer/documents";
import { Http, RobotsDisallowed } from "@/importer/http";
import { canonicalUrl, fingerprint, slugify, today } from "@/importer/normalize";
import { buildRecord } from "@/importer/record";
import type { Page, Source } from "@/importer/types";
import type { Draft } from "./types";

export type AnalyzeState =
  | { status: "idle" }
  | { status: "error"; message: string; askText?: boolean }
  | { status: "ok"; draft: Draft; notes: string | null; closed: boolean; aiTitleWarning?: string };

const MANUAL_SLUG = "carga-manual";

async function manualSource(): Promise<Source> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sources")
    .select("id, slug, name, url, kind, tier, language, frequency_hours, auto_publish, status, last_run_at")
    .eq("slug", MANUAL_SLUG)
    .maybeSingle();
  if (!data) throw new Error("Falta la fuente 'carga-manual' en la base de datos.");
  return data as Source;
}

const ASK_TEXT =
  "No pudimos leer esa página automáticamente (el sitio lo bloquea o tarda demasiado). Ábrela en tu navegador, copia todo el texto de la convocatoria y pégalo en el cuadro de abajo.";

export async function analyzeLink(_: AnalyzeState, fd: FormData): Promise<AnalyzeState> {
  await requireAdmin();
  if (!aiAvailable()) {
    return { status: "error", message: "Falta configurar GEMINI_API_KEY en Vercel (Settings → Environment Variables)." };
  }

  const url = String(fd.get("url") ?? "").trim();
  const pasted = String(fd.get("texto") ?? "").trim();
  if (!/^https?:\/\/\S+$/i.test(url)) return { status: "error", message: "Pega un enlace válido (debe empezar con https://)." };

  let page: Page;
  if (pasted.length >= 200) {
    page = { url, externalId: url, text: pasted.slice(0, 20000), links: [{ text: "Página de la convocatoria", url }] };
  } else {
    const http = new Http();
    try {
      let text: string;
      let links = [{ text: "Página de la convocatoria", url }];
      if (/\.pdf($|\?)/i.test(url)) {
        text = await documentText(http, url, 20000);
      } else {
        const html = await http.text(url, { timeoutMs: 25000, retries: 0 });
        const content = extractContent(html, url);
        text = [content.title, content.text].filter(Boolean).join("\n");
        links = [...links, ...content.links];
      }
      if (text.replace(/\s+/g, " ").length < 200) return { status: "error", message: ASK_TEXT, askText: true };
      page = { url, externalId: url, text: text.slice(0, 20000), links };
    } catch (e) {
      if (e instanceof RobotsDisallowed) {
        return {
          status: "error",
          message: "Este sitio no permite lecturas automáticas. Copia el texto de la convocatoria desde tu navegador y pégalo abajo.",
          askText: true,
        };
      }
      return { status: "error", message: ASK_TEXT, askText: true };
    }
  }

  try {
    const source = await manualSource();
    const day = today();
    const ex = await extract(page, source, day);
    if (!ex.is_opportunity) {
      return {
        status: "error",
        message: "La IA no encontró una convocatoria en ese contenido. Revisa que el enlace sea de una beca, congreso u oportunidad concreta.",
        askText: pasted.length < 200,
      };
    }
    const built = buildRecord({ page, ex, source, today: day, linkOk: null });
    const f = built.fields;
    const draft: Draft = {
      url,
      title: f.title,
      organization: f.organization === "Por confirmar" ? "" : f.organization,
      type: f.type,
      summary: f.summary ?? "",
      application_url: f.application_url ?? url,
      deadline: f.deadline ?? "",
      rolling_deadline: f.rolling_deadline,
      start_date: f.start_date ?? "",
      end_date: f.end_date ?? "",
      region: f.region ?? "",
      modality: f.modality,
      funding: f.funding,
      cost_note: f.cost_note ?? "",
      destination_countries: f.destination_countries,
      eligible_nationalities: f.eligible_nationalities,
      min_age: f.min_age,
      max_age: f.max_age,
      education_levels: f.education_levels,
      languages: f.languages,
      areas: f.areas,
      benefits: f.benefits,
      requirements: f.requirements,
      trust_score: f.trust_score,
    };
    // En la carga manual no aplica la nota "falta link" del importador.
    return { status: "ok", draft, notes: f.review_notes, closed: built.closed };
  } catch (e) {
    console.error("analyzeLink", e);
    return { status: "error", message: "La IA no pudo analizar el contenido. Inténtalo de nuevo en un momento." };
  }
}

// ---------------------------------------------------------------------------
// Guardar
// ---------------------------------------------------------------------------
export type SaveState = { status: "idle" } | { status: "error"; message: string } | { status: "ok"; slug: string; published: boolean };

const inList = <T extends string>(v: unknown, list: readonly T[]): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;
const isoDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const codes = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.map((c) => String(c).toUpperCase().trim()).filter((c) => /^[A-Z]{2}$/.test(c)))] : [];
const strList = (v: unknown, max = 10) =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).map((x) => x.slice(0, 240)).slice(0, max) : [];
const age = (v: unknown) => {
  const n = Number(v);
  return v === null || v === "" || !Number.isFinite(n) || n < 0 || n > 120 ? null : Math.round(n);
};

export async function saveOpportunity(_: SaveState, fd: FormData): Promise<SaveState> {
  await requireAdmin();
  let d: Draft;
  try {
    d = JSON.parse(String(fd.get("draft") ?? "{}")) as Draft;
  } catch {
    return { status: "error", message: "Datos inválidos." };
  }
  const publish = fd.get("accion") === "publicar";

  const title = String(d.title ?? "").trim().slice(0, 220);
  const organization = String(d.organization ?? "").trim().slice(0, 220);
  const type = inList(d.type, TYPES);
  const applicationUrl = String(d.application_url ?? "").trim();
  const deadline = isoDate(d.deadline);
  const rolling = Boolean(d.rolling_deadline);

  if (title.length < 3) return { status: "error", message: "Falta el título." };
  if (!organization) return { status: "error", message: "Falta la organización." };
  if (!type) return { status: "error", message: "Elige el tipo de oportunidad." };
  if (!/^https?:\/\/\S+$/i.test(applicationUrl)) return { status: "error", message: "El link de postulación debe empezar con https://" };
  if (publish && !deadline && !rolling) {
    return { status: "error", message: "Para publicar, pon la fecha límite o marca «Convocatoria abierta todo el año»." };
  }

  const supabase = await createClient();
  const source = await manualSource();
  const canonical = canonicalUrl(String(d.url || applicationUrl));
  const fp = fingerprint(canonical, title, organization);

  // ¿Ya existe?
  const { data: dup } = await supabase
    .from("opportunities")
    .select("slug, title")
    .or(`fingerprint.eq.${fp},canonical_url.eq.${canonical}`)
    .limit(1)
    .maybeSingle();
  if (dup) return { status: "error", message: `Ya existe: «${dup.title}» (/oportunidad/${dup.slug}).` };

  // Slug único
  const base = slugify(title) || "oportunidad";
  const { data: taken } = await supabase.from("opportunities").select("slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((r) => r.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;

  const modality = inList(d.modality, MODALITIES) ?? "presencial";
  const region = inList(d.region, REGIONS) ?? (modality === "virtual" ? "online" : null);
  const now = new Date().toISOString();

  const { error } = await supabase.from("opportunities").insert({
    slug,
    source_id: source.id,
    external_id: canonical,
    canonical_url: canonical,
    fingerprint: fp,
    title,
    organization,
    type,
    summary: String(d.summary ?? "").trim().slice(0, 450) || null,
    destination_countries: modality === "virtual" ? [] : codes(d.destination_countries),
    region,
    modality,
    funding: inList(d.funding, FUNDING) ?? "desconocido",
    cost_note: String(d.cost_note ?? "").trim().slice(0, 300) || null,
    min_age: age(d.min_age),
    max_age: age(d.max_age),
    eligible_nationalities: codes(d.eligible_nationalities),
    education_levels: strList(d.education_levels).filter((x) => (EDUCATION as readonly string[]).includes(x)),
    languages: strList(d.languages).filter((x) => (LANGS as readonly string[]).includes(x)),
    areas: strList(d.areas, 5),
    benefits: strList(d.benefits, 8),
    requirements: strList(d.requirements, 8),
    deadline: rolling ? null : deadline,
    rolling_deadline: rolling,
    start_date: isoDate(d.start_date),
    end_date: isoDate(d.end_date),
    application_url: applicationUrl,
    status: publish ? "publicada" : "revision",
    published_at: publish ? now : null,
    trust_score: Math.max(0, Math.min(100, Number(d.trust_score) || 70)),
    review_notes: "Agregada manualmente por el admin desde un enlace.",
    last_seen_at: now,
  });
  if (error) {
    console.error("saveOpportunity", error);
    return { status: "error", message: "No se pudo guardar. Inténtalo de nuevo." };
  }

  revalidatePath("/admin");
  revalidatePath("/descubrir");
  return { status: "ok", slug, published: publish };
}
