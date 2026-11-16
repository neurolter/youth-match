// Becas OEA. La página /es/becas/ enlaza a las convocatorias vigentes, que casi
// siempre son un PDF (programa PAEC y socios). Cada PDF es una oportunidad.
import * as cheerio from "cheerio";
import { absolute } from "../content";
import { documentText } from "../documents";
import type { Connector, ListItem } from "../types";

const CALL = /\/PAEC\/(\d{4})\/[^/]+\.pdf$|convocatoria[^/]*\.pdf$|announcement[^/]*\.pdf$/i;
const NOT_A_CALL = /result|seleccionad|selected|listado|ganador|winner|manual|becarios|PAEC%20ESP|ASP%20ESP/i;

export function parseOeaList(html: string, baseUrl: string, year = new Date().getFullYear()): ListItem[] {
  const $ = cheerio.load(html);
  const items = new Map<string, ListItem>();
  $("a[href]").each((_, a) => {
    const url = absolute($(a).attr("href") ?? "", baseUrl)?.replace(/^http:/, "https:");
    if (!url) return;
    const m = CALL.exec(decodeURIComponent(url));
    if (!m || NOT_A_CALL.test(url)) return;
    if (m[1] && Number(m[1]) < year) return; // convocatorias de años anteriores
    const title = $(a).text().replace(/\s+/g, " ").trim();
    const prev = items.get(url);
    if (!prev || title.length > (prev.title?.length ?? 0)) {
      items.set(url, { url, externalId: decodeURIComponent(url.split("/").pop()!).replace(/\.pdf$/i, ""), title });
    }
  });
  return [...items.values()];
}

export const oea: Connector = {
  complete: true,
  async list(ctx) {
    return parseOeaList(await ctx.http.text(ctx.source.url), ctx.source.url);
  },
  async detail(item, ctx) {
    const text = await documentText(ctx.http, item.url, 14000);
    return {
      url: item.url,
      externalId: item.externalId!,
      // Si el PDF no se puede leer, la IA solo ve el título y la oportunidad irá a revisión.
      text: `Convocatoria publicada en la página de Becas de la OEA: ${item.title ?? ""}\n${text}`,
      links: [{ text: "Convocatoria (PDF)", url: item.url }],
      timezone: "America/New_York",
      facts: { application_url: item.url },
    };
  },
};
