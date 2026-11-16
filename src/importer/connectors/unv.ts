// Voluntarios ONU (UNV). app.unv.org es una aplicación JavaScript protegida
// contra bots: solo funciona con el navegador headless. Se aprovecha la
// búsqueda que hace la propia página (devuelve JSON) y luego se visita cada
// asignación en /opportunities/<id>.
import type { Connector, Ctx, ListItem, Page } from "../types";

const SITE = "https://app.unv.org";
const SEARCH = "SearchDoaAsyncByAzureCognitive";
const LATAM = "AR BO BR CL CO CR CU DO EC SV GT HN MX NI PA PY PE PR UY VE".split(" ");

type Coded = { label?: string; value?: { code?: string }; props?: { codeISO2?: string } | null } | null;
export type UnvItem = {
  id?: number | string;
  doaRequestNo?: string;
  name?: string;
  hostEntity?: { name?: string } | null;
  country?: Coded;
  status?: Coded;
  volunteerType?: Coded;
  workLocation?: Coded;
  categoryName?: Coded;
  sdgType?: Coded;
  expertiseAreas?: Coded[] | null;
  duration?: number | null;
  sourcingEndDate?: string | null;
};

/**
 * ¿Le sirve a un joven latinoamericano? Las asignaciones "nacionales" exigen
 * ser del país anfitrión, así que solo se conservan las de Latinoamérica.
 */
export function unvRelevant(it: UnvItem): boolean {
  if (it.status?.value?.code && it.status.value.code !== "DOA_SOURCING") return false;
  const national = it.volunteerType?.value?.code === "NATIONAL";
  return !national || LATAM.includes(it.country?.props?.codeISO2 ?? "");
}

export function unvToListItem(it: UnvItem): ListItem | null {
  const id = String(it.doaRequestNo ?? it.id ?? "");
  if (!id) return null;
  return { url: `${SITE}/opportunities/${id}`, externalId: id, title: it.name, hint: { item: it } };
}

async function searchAll(ctx: Ctx): Promise<{ items: UnvItem[]; total: number }> {
  const page = await ctx.newPage();
  try {
    await ctx.http.throttle("app.unv.org");
    const wait = page.waitForResponse((r) => r.url().includes(SEARCH), { timeout: 60000 });
    await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 60000 });
    const first = await wait;
    const data = (await first.json()) as { value?: { total?: number; result?: UnvItem[] } };
    let items = data.value?.result ?? [];
    const total = data.value?.total ?? items.length;

    // Repetir la misma búsqueda de la página, pidiendo más resultados por tanda.
    const body = first.request().postData();
    if (body && total > items.length) {
      try {
        const base = JSON.parse(body) as Record<string, unknown>;
        if ("take" in base) {
          items = [];
          for (let skip = 0; skip < Math.min(total, 300); skip += 100) {
            await ctx.http.throttle("app.unv.org");
            const res = await page.evaluate<{ value?: { result?: UnvItem[] } }>(
              `fetch("/api/doa/doa/${SEARCH}", { method: "POST", headers: { "Content-Type": "application/json" }, body: ${JSON.stringify(JSON.stringify({ ...base, skip, take: 100 }))} }).then((r) => r.json())`,
            );
            items.push(...(res.value?.result ?? []));
          }
        }
      } catch {
        // Si la búsqueda ampliada falla, se trabaja con la primera tanda.
      }
    }
    return { items, total };
  } finally {
    await page.close();
  }
}

export const unv: Connector = {
  complete: false, // puede que no se alcance a leer todo el listado
  maxPages: 30,
  async list(ctx) {
    if (!(await ctx.http.allowed(SITE))) throw new Error(`robots.txt no permite visitar ${SITE}`);
    const { items, total } = await searchAll(ctx);
    ctx.log(`  UNV: ${items.length} de ${total} asignaciones leídas`);
    return items.filter(unvRelevant).map(unvToListItem).filter((x): x is ListItem => !!x);
  },
  async detail(item, ctx): Promise<Page | null> {
    const it = (item.hint?.item ?? {}) as UnvItem;
    const page = await ctx.newPage();
    try {
      await ctx.http.throttle("app.unv.org");
      await page.goto(item.url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(1500);
      const text = await page.evaluate<string>(`(document.querySelector("main") || document.body).innerText`);
      if (text.replace(/\s+/g, " ").length < 300) throw new Error("La página de UNV no cargó su contenido (posible bloqueo anti-bots)");
      const iso = it.country?.props?.codeISO2;
      return {
        url: item.url,
        externalId: item.externalId!,
        text: [
          `Asignación de voluntariado de la ONU: ${it.name ?? ""}`,
          `Entidad anfitriona: ${it.hostEntity?.name ?? ""}`,
          `País: ${it.country?.label ?? ""}. Tipo de voluntario: ${it.volunteerType?.label ?? ""}. Lugar de trabajo: ${it.workLocation?.label ?? ""}. Categoría: ${it.categoryName?.label ?? ""}.`,
          it.duration ? `Duración: ${it.duration} días.` : "",
          text.slice(0, 12000),
        ].filter(Boolean).join("\n"),
        links: [{ text: "Postular en la plataforma de UNV", url: item.url }],
        timezone: "UTC",
        facts: {
          type: "voluntariado",
          application_url: item.url,
          ...(it.hostEntity?.name ? { organization: it.hostEntity.name } : {}),
          ...(it.sourcingEndDate ? { deadline: it.sourcingEndDate.slice(0, 10) } : {}),
          ...(iso && /^[A-Z]{2}$/.test(iso) ? { destination_countries: [iso] } : {}),
        },
      };
    } finally {
      await page.close();
    }
  },
};
