import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Http } from "../http";
import type { Extraction } from "../schema";
import type { Ctx, Source } from "../types";

export const fixture = (name: string) => readFileSync(join(__dirname, "..", "__fixtures__", name), "utf8");

export const source = (over: Partial<Source> = {}): Source => ({
  id: "src-1", slug: "fuente", name: "Fuente", url: "https://fuente.example/", kind: "html", tier: 1, language: "es",
  frequency_hours: 24, auto_publish: true, status: "activa", last_run_at: null, ...over,
});

/** Http falso: responde con los textos dados por URL, sin salir a internet ni esperar. */
export function fakeHttp(pages: Record<string, string>): Http {
  const http = new Http((async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = pages[url];
    if (body === undefined) return new Response("no encontrado", { status: 404 });
    return new Response(body, { status: 200, headers: { "content-type": url.endsWith(".xml") ? "text/xml" : "text/html" } });
  }) as typeof fetch);
  http.throttle = async () => {};
  return http;
}

export const ctx = (src: Source, pages: Record<string, string> = {}): Ctx => ({
  source: src,
  http: fakeHttp(pages),
  newPage: async () => { throw new Error("sin navegador en las pruebas"); },
  log: () => {},
});

export const extraction = (over: Partial<Extraction> = {}): Extraction => ({
  is_opportunity: true, is_open: true, title: "Beca de prueba 2027", organization: "Universidad de Prueba", type: "beca",
  summary: "Una beca de prueba.", destination_countries: ["ES"], region: "europa", modality: "presencial", funding: "total",
  cost_note: null, min_age: null, max_age: null, eligible_nationalities: [], education_levels: ["graduado"], languages: ["es"],
  areas: ["Educación"], benefits: ["Matrícula"], requirements: ["Título universitario"], deadline: "2027-03-01",
  rolling_deadline: false, start_date: null, end_date: null, application_url: null, official_url: null, scam_signals: [], ...over,
});
