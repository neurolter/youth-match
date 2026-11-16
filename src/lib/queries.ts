import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { CARD_COLUMNS, todayISO, type OpportunityCardData } from "@/lib/opportunities";
import { FUNDING, MODALITIES, OPPORTUNITY_TYPES, REGIONS } from "@/lib/constants";

export const PAGE_SIZE = 24;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Oportunidades publicadas y abiertas, con filtros desde la URL. */
export async function searchOpportunities(sp: SP, nationality?: string | null) {
  const supabase = await createClient();
  const today = todayISO();
  const page = Math.max(1, Number(one(sp.pagina)) || 1);

  let query = supabase
    .from("opportunities")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("status", "publicada")
    .or(`deadline.gte.${today},deadline.is.null,rolling_deadline.eq.true`);

  // Solo las que aceptan la nacionalidad del usuario (salvo que pida ver todas)
  const showAll = one(sp.todas) === "1";
  const filterNationality = Boolean(nationality && /^[A-Z]{2}$/.test(nationality) && !showAll);
  if (filterNationality) query = query.or(`eligible_nationalities.eq.{},eligible_nationalities.cs.{${nationality}}`);

  const q = one(sp.q)?.trim();
  if (q) query = query.textSearch("search", q.split(/\s+/).map((w) => `${w.replace(/[^\p{L}\p{N}]/gu, "")}:*`).filter((w) => w.length > 2).join(" & ") || q, { config: "spanish" });

  const tipo = one(sp.tipo);
  if (tipo && tipo in OPPORTUNITY_TYPES) query = query.eq("type", tipo);
  const region = one(sp.region);
  if (region && region in REGIONS) query = query.eq("region", region);
  const funding = one(sp.financiamiento);
  if (funding && funding in FUNDING) query = query.eq("funding", funding);
  const modality = one(sp.modalidad);
  if (modality && modality in MODALITIES) query = query.eq("modality", modality);
  // Los voluntariados en línea (microtareas) se agrupan aparte si no se filtró por tipo o modalidad
  const groupOnlineVolunteering = !tipo && !modality && !q;
  if (groupOnlineVolunteering) query = query.or("type.neq.voluntariado,modality.neq.virtual");

  const cierre = Number(one(sp.cierre));
  if (cierre > 0) {
    const limit = new Date(today + "T00:00:00Z");
    limit.setUTCDate(limit.getUTCDate() + cierre);
    query = query.lte("deadline", limit.toISOString().slice(0, 10));
  }

  // Sin nacionalidad conocida (visitante), las limitadas a 1-2 países van al final
  if (!nationality) query = query.order("few_countries", { ascending: true });

  query =
    one(sp.orden) === "recientes"
      ? query.order("published_at", { ascending: false, nullsFirst: false })
      : query.order("deadline", { ascending: true, nullsFirst: false });

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) console.error("searchOpportunities", error.message);

  // Cuántas quedaron fuera (para avisar al usuario)
  const open = () =>
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "publicada").or(`deadline.gte.${today},deadline.is.null,rolling_deadline.eq.true`);
  const [notEligible, onlineVolunteering] = await Promise.all([
    filterNationality
      ? open().not("eligible_nationalities", "eq", "{}").not("eligible_nationalities", "cs", `{${nationality}}`)
      : Promise.resolve({ count: 0 }),
    groupOnlineVolunteering
      ? (() => {
          let v = open().eq("type", "voluntariado").eq("modality", "virtual");
          if (filterNationality) v = v.or(`eligible_nationalities.eq.{},eligible_nationalities.cs.{${nationality}}`);
          return v;
        })()
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    items: (data ?? []) as OpportunityCardData[],
    total: count ?? 0,
    page,
    hiddenNotEligible: notEligible.count ?? 0,
    onlineVolunteering: onlineVolunteering.count ?? 0,
    showAll,
  };
}

/** IDs que el usuario actual tiene guardados. */
export async function savedIds(): Promise<Set<string>> {
  const user = await getUser();
  if (!user) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("saved_opportunities").select("opportunity_id").eq("user_id", user.id);
  return new Set((data ?? []).map((r) => r.opportunity_id));
}
