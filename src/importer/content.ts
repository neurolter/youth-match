// Utilidades para sacar el contenido útil de una página: texto limpio y enlaces.
import * as cheerio from "cheerio";
import { htmlToText } from "./normalize";
import type { Link } from "./types";

const JUNK =
  "script,style,noscript,svg,iframe,form,nav,header,footer,aside,ins,figure,img,button," +
  "[class*=share],[class*=related],[class*=sidebar],[class*=comment],[class*=cookie],[id*=cookie],[class*=newsletter]";

/** Selectores habituales del cuerpo de un artículo (WordPress y similares). */
export const ARTICLE_SELECTORS = [
  ".entry-content",
  ".td-post-content",
  ".post-content",
  ".single-content",
  ".post-body",
  "article",
  "main",
  "#content",
];

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(ndash|mdash|hellip|rsquo|lsquo|rdquo|ldquo);/g, (_, n: string) =>
      ({ ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" })[n] ?? "");

export function absolute(href: string, base: string): string | null {
  try {
    const u = new URL(href.trim(), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export type Content = { title: string | null; text: string; links: Link[] };

/**
 * Extrae el texto y los enlaces del bloque principal de un HTML.
 * `selectors`: dónde buscar el contenido, en orden de preferencia.
 */
export function extractContent(html: string, baseUrl: string, selectors: string[] = ARTICLE_SELECTORS): Content {
  const $ = cheerio.load(html);
  const title =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    null;
  $(JUNK).remove();

  const root =
    selectors.map((sel) => $(sel).first()).find((el) => el.length > 0 && el.text().trim().length > 200) ?? $("body").first();

  const seen = new Set<string>();
  const links: Link[] = [];
  root.find("a[href]").each((_, a) => {
    const url = absolute($(a).attr("href") ?? "", baseUrl);
    if (!url || seen.has(url) || /^https?:\/\/((www|m|api|web)\.)?(facebook|twitter|x|whatsapp|telegram|linkedin|instagram|pinterest)\.com\/|^https?:\/\/(t|wa)\.me\//i.test(url)) return;
    seen.add(url);
    links.push({ text: $(a).text().replace(/\s+/g, " ").trim().slice(0, 120), url });
  });

  return { title, text: decode(htmlToText(root.html() ?? "")), links };
}

/** Recorta un texto largo conservando el principio y el final (donde suelen estar fechas y links). */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = Math.floor(max * 0.75);
  return `${text.slice(0, head)}\n[…]\n${text.slice(-(max - head))}`;
}
