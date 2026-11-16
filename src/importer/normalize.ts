// Normalización: slugs legibles, URL canónica, huellas para deduplicar y hashes.
import { createHash } from "node:crypto";

export const md5 = (s: string) => createHash("md5").update(s).digest("hex");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function plain(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(s: string, max = 80): string {
  const slug = plain(s).replace(/ /g, "-").slice(0, max).replace(/-+$/, "");
  return slug || "oportunidad";
}

const TRACKING = /^(utm_\w+|fbclid|gclid|mc_cid|mc_eid|ref|source|igshid|_hsenc|_hsmi)$/i;

/** URL sin rastreadores ni ancla, con host en minúsculas y sin barra final. */
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    const keep = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort();
    u.search = "";
    for (const [k, v] of keep) u.searchParams.append(k, v);
    let out = u.toString();
    if (out.endsWith("/")) out = out.slice(0, -1);
    return out;
  } catch {
    return raw.trim();
  }
}

export const hostOf = (raw: string): string => {
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Parte de la huella que identifica "mismo título + mismo organizador". */
export const titleKey = (title: string, organization: string | null) =>
  md5(`${plain(title)}|${plain(organization ?? "")}`).slice(0, 16);

/** fingerprint = hash(URL canónica) + hash(título y organizador). */
export const fingerprint = (canonical: string, title: string, organization: string | null) =>
  `${md5(canonical).slice(0, 16)}-${titleKey(title, organization)}`;

/** Texto visible de un HTML, sin scripts ni estilos (para el hash y para la IA). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Fecha de hoy (YYYY-MM-DD) en Ecuador, el mercado inicial. */
export function today(tz = "America/Guayaquil"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

/** Convierte un instante ISO a la fecha local (YYYY-MM-DD) de una zona horaria. */
export function dateInZone(iso: string, tz: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "08 de enero, 2027" → "2027-01-08". Devuelve null si no hay día, mes y año claros. */
export function parseSpanishDate(s: string): string | null {
  const m = /(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)\s*(?:de|del|,)?\s*(\d{4})/i.exec(s);
  if (!m) return null;
  const month = MONTHS.indexOf(plain(m[2]).replace("setiembre", "septiembre"));
  const day = Number(m[1]);
  if (month < 0 || day < 1 || day > 31) return null;
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
