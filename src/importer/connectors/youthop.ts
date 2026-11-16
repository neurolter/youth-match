// YouthOp – Conferencias (agregador). Cada conferencia tiene su página en
// /conferences/<slug>/; de ahí se sigue el enlace a la organización oficial.
import * as cheerio from "cheerio";
import { absolute } from "../content";
import type { Connector, ListItem } from "../types";
import { aggregatorPage } from "./rss";

export function parseYouthopList(html: string, baseUrl: string, section = "conferences"): ListItem[] {
  const $ = cheerio.load(html);
  const pattern = new RegExp(`youthop\\.com/${section}/([^/?#]+)/?$`);
  const items = new Map<string, ListItem>();
  $("a[href]").each((_, a) => {
    const url = absolute($(a).attr("href") ?? "", baseUrl);
    const slug = url && pattern.exec(url)?.[1];
    if (!url || !slug || /^(page|feed|category|tag)$/.test(slug)) return;
    const title = $(a).text().replace(/\s+/g, " ").trim();
    const prev = items.get(url);
    if (!prev || title.length > (prev.title?.length ?? 0)) items.set(url, { url, externalId: slug, title });
  });
  return [...items.values()];
}

export const youthopConferences: Connector = {
  complete: false,
  async list(ctx) {
    return parseYouthopList(await ctx.http.text(ctx.source.url, { timeoutMs: 60000 }), ctx.source.url);
  },
  async detail(item, ctx) {
    return aggregatorPage(await ctx.http.text(item.url, { timeoutMs: 60000 }), item, ctx);
  },
};
