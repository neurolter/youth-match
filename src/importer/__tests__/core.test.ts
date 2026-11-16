// Pruebas de las reglas del importador: robots.txt, normalización, publicación,
// confianza, deduplicación, ahorro de IA y expiración.
import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalUrl, fingerprint, parseSpanishDate, slugify } from "../normalize";
import { pageHash, runSource } from "../pipeline";
import { buildRecord } from "../record";
import { parseRobots } from "../robots";
import { isDue } from "../schedule";
import { sanitizeExtraction, type Extraction } from "../schema";
import type { Connector, ListItem, Page } from "../types";
import { ctx, extraction, source } from "./helpers";
import { MemoryStore } from "./memory-store";

test("robots.txt: reglas, comodines y señal de contenido para IA", () => {
  const r = parseRobots("User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nDisallow: /*?s=\n");
  assert.equal(r.allows("/conferences/"), true);
  assert.equal(r.allows("/wp-admin/options.php"), false);
  assert.equal(r.allows("/wp-admin/admin-ajax.php"), true);
  assert.equal(r.allows("/page/2/?s=beca"), false);
  assert.equal(parseRobots("User-agent: *\nDisallow: /").allows("/cualquier"), false);
  assert.equal(parseRobots("User-agent: YouthMatchBot\nDisallow: /\n\nUser-agent: *\nDisallow:").allows("/x"), false);
  assert.equal(parseRobots("User-agent: *\nContent-Signal: search=yes, ai-input=no\nAllow: /").forbidsAi, true);
  assert.equal(parseRobots("# solo comentarios").allows("/x"), true);
});

test("normalización: slug legible, URL canónica sin rastreadores y huella estable", () => {
  assert.equal(slugify("Becas «María Guzmán» 2026-27 – Alcalá"), "becas-maria-guzman-2026-27-alcala");
  assert.equal(canonicalUrl("https://WWW.Ejemplo.org/beca/?utm_source=x&id=7#apply"), "https://ejemplo.org/beca/?id=7");
  assert.equal(fingerprint("https://a.org/x", "Beca Ñandú", "ONU"), fingerprint("https://a.org/x", "beca nandu", "onu"));
  assert.equal(parseSpanishDate("08 de enero, 2027"), "2027-01-08");
  assert.equal(parseSpanishDate("Marzo, 2027"), null);
});

test("la respuesta de la IA se limpia: lo que no es válido queda vacío, nunca inventado", () => {
  const ex = sanitizeExtraction({ title: "Beca X", type: "premio", region: "marte", funding: "total", destination_countries: ["es", "Francia"], deadline: "2027-02-30", areas: ["Liderazgo", "Astrología"], languages: ["en", "klingon"] });
  assert.equal(ex.type, "otro");
  assert.equal(ex.region, null);
  assert.deepEqual(ex.destination_countries, ["ES"]);
  assert.equal(ex.deadline, null);
  assert.deepEqual(ex.areas, ["Liderazgo"]);
  assert.deepEqual(ex.languages, ["en"]);
});

const page = (over: Partial<Page> = {}): Page => ({ url: "https://fuente.example/beca-1", externalId: "beca-1", text: "Texto de la beca", links: [], ...over });

test("publicación: fuente oficial con datos clave → publicada; si falta la fecha → revisión", () => {
  const src = source();
  const ok = buildRecord({ page: page(), ex: extraction(), source: src, today: "2026-11-16", linkOk: true });
  assert.equal(ok.status, "publicada");
  assert.equal(ok.fields.application_url, "https://fuente.example/beca-1"); // la página de ESA oportunidad
  assert.ok(ok.fields.trust_score >= 85);

  const sinFecha = buildRecord({ page: page(), ex: extraction({ deadline: null }), source: src, today: "2026-11-16", linkOk: true });
  assert.equal(sinFecha.status, "revision");
  assert.match(sinFecha.fields.review_notes ?? "", /fecha límite/);

  const permanente = buildRecord({ page: page(), ex: extraction({ deadline: null, rolling_deadline: true }), source: src, today: "2026-11-16", linkOk: true });
  assert.equal(permanente.status, "publicada");

  const manual = buildRecord({ page: page(), ex: extraction(), source: source({ auto_publish: false }), today: "2026-11-16", linkOk: true });
  assert.equal(manual.status, "revision");
});

test("la IA no puede inventar el link: solo vale un enlace que exista en la página, y nunca la portada", () => {
  const src = source();
  const p = page({ links: [{ text: "Postula", url: "https://fuente.example/postular/beca-1" }, { text: "Inicio", url: "https://fuente.example/" }] });
  const inventado = buildRecord({ page: p, ex: extraction({ application_url: "https://otro.example/formulario" }), source: src, today: "2026-11-16", linkOk: true });
  assert.equal(inventado.fields.application_url, "https://fuente.example/beca-1");
  const portada = buildRecord({ page: p, ex: extraction({ application_url: "https://fuente.example/" }), source: src, today: "2026-11-16", linkOk: true });
  assert.equal(portada.fields.application_url, "https://fuente.example/beca-1");
  const real = buildRecord({ page: p, ex: extraction({ application_url: "https://fuente.example/postular/beca-1" }), source: src, today: "2026-11-16", linkOk: true });
  assert.equal(real.fields.application_url, "https://fuente.example/postular/beca-1");
});

test("agregadores: con fuente oficial se guarda el link oficial; sin ella, revisión con confianza baja", () => {
  const agg = source({ id: "agg", slug: "agregador", tier: 3, auto_publish: false, url: "https://agregador.example/feed" });
  const p = page({ url: "https://agregador.example/beca-x", links: [{ text: "Official Link", url: "https://universidad.example/beca-x" }], officialUrl: "https://universidad.example/beca-x" });
  const con = buildRecord({ page: p, ex: extraction({ official_url: "https://universidad.example/beca-x" }), source: agg, today: "2026-11-16", linkOk: true });
  assert.equal(con.fields.application_url, "https://universidad.example/beca-x");
  assert.equal(con.fields.canonical_url, "https://universidad.example/beca-x");
  assert.equal(con.status, "revision"); // los agregadores siempre pasan por el panel
  assert.ok(con.fields.trust_score > 50);

  const sin = buildRecord({ page: page({ url: "https://agregador.example/beca-y" }), ex: extraction(), source: agg, today: "2026-11-16", linkOk: null });
  assert.equal(sin.fields.application_url, null);
  assert.equal(sin.status, "revision");
  assert.ok(sin.fields.trust_score <= 30);
});

test("señales de estafa y acortadores bajan la confianza e impiden publicar sola", () => {
  const src = source();
  const p = page({ links: [{ text: "Apply", url: "https://bit.ly/abc" }] });
  const r = buildRecord({ page: p, ex: extraction({ application_url: "https://bit.ly/abc", scam_signals: ["Cobro por adelantado poco claro"] }), source: src, today: "2026-11-16", linkOk: true });
  assert.equal(r.status, "revision");
  assert.ok(r.fields.trust_score < 60);
  assert.match(r.fields.review_notes ?? "", /acortador/);
});

test("una convocatoria con fecha vencida se marca como cerrada", () => {
  const r = buildRecord({ page: page(), ex: extraction({ deadline: "2026-11-01" }), source: source(), today: "2026-11-16", linkOk: true });
  assert.equal(r.closed, true);
});

test("frecuencia: cada fuente corre según su frequency_hours", () => {
  const now = Date.parse("2026-11-16T18:00:00Z");
  assert.equal(isDue(source({ last_run_at: null }), now), true);
  assert.equal(isDue(source({ frequency_hours: 24, last_run_at: "2026-11-16T12:00:00Z" }), now), false);
  assert.equal(isDue(source({ frequency_hours: 6, last_run_at: "2026-11-16T12:10:00Z" }), now), true); // margen de 30 min
  assert.equal(isDue(source({ status: "pausada", last_run_at: null }), now), false);
  assert.equal(isDue(source({ status: "con_errores", frequency_hours: 6, last_run_at: "2026-11-16T06:00:00Z" }), now), false);
});

/** Conector de mentira: una lista de páginas en memoria. */
function fakeConnector(pages: Page[], opts: Partial<Connector> = {}): Connector & { pages: Page[] } {
  return {
    pages,
    ...opts,
    async list() { return this.pages.map((p): ListItem => ({ url: p.url, externalId: p.externalId })); },
    async detail(item) { return this.pages.find((p) => p.url === item.url) ?? null; },
  } as Connector & { pages: Page[] };
}

function harness(connector: Connector, src = source(), store = new MemoryStore([src])) {
  let calls = 0;
  let next: Partial<Extraction> = {};
  const run = (today = "2026-11-16", force = false) =>
    runSource(src, {
      store, connector, today, force,
      ctx: ctx(src),
      extract: async (p) => { calls++; return extraction({ title: `Beca ${p.externalId}`, ...next }); },
    });
  return { store, run, calls: () => calls, setNext: (e: Partial<Extraction>) => { next = e; } };
}

test("recorrido completo: una oportunidad por página, y la IA solo se llama si la página es nueva o cambió", async () => {
  const pages = [page(), page({ url: "https://fuente.example/beca-2", externalId: "beca-2", text: "Otra beca" })];
  const connector = fakeConnector(pages);
  const h = harness(connector);

  const first = await h.run();
  assert.deepEqual([first.status, first.found, first.created], ["ok", 2, 2]);
  assert.equal(h.calls(), 2);
  assert.deepEqual(h.store.opps.map((o) => o.slug).sort(), ["beca-beca-1-universidad-de-prueba", "beca-beca-2-universidad-de-prueba"]);
  assert.ok(h.store.opps.every((o) => o.status === "publicada" && o.published_at));

  const second = await h.run();
  assert.equal(h.calls(), 2, "sin cambios no se gasta IA");
  assert.deepEqual([second.created, second.updated], [0, 0]);

  // La fuente extiende la fecha: cambia el contenido → se actualiza el mismo registro.
  pages[0] = { ...pages[0], text: "Texto de la beca. Nueva fecha límite." };
  h.setNext({ deadline: "2027-04-15" });
  const third = await h.run();
  assert.equal(h.calls(), 3);
  assert.deepEqual([third.created, third.updated], [0, 1]);
  assert.equal(h.store.opps.length, 2);
  assert.equal(h.store.opps.find((o) => o.external_id === "beca-1")?.deadline, "2027-04-15");
  assert.equal(h.store.sourceRows[0].last_run_at !== null, true);
  assert.notEqual(pageHash(pages[0]), pageHash(pages[1]));
});

test("si deja de aparecer en la fuente 3 ejecuciones seguidas, se marca como expirada", async () => {
  const connector = fakeConnector([page(), page({ url: "https://fuente.example/beca-2", externalId: "beca-2", text: "Otra" })]);
  const h = harness(connector);
  await h.run();
  connector.pages = [connector.pages[1]]; // beca-1 desaparece del listado
  assert.equal((await h.run()).expired, 0);
  assert.equal((await h.run()).expired, 0);
  const third = await h.run();
  assert.equal(third.expired, 1);
  assert.equal(h.store.opps.find((o) => o.external_id === "beca-1")?.status, "expirada");
  assert.equal(h.store.opps.find((o) => o.external_id === "beca-2")?.status, "publicada");
});

test("si la fuente dice que cerró, se expira sin llamar a la IA", async () => {
  const connector = fakeConnector([page()]);
  const h = harness(connector);
  await h.run();
  connector.pages = [{ ...connector.pages[0], closed: true }];
  const r = await h.run();
  assert.equal(r.expired, 1);
  assert.equal(h.calls(), 1);
  assert.equal(h.store.opps[0].status, "expirada");
});

test("deduplicación entre fuentes: agregador y fuente oficial dejan un solo registro, con el link oficial", async () => {
  const oficial = source({ id: "of", slug: "oficial", tier: 1 });
  const agg = source({ id: "agg", slug: "agregador", tier: 3, auto_publish: false, url: "https://agregador.example/feed" });
  const store = new MemoryStore([oficial, agg]);
  const official = "https://fuente.example/beca-1";

  // 1.º llega por el agregador → en revisión, con el link oficial
  const viaAgg = fakeConnector([page({ url: "https://agregador.example/post", externalId: "post", links: [{ text: "Official Link", url: official }], officialUrl: official })], { complete: false });
  const a = harness(viaAgg, agg, store);
  a.setNext({ official_url: official, title: "Beca vista en agregador" });
  await a.run();
  assert.equal(store.opps.length, 1);
  assert.equal(store.opps[0].status, "revision");
  assert.equal(store.opps[0].application_url, official);

  // 2.º la publica la fuente oficial → mismo registro, ahora de la fuente oficial y publicado
  const o = harness(fakeConnector([page()]), oficial, store);
  const r = await o.run();
  assert.equal(store.opps.length, 1);
  assert.equal(r.created, 0);
  assert.equal(store.opps[0].source_id, "of");
  assert.equal(store.opps[0].status, "publicada");

  // 3.º el agregador la vuelve a ver → no pisa los datos oficiales
  await a.run("2026-11-16", true);
  assert.equal(store.opps.length, 1);
  assert.equal(store.opps[0].source_id, "of");
  assert.equal(store.opps[0].title, "Beca beca-1");
});

test("lo que el administrador rechazó no se vuelve a publicar", async () => {
  const connector = fakeConnector([page()]);
  const h = harness(connector);
  await h.run();
  h.store.opps[0].status = "rechazada";
  connector.pages = [{ ...connector.pages[0], text: "Texto nuevo" }];
  await h.run();
  assert.equal(h.store.opps[0].status, "rechazada");
});

test("3 fallos seguidos ponen la fuente en con_errores, y se recupera sola cuando vuelve a funcionar", async () => {
  const broken: Connector = { async list() { throw new Error("HTTP 524"); }, async detail() { return null; } };
  const src = source();
  const store = new MemoryStore([src]);
  const h = harness(broken, src, store);
  await h.run(); await h.run();
  assert.equal(src.status, "activa");
  const third = await h.run();
  assert.equal(third.status, "error");
  assert.equal(src.status, "con_errores");
  await harness(fakeConnector([page()]), src, store).run();
  assert.equal(src.status, "activa");
});
