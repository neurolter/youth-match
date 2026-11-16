// Fundación Carolina: más de 200 programas, cada uno en /programas/<id>.
// El listado ya dice qué programas tienen el plazo cerrado, así que solo se
// visitan los abiertos (la convocatoria suele abrir entre enero y abril).
import * as cheerio from "cheerio";
import { absolute, extractContent } from "../content";
import type { Connector, ListItem } from "../types";

export function parseCarolinaList(html: string, baseUrl: string): ListItem[] {
  const $ = cheerio.load(html);
  const items: ListItem[] = [];
  $(".row-programa").each((_, row) => {
    const badge = $(row).find(".badge").text();
    if (/cerrad/i.test(badge)) return; // "Plazo Cerrado"
    const href = $(row).find('a[href*="/programas/"]').attr("href");
    const url = href && absolute(href, baseUrl);
    const id = url && /\/programas\/(\d+)/.exec(url)?.[1];
    if (!url || !id) return;
    items.push({
      url,
      externalId: id,
      title: $(row).find(".prog-desc").text().replace(/\s+/g, " ").trim(),
      hint: { entidad: $(row).find(".prog-ent").text().replace(/\s+/g, " ").trim() },
    });
  });
  return items;
}

export const carolina: Connector = {
  complete: true,
  async list(ctx) {
    return parseCarolinaList(await ctx.http.text(ctx.source.url), ctx.source.url);
  },
  async detail(item, ctx) {
    const content = extractContent(await ctx.http.text(item.url), item.url, [".contenido", "#content", "main", "body"]);
    const entidad = typeof item.hint?.entidad === "string" ? item.hint.entidad : "";
    return {
      url: item.url,
      externalId: item.externalId!,
      text: `${item.title ?? ""}\n${content.text}`,
      links: content.links,
      timezone: "Europe/Madrid",
      facts: {
        application_url: item.url,
        organization: entidad ? `Fundación Carolina y ${entidad}` : "Fundación Carolina",
        destination_countries: ["ES"],
      },
    };
  },
};
