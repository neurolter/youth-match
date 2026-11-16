// Acceso a la base de datos. El importador crea SU PROPIO cliente de Supabase con
// la clave secreta; no usa nada de Next.js (ni `createAdminClient`, que depende de next/headers).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OpportunityFields } from "./record";
import type { Source } from "./types";

export type PageRow = {
  id: string;
  source_id: string;
  url: string;
  external_id: string | null;
  content_hash: string | null;
  opportunity_id: string | null;
  missed_runs: number;
  last_result: string | null;
  /** Última vez que el importador procesó esta página (sirve para rotar). */
  last_seen_at: string;
};

export type Opp = OpportunityFields & {
  id: string;
  slug: string;
  status: string;
  published_at: string | null;
  /** Nivel de confianza (tier) de la fuente dueña del registro. */
  source_tier: number | null;
};

export type RunResult = {
  status: "ok" | "parcial" | "error";
  found: number;
  created: number;
  updated: number;
  expired: number;
  errors: { url?: string; message: string }[];
};

export type Lookup = { fingerprint?: string; urls?: string[]; titleKey?: string; sourceId?: string; externalId?: string };

/** Todo lo que el importador necesita de la base. Hay una versión en memoria para las pruebas. */
export interface Store {
  sources(): Promise<Source[]>;
  updateSource(id: string, patch: { last_run_at?: string; status?: string }): Promise<void>;
  startRun(sourceId: string): Promise<string>;
  finishRun(runId: string, result: RunResult): Promise<void>;
  /** Estados de las últimas ejecuciones terminadas de una fuente, de la más nueva a la más vieja. */
  lastRunStatuses(sourceId: string, n: number): Promise<string[]>;
  pages(sourceId: string): Promise<PageRow[]>;
  savePage(row: Omit<PageRow, "id" | "last_seen_at" | "missed_runs"> & { missed_runs?: number }): Promise<void>;
  setMissed(pageIds: string[], missedRuns: number): Promise<void>;
  opportunity(id: string): Promise<Opp | null>;
  findOpportunity(q: Lookup): Promise<Opp | null>;
  slugTaken(slug: string): Promise<boolean>;
  insertOpportunity(row: OpportunityFields & { slug: string; status: string; published_at: string | null }): Promise<string>;
  updateOpportunity(id: string, patch: Partial<Opp> & { last_seen_at?: string }): Promise<void>;
  touchOpportunities(ids: string[]): Promise<void>;
}

const OPP_COLUMNS =
  "id, slug, status, published_at, source_id, external_id, canonical_url, fingerprint, title, organization, type, summary, " +
  "destination_countries, region, modality, funding, cost_note, min_age, max_age, eligible_nationalities, education_levels, " +
  "languages, areas, benefits, requirements, deadline, rolling_deadline, start_date, end_date, application_url, trust_score, " +
  "review_notes, source:sources(tier)";

const chunks = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export class SupabaseStore implements Store {
  private db: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SECRET_KEY");
    this.db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  private check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
    if (res.error) throw new Error(`Base de datos (${what}): ${res.error.message}`);
    return res.data;
  }

  private toOpp(row: Record<string, unknown> | null): Opp | null {
    if (!row) return null;
    const { source, ...rest } = row as { source?: { tier: number } | null };
    return { ...(rest as unknown as Opp), source_tier: source?.tier ?? null };
  }

  async sources() {
    const res = await this.db.from("sources").select("*").order("priority").order("slug");
    return this.check(res, "leer fuentes") as Source[];
  }

  async updateSource(id: string, patch: { last_run_at?: string; status?: string }) {
    this.check(await this.db.from("sources").update(patch).eq("id", id), "actualizar fuente");
  }

  async startRun(sourceId: string) {
    const res = await this.db.from("import_runs").insert({ source_id: sourceId, status: "en_curso" }).select("id").single();
    return (this.check(res, "crear ejecución") as { id: string }).id;
  }

  async finishRun(runId: string, r: RunResult) {
    const res = await this.db
      .from("import_runs")
      .update({ ...r, errors: r.errors.slice(0, 50), finished_at: new Date().toISOString() })
      .eq("id", runId);
    this.check(res, "cerrar ejecución");
  }

  async lastRunStatuses(sourceId: string, n: number) {
    const res = await this.db
      .from("import_runs")
      .select("status")
      .eq("source_id", sourceId)
      .neq("status", "en_curso")
      .order("started_at", { ascending: false })
      .limit(n);
    return (this.check(res, "leer ejecuciones") as { status: string }[]).map((r) => r.status);
  }

  async pages(sourceId: string) {
    const all: PageRow[] = [];
    for (let from = 0; ; from += 1000) {
      const res = await this.db.from("import_pages").select("*").eq("source_id", sourceId).order("id").range(from, from + 999);
      const rows = this.check(res, "leer páginas") as PageRow[];
      all.push(...rows);
      if (rows.length < 1000) return all;
    }
  }

  async savePage(row: Omit<PageRow, "id" | "last_seen_at" | "missed_runs"> & { missed_runs?: number }) {
    const res = await this.db
      .from("import_pages")
      .upsert({ missed_runs: 0, ...row, last_seen_at: new Date().toISOString() }, { onConflict: "source_id,url" });
    this.check(res, "guardar página");
  }

  async setMissed(pageIds: string[], missedRuns: number) {
    for (const ids of chunks(pageIds, 100)) {
      this.check(await this.db.from("import_pages").update({ missed_runs: missedRuns }).in("id", ids), "marcar ausentes");
    }
  }

  async opportunity(id: string) {
    const res = await this.db.from("opportunities").select(OPP_COLUMNS).eq("id", id).maybeSingle();
    return this.toOpp(this.check(res, "leer oportunidad") as Record<string, unknown> | null);
  }

  private async first(build: (q: ReturnType<SupabaseClient["from"]>) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
    const res = await build(this.db.from("opportunities"));
    const rows = this.check(res, "buscar duplicado") as Record<string, unknown>[] | null;
    return this.toOpp(rows?.[0] ?? null);
  }

  async findOpportunity(q: Lookup) {
    if (q.fingerprint) {
      const hit = await this.first((t) => t.select(OPP_COLUMNS).eq("fingerprint", q.fingerprint!).limit(1));
      if (hit) return hit;
    }
    const urls = [...new Set(q.urls ?? [])].filter(Boolean);
    if (urls.length) {
      const hit =
        (await this.first((t) => t.select(OPP_COLUMNS).in("canonical_url", urls).order("created_at").limit(1))) ??
        (await this.first((t) => t.select(OPP_COLUMNS).in("application_url", urls).order("created_at").limit(1)));
      if (hit) return hit;
    }
    if (q.sourceId && q.externalId) {
      const hit = await this.first((t) =>
        t.select(OPP_COLUMNS).eq("source_id", q.sourceId!).eq("external_id", q.externalId!).limit(1),
      );
      if (hit) return hit;
    }
    if (q.titleKey) {
      // Mismo título y organizador en otra URL (p. ej. agregador vs. fuente oficial).
      return this.first((t) => t.select(OPP_COLUMNS).like("fingerprint", `%-${q.titleKey}`).order("created_at").limit(1));
    }
    return null;
  }

  async slugTaken(slug: string) {
    const res = await this.db.from("opportunities").select("id").eq("slug", slug).limit(1);
    return ((this.check(res, "comprobar slug") as unknown[]) ?? []).length > 0;
  }

  async insertOpportunity(row: OpportunityFields & { slug: string; status: string; published_at: string | null }) {
    const res = await this.db
      .from("opportunities")
      .insert({ ...row, last_seen_at: new Date().toISOString() })
      .select("id")
      .single();
    return (this.check(res, "crear oportunidad") as { id: string }).id;
  }

  async updateOpportunity(id: string, patch: Partial<Opp> & { last_seen_at?: string }) {
    const { id: _id, slug: _slug, source_tier: _tier, ...rest } = patch;
    void _id; void _slug; void _tier;
    this.check(await this.db.from("opportunities").update(rest).eq("id", id), "actualizar oportunidad");
  }

  async touchOpportunities(ids: string[]) {
    const now = new Date().toISOString();
    for (const part of chunks([...new Set(ids)], 100)) {
      this.check(await this.db.from("opportunities").update({ last_seen_at: now }).in("id", part), "marcar vistas");
    }
  }
}
