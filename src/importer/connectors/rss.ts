// Conector genérico para agregadores con RSS (Opportunity Desk, Opportunities
// Corners, Scholarships Corner, OYAOP...). El feed es el "radar": de cada
// publicación se sigue el enlace hasta la fuente oficial.
import { XMLParser } from "fast-xml-parser";
import { extractContent } from "../content";
import { hostOf } from "../normalize";
import type { Connector, Ctx, Link, ListItem, Page } from "../types";

type FeedItem = { title: string; link: string; guid: string; pubDate: string | null; categories: string[]; html: string | null };

const str = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : v && typeof v === "object" && "#text" in v ? String((v as { "#text": unknown })["#text"]) : "";

export function parseFeed(xml: string): FeedItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, processEntities: true, htmlEntities: true, trimValues: true });
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: unknown } }; feed?: { entry?: unknown } };
  const raw = doc.rss?.channel?.item ?? [];
  const items = (Array.isArray(raw) ? raw : [raw]) as Record<string, unknown>[];
  return items
    .map((it) => {
      const cats = it.category === undefined ? [] : Array.isArray(it.category) ? it.category : [it.category];
      const html = str(it["content:encoded"]);
      return {
        title: str(it.title).replace(/\s+/g, " ").trim(),
        link: str(it.link).trim(),
        guid: str(it.guid).trim(),
        pubDate: str(it.pubDate) || null,
        categories: cats.map(str),
        html: html.length > 800 ? html : null,
      };
    })
    .filter((it) => /^https?:\/\//.test(it.link));
}

/** Formularios y plataformas de inscripción: son un link válido, pero no hay texto útil que leer. */
const FORM_HOSTS = /(^|\.)(forms\.gle|airtable\.com|qualtrics\.com|cognitoforms\.com|typeform\.com|jotform\.com|surveymonkey\.com|eventbrite\.[a-z.]+|smartrecruiters\.com)$|^docs\.google\.com$|^forms\.(office|cloud\.microsoft)\.com$/i;
const APPLY_TEXT = /apply|application|official|click here|visit|more info|website|register|postul|inscr|sitio oficial/i;

/** De los enlaces de una publicación, el que más probablemente lleva a la fuente oficial. */
export function pickOfficial(links: Link[], ownHosts: string[]): Link | null {
  const external = links.filter((l) => !ownHosts.includes(hostOf(l.url)));
  if (!external.length) return null;
  const labelled = external.filter((l) => APPLY_TEXT.test(l.text));
  // "Official Link" manda sobre "Apply Now"; si no hay etiquetas claras, el último enlace externo.
  return labelled.find((l) => /official|website|sitio oficial|more info|visit/i.test(l.text)) ?? labelled[labelled.length - 1] ?? external[external.length - 1];
}

/** Construye la página de una publicación de agregador y sigue el enlace a la fuente oficial. */
export async function aggregatorPage(html: string, item: ListItem, ctx: Ctx, selectors?: string[]): Promise<Page | null> {
  const content = extractContent(html, item.url, selectors);
  const own = [hostOf(item.url), hostOf(ctx.source.url)];
  const links = content.links.filter((l) => !own.includes(hostOf(l.url)));
  const text = content.text.replace(/\n?The post .{0,300} appeared first on[\s\S]*$/i, "").trim();
  if (text.length < 200) return null;

  const page: Page = {
    url: item.url,
    externalId: item.externalId ?? item.url,
    text: `${item.title ?? content.title ?? ""}\n${text}`,
    links,
  };

  const official = pickOfficial(links, own);
  if (official) {
    page.officialUrl = official.url;
    if (!FORM_HOSTS.test(hostOf(official.url))) {
      try {
        // Solo se lee la fuente oficial si su robots.txt lo permite.
        const officialHtml = await ctx.http.text(official.url, { timeoutMs: 20000, retries: 0 });
        page.officialText = extractContent(officialHtml, official.url).text.slice(0, 8000);
      } catch {
        // La fuente oficial no se pudo leer: se sigue solo con el texto del agregador.
      }
    }
  }
  return page;
}

/** URL de la página N de un feed de WordPress (`?paged=N`). */
export function feedPage(feedUrl: string, n: number): string {
  if (n <= 1) return feedUrl;
  const u = new URL(feedUrl);
  u.searchParams.set("paged", String(n));
  return u.toString();
}

export function rssConnector(opts: { feedUrl?: string; selectors?: string[]; maxItems?: number; pages?: number } = {}): Connector {
  return {
    complete: false, // un RSS solo trae lo último: salir del feed no significa que cerró
    async list(ctx) {
      // Con importación semanal, la primera página del feed (≈10 publicaciones) no
      // alcanza a cubrir 7 días en los agregadores más activos: se leen hasta 3
      // páginas. Lo ya visto no vuelve a pasar por la IA, así que no sube el costo.
      const feedUrl = opts.feedUrl ?? ctx.source.url;
      const seen = new Set<string>();
      const all: ReturnType<typeof parseFeed> = [];
      for (let n = 1; n <= (opts.pages ?? 3); n++) {
        let items: ReturnType<typeof parseFeed>;
        try {
          items = parseFeed(await ctx.http.text(feedPage(feedUrl, n)));
        } catch (e) {
          if (n === 1) throw e; // sin la primera página no hay nada
          break; // el sitio no tiene más páginas (o no admite ?paged)
        }
        const fresh = items.filter((it) => !seen.has(it.link));
        if (!fresh.length) break;
        fresh.forEach((it) => seen.add(it.link));
        all.push(...fresh);
      }
      return all
        .slice(0, opts.maxItems ?? 40)
        .map((it) => ({ url: it.link, externalId: it.guid || it.link, title: it.title, inlineHtml: it.html ?? undefined }));
    },
    async detail(item, ctx) {
      if (item.inlineHtml) return aggregatorPage(`<body><article>${item.inlineHtml}</article></body>`, item, ctx, ["article"]);
      return aggregatorPage(await ctx.http.text(item.url), item, ctx, opts.selectors);
    },
  };
}
