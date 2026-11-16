// Base de datos en memoria para probar el recorrido completo sin Supabase.
import { titleKey } from "../normalize";
import type { OpportunityFields } from "../record";
import type { Lookup, Opp, PageRow, RunResult, Store } from "../store";
import type { Source } from "../types";

export class MemoryStore implements Store {
  opps: (Opp & { last_seen_at?: string })[] = [];
  pageRows: PageRow[] = [];
  runs: { id: string; source_id: string; result?: RunResult }[] = [];
  private n = 0;

  constructor(public sourceRows: Source[]) {}

  async sources() { return this.sourceRows; }
  async updateSource(id: string, patch: { last_run_at?: string; status?: string }) {
    Object.assign(this.sourceRows.find((s) => s.id === id)!, patch);
  }
  async startRun(sourceId: string) {
    const id = `run-${++this.n}`;
    this.runs.push({ id, source_id: sourceId });
    return id;
  }
  async finishRun(runId: string, result: RunResult) { this.runs.find((r) => r.id === runId)!.result = result; }
  async lastRunStatuses(sourceId: string, n: number) {
    return this.runs.filter((r) => r.source_id === sourceId && r.result).map((r) => r.result!.status).reverse().slice(0, n);
  }
  async pages(sourceId: string) { return this.pageRows.filter((p) => p.source_id === sourceId).map((p) => ({ ...p })); }
  async savePage(row: Omit<PageRow, "id" | "last_seen_at" | "missed_runs"> & { missed_runs?: number }) {
    const prev = this.pageRows.find((p) => p.source_id === row.source_id && p.url === row.url);
    const next = { missed_runs: 0, ...row, last_seen_at: new Date(Date.now() + ++this.n).toISOString() };
    if (prev) Object.assign(prev, next);
    else this.pageRows.push({ id: `page-${++this.n}`, ...next });
  }
  async setMissed(ids: string[], missed: number) {
    for (const p of this.pageRows) if (ids.includes(p.id)) p.missed_runs = missed;
  }
  private withTier(o: Opp | undefined): Opp | null {
    return o ? { ...o, source_tier: this.sourceRows.find((s) => s.id === o.source_id)?.tier ?? null } : null;
  }
  async opportunity(id: string) { return this.withTier(this.opps.find((o) => o.id === id)); }
  async findOpportunity(q: Lookup) {
    const hit =
      this.opps.find((o) => q.fingerprint && o.fingerprint === q.fingerprint) ??
      this.opps.find((o) => q.urls?.includes(o.canonical_url) || (o.application_url && q.urls?.includes(o.application_url))) ??
      this.opps.find((o) => q.sourceId && o.source_id === q.sourceId && o.external_id === q.externalId) ??
      this.opps.find((o) => q.titleKey && titleKey(o.title, o.organization) === q.titleKey);
    return this.withTier(hit);
  }
  async slugTaken(slug: string) { return this.opps.some((o) => o.slug === slug); }
  async insertOpportunity(row: OpportunityFields & { slug: string; status: string; published_at: string | null }) {
    const id = `opp-${++this.n}`;
    this.opps.push({ ...row, id, source_tier: null });
    return id;
  }
  async updateOpportunity(id: string, patch: Partial<Opp> & { last_seen_at?: string }) {
    Object.assign(this.opps.find((o) => o.id === id)!, patch);
  }
  async touchOpportunities() {}
}
