// One Young World: becas para asistir a la cumbre anual. /scholarships enlaza
// a una página por beca (/scholarship/<slug>), con el formulario en apply.oneyoungworld.com.
import * as cheerio from "cheerio";
import { absolute, extractContent } from "../content";
import type { Connector, ListItem } from "../types";

export function parseOywList(html: string, baseUrl: string): ListItem[] {
  const $ = cheerio.load(html);
  const items = new Map<string, ListItem>();
  $('a[href*="/scholarship/"]').each((_, a) => {
    const url = absolute($(a).attr("href") ?? "", baseUrl);
    const slug = url && /\/scholarship\/([^/?#]+)/.exec(url)?.[1];
    const title = $(a).text().replace(/\s+/g, " ").trim();
    // La misma beca se publica también en francés: se conserva una sola versión.
    if (!url || !slug || /-fr$/.test(slug) || /\(FR\)/.test(title) || items.has(url)) return;
    items.set(url, { url, externalId: slug, title });
  });
  return [...items.values()];
}

export const oneYoungWorld: Connector = {
  complete: true,
  async list(ctx) {
    const url = new URL("/scholarships", ctx.source.url).toString();
    return parseOywList(await ctx.http.text(url), url);
  },
  async detail(item, ctx) {
    const content = extractContent(await ctx.http.text(item.url), item.url, ["main", "article", "#main-content"]);
    return {
      url: item.url,
      externalId: item.externalId!,
      text: content.text,
      links: content.links,
      timezone: "Europe/London",
      facts: { organization: "One Young World" },
    };
  },
};
