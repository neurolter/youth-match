// SENESCYT / Globo Común (Ecuador). Sitio WordPress: /convocatorias/ y los
// índices de tercer y cuarto nivel enlazan a una página por convocatoria, con
// "POSTULA HASTA: <fecha>" y las bases en PDF (o en un ZIP con PDF dentro).
import * as cheerio from "cheerio";
import { absolute, extractContent } from "../content";
import { documentText } from "../documents";
import { hostOf, parseSpanishDate, today } from "../normalize";
import type { Connector, ListItem } from "../types";

const INDEXES = ["/convocatorias/", "/becas-cuarto-nivel/", "/becas-tercer-nivel/"];
const NOT_A_CALL = /\/(convocatorias|becas-cuarto-nivel|becas-tercer-nivel|becas\/servicios-becas)\/?$/;

export function parseSenescytIndex(html: string, baseUrl: string): ListItem[] {
  const $ = cheerio.load(html);
  const items = new Map<string, ListItem>();
  $("main .w-grid-list a[href], main article.w-grid-item a[href]").each((_, a) => {
    const url = absolute($(a).attr("href") ?? "", baseUrl);
    if (!url || hostOf(url) !== hostOf(baseUrl) || NOT_A_CALL.test(url) || /\/wp-content\//.test(url)) return;
    const title = $(a).text().replace(/\s+/g, " ").trim();
    const prev = items.get(url);
    if (!prev || (!prev.title && title)) {
      items.set(url, { url, externalId: new URL(url).pathname.replace(/^\/|\/$/g, ""), title: title || prev?.title });
    }
  });
  return [...items.values()];
}

/** Lee la fecha de "POSTULA HASTA: ..." solo cuando hay una única fecha clara. */
export function senescytDeadline(text: string): string | null {
  const m = /POSTULA HASTA:\s*([\s\S]{0,160}?)\s*Pa[ií]s:/i.exec(text);
  if (!m) return null;
  const dates = m[1].match(/\d{1,2}\s*(?:de\s+)?[a-záéíóú]+\s*,?\s*(?:de\s+)?\d{4}/gi) ?? [];
  return dates.length === 1 ? parseSpanishDate(dates[0]) : null;
}

export const senescyt: Connector = {
  complete: true,
  async list(ctx) {
    const origin = new URL(ctx.source.url).origin;
    const all = new Map<string, ListItem>();
    for (const path of INDEXES) {
      try {
        for (const it of parseSenescytIndex(await ctx.http.text(origin + path), origin + path)) all.set(it.url, it);
      } catch (e) {
        ctx.log(`  índice no disponible (${path}): ${e instanceof Error ? e.message : e}`);
      }
    }
    if (!all.size) throw new Error("No se pudo leer ningún índice de convocatorias de SENESCYT");
    return [...all.values()];
  },
  async detail(item, ctx) {
    const content = extractContent(await ctx.http.text(item.url), item.url, ["main"]);
    const deadline = senescytDeadline(content.text);
    const page = {
      url: item.url,
      externalId: item.externalId!,
      text: content.text,
      links: content.links,
      timezone: "America/Guayaquil",
      facts: deadline ? { deadline } : {},
      closed: !!deadline && deadline < today(),
    };
    if (page.closed) return page; // ya venció: no vale la pena descargar las bases

    // Las bases (PDF o ZIP) traen beneficios y requisitos que no están en la página.
    const bases = content.links.find((l) => /bases/i.test(l.text) && /\.(pdf|zip)(\?|$)/i.test(l.url)) ??
      content.links.find((l) => /\/wp-content\/uploads\/.+\.(pdf|zip)(\?|$)/i.test(l.url));
    if (bases) {
      const text = await documentText(ctx.http, bases.url, 9000);
      if (text) page.text += `\n\nBASES DE LA CONVOCATORIA:\n${text}`;
    }
    return page;
  },
};
