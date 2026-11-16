// Pruebas de los parsers con páginas reales guardadas en __fixtures__/.
// Si un sitio cambia su estructura, estas pruebas son las primeras en avisar.
import assert from "node:assert/strict";
import { test } from "node:test";
import { extractContent } from "../content";
import { parseCarolinaList } from "../connectors/carolina";
import { parseOeaList } from "../connectors/oea";
import { parseOywList } from "../connectors/one-young-world";
import { aggregatorPage, parseFeed, pickOfficial, rssConnector } from "../connectors/rss";
import { parseSitemap, programToPage, type Program } from "../connectors/santander";
import { parseSenescytIndex, senescytDeadline } from "../connectors/senescyt";
import { unvRelevant, unvToListItem, type UnvItem } from "../connectors/unv";
import { parseYouthopList } from "../connectors/youthop";
import { ctx, fixture, source } from "./helpers";

test("Opportunity Desk: el feed da un elemento por publicación y el detalle lleva a la fuente oficial", async () => {
  const items = parseFeed(fixture("opportunity-desk-feed.xml"));
  assert.equal(items.length, 1);
  assert.equal(items[0].link, "https://opportunitydesk.org/2026/11/16/arab-american-leadership-program-2027/");
  assert.equal(items[0].html, null); // este feed no trae el contenido completo

  const src = source({ slug: "opportunity-desk", tier: 3, url: "https://opportunitydesk.org/feed/" });
  const page = await aggregatorPage(fixture("opportunity-desk-post.html"), { url: items[0].link, title: items[0].title }, ctx(src));
  assert.ok(page);
  assert.match(page.text, /Deadline: December 13, 2026/);
  assert.equal(page.officialUrl, "https://centeraap.org/grants/scholarships/the-arab-american-leadership-program-application/");
  assert.ok(page.links.every((l) => !l.url.includes("opportunitydesk.org")), "no debe quedar ningún enlace interno del agregador");
});

test("Opportunities Corners: contenido en .td-post-content y link oficial al final", async () => {
  const [item] = parseFeed(fixture("opportunities-corners-feed.xml"));
  assert.equal(item.title, "Leadership and Peace Summit Morocco 2027 (Fully Funded)");
  const src = source({ slug: "opportunities-corners", tier: 3, url: "https://opportunitiescorners.com/feed" });
  const page = await aggregatorPage(fixture("opportunities-corners-post.html"), { url: item.link, title: item.title }, ctx(src));
  assert.ok(page);
  assert.match(page.text, /Deadline: 1st December 2026/);
  assert.match(page.officialUrl ?? "", /^https:\/\/www\.eventbrite\.ca\/e\/leadership-and-peace-summit-morocco-2027/);
});

test("Scholarships Corner: el feed ya trae el contenido completo y no hace falta visitar la página", async () => {
  const src = source({ slug: "scholarships-corner", tier: 3, url: "https://scholarshipscorner.website/feed" });
  const c = ctx(src, { "https://scholarshipscorner.website/feed": fixture("scholarships-corner-feed.xml") });
  const connector = rssConnector();
  const [item] = await connector.list(c);
  assert.ok(item.inlineHtml && item.inlineHtml.length > 800);
  const page = await connector.detail(item, c);
  assert.ok(page);
  assert.equal(page.officialUrl, "https://www.governance.ai/post/uk-summer-fellowship-2027-applied-track");
  assert.ok(page.links.some((l) => l.url.startsWith("https://airtable.com/")));
  assert.doesNotMatch(page.text, /appeared first on/);
});

test("pickOfficial prefiere 'Official Link' y nunca un enlace del propio agregador", () => {
  const links = [
    { text: "Otra beca", url: "https://agregador.example/otra" },
    { text: "Apply Now", url: "https://forms.gle/abc" },
    { text: "Official Link", url: "https://universidad.example/beca" },
  ];
  assert.equal(pickOfficial(links, ["agregador.example"])?.url, "https://universidad.example/beca");
  assert.equal(pickOfficial([links[0]], ["agregador.example"]), null);
});

test("Santander: el sitemap lista un programa por URL", () => {
  const items = parseSitemap(fixture("santander-sitemap.xml"));
  assert.equal(items.length, 3);
  assert.equal(items[2].externalId, "innovation-and-ai-experience-in-madrid-2027");
  assert.ok(items.every((i) => i.url.startsWith("https://app.santanderopenacademy.com/es/program/")));
});

test("Santander: la API se convierte en datos fiables (fecha en hora de Madrid, países, modalidad)", () => {
  const { data } = JSON.parse(fixture("santander-program.json")) as { data: Program };
  const url = "https://app.santanderopenacademy.com/es/program/innovation-and-ai-experience-in-madrid-2027";
  const page = programToPage(data, url, new Date("2026-11-16T12:00:00Z"));
  // 2026-12-03T23:00Z es la medianoche del 4 de diciembre en Madrid: el último día para postular es el 3.
  assert.equal(page.facts?.deadline, "2026-12-03");
  assert.equal(page.facts?.organization, "IE University");
  assert.equal(page.facts?.modality, "presencial");
  assert.equal(page.facts?.application_url, url); // el link es el de ESTE programa, no el de la página principal
  assert.deepEqual(page.facts?.eligible_nationalities?.slice(0, 3), ["DE", "AR", "BR"]);
  assert.equal(page.closed, false);
  assert.match(page.text, /alojamiento, matrícula, viaje/);
  assert.equal(programToPage(data, url, new Date("2026-12-10T00:00:00Z")).closed, true);
  assert.equal(programToPage({ ...data, status: "closed" }, url, new Date("2026-11-16T12:00:00Z")).closed, true);
});

test("Fundación Carolina: solo se listan los programas con plazo abierto", () => {
  const items = parseCarolinaList(fixture("carolina-list.html"), "https://gestion.fundacioncarolina.es/programas");
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://gestion.fundacioncarolina.es/programas/6448");
  assert.equal(items[0].externalId, "6448");
});

test("SENESCYT: el índice enlaza cada convocatoria una sola vez y sin páginas de índice", () => {
  const items = parseSenescytIndex(fixture("senescyt-index.html"), "https://siau.senescyt.gob.ec/becas-cuarto-nivel/");
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Becas del Gobierno Chino 2027-2028 4to nivel");
  assert.equal(items[0].externalId, "becas-del-gobierno-chino-2027-2028-4to-nivel");
});

test("SENESCYT: la página de detalle da la fecha de 'POSTULA HASTA' y el enlace a las bases", () => {
  const content = extractContent(fixture("senescyt-detail.html"), "https://siau.senescyt.gob.ec/becas-del-gobierno-chino-2027-2028-4to-nivel/", ["main"]);
  assert.equal(senescytDeadline(content.text), "2027-01-08");
  assert.ok(content.links.some((l) => l.text === "BASES" && l.url.endsWith(".zip")));
  assert.doesNotMatch(content.text, /Av\. Amazonas/); // el pie de página no es parte de la convocatoria
  // Con dos cohortes no se adivina: lo resuelve la IA.
  assert.equal(senescytDeadline("POSTULA HASTA: Primera Cohorte: 19 de junio 2026 Segunda Cohorte: 15 de octubre 2026 País: Italia"), null);
});

test("OEA: solo las convocatorias vigentes en PDF (sin resultados, manuales ni años anteriores)", () => {
  const items = parseOeaList(fixture("oea-becas.html"), "https://www.oas.org/es/becas/", 2026);
  const names = items.map((i) => i.externalId).sort();
  assert.deepEqual(names, ["2026 OEA - AUWCL Convocatoria del Programa de Becas", "2026-2027 OAS - The UDD Scholarship Program Announcement", "Convocatoria_Secihti_OEA2026"]);
  assert.equal(items.find((i) => i.externalId === "Convocatoria_Secihti_OEA2026")?.title, "APOYO COMPLEMENTARIO SECIHTI-OEA");
});

test("One Young World: una beca por enlace, sin la versión duplicada en francés", () => {
  const items = parseOywList(fixture("oyw-scholarships.html"), "https://www.oneyoungworld.com/scholarships");
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://www.oneyoungworld.com/scholarship/generation-regen-challenge-2027-presented-bmo");
});

test("UNV: se descartan las asignaciones nacionales fuera de Latinoamérica", () => {
  const { value } = JSON.parse(fixture("unv-search.json")) as { value: { result: UnvItem[] } };
  assert.equal(unvRelevant(value.result[0]), false); // nacional, R. D. del Congo
  assert.equal(unvRelevant(value.result[1]), true); // sin tipo "nacional"
  assert.equal(unvToListItem(value.result[1])?.url, "https://app.unv.org/opportunities/1784888021274091");
  assert.equal(unvRelevant({ ...value.result[0], country: { props: { codeISO2: "EC" } } }), true);
});

test("YouthOp: solo páginas de conferencias, sin paginación ni otras secciones", () => {
  const items = parseYouthopList(fixture("youthop-conferences.html"), "https://www.youthop.com/conferences");
  assert.deepEqual(items.map((i) => i.externalId), ["conferencia-de-ejemplo-2027"]);
});
