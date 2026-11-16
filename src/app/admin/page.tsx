import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Link2 } from "lucide-react";
import { Badge, Card, Logo } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatDate, typeLabel } from "@/lib/opportunities";
import { reviewOpportunity, toggleSource } from "./actions";

export const metadata: Metadata = { title: "Administración" };

const KIND: Record<string, string> = { api: "API", rss: "RSS", html: "Web", headless: "Web (JS)", manual: "Manual" };
const TIER: Record<number, { label: string; tone: "green" | "brand" | "amber" }> = {
  1: { label: "Oficial", tone: "green" },
  2: { label: "Confiable", tone: "brand" },
  3: { label: "Agregador", tone: "amber" },
};

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: sources }, { data: counts }, { data: queue }, { data: runs }, { count: users }] = await Promise.all([
    supabase.from("sources").select("*").order("priority").order("name"),
    supabase.from("opportunities").select("source_id, status"),
    supabase
      .from("opportunities")
      .select("id, slug, title, organization, type, deadline, trust_score, source:sources(name)")
      .eq("status", "revision")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("import_runs").select("*, source:sources(name)").order("started_at", { ascending: false }).limit(15),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  const bySource = new Map<string, { publicada: number; revision: number; total: number }>();
  const totals = { publicada: 0, revision: 0, expirada: 0 };
  for (const o of counts ?? []) {
    if (o.status in totals) totals[o.status as keyof typeof totals]++;
    if (!o.source_id) continue;
    const c = bySource.get(o.source_id) ?? { publicada: 0, revision: 0, total: 0 };
    c.total++;
    if (o.status === "publicada") c.publicada++;
    if (o.status === "revision") c.revision++;
    bySource.set(o.source_id, c);
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge>Admin</Badge>
          </div>
          <Link href="/descubrir" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/70 hover:text-navy">
            <ArrowLeft className="size-4" /> Volver a la app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="bg-globe grain relative flex flex-col gap-4 overflow-hidden rounded-[1.6rem] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <p className="font-display text-xl font-bold">¿Encontraste una oportunidad?</p>
            <p className="mt-1 text-sm text-white/70">Pega el enlace y la IA llena los datos por ti. Útil para sitios que bloquean el importador.</p>
          </div>
          <Link
            href="/admin/agregar"
            className="relative inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-accent px-6 font-semibold text-white"
          >
            <Link2 className="size-4" /> Agregar por enlace
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Publicadas", totals.publicada],
            ["En revisión", totals.revision],
            ["Expiradas", totals.expirada],
            ["Usuarios", users ?? 0],
          ].map(([label, n]) => (
            <Card key={label} className="p-4">
              <p className="text-2xl font-bold">{n}</p>
              <p className="text-sm text-ink/55">{label}</p>
            </Card>
          ))}
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Cola de revisión</h2>
          {queue?.length ? (
            <Card className="divide-y divide-navy/8">
              {queue.map((o) => (
                <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink/55">
                      {typeLabel(o.type).label} · {o.source?.name ?? "Organizador"} · confianza {o.trust_score}
                      {o.deadline && ` · cierra ${formatDate(o.deadline, { day: "numeric", month: "short" })}`}
                    </p>
                    <Link href={`/oportunidad/${o.slug}`} className="block truncate font-medium hover:text-brand-600">
                      {o.title}
                    </Link>
                    <p className="text-sm text-ink/55">{o.organization}</p>
                  </div>
                  <form action={reviewOpportunity} className="flex gap-2">
                    <input type="hidden" name="id" value={o.id} />
                    <button name="decision" value="publicada" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                      Publicar
                    </button>
                    <button name="decision" value="rechazada" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-rose-600 ring-1 ring-navy/10 hover:bg-rose-50">
                      Rechazar
                    </button>
                  </form>
                </div>
              ))}
            </Card>
          ) : (
            <p className="text-sm text-ink/55">No hay oportunidades pendientes de revisión.</p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Fuentes ({sources?.length ?? 0})</h2>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-navy/8 text-xs uppercase tracking-wide text-ink/40">
                <tr>
                  <th className="p-3 font-medium">Fuente</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Confianza</th>
                  <th className="p-3 font-medium">Prioridad</th>
                  <th className="p-3 font-medium">Publicadas</th>
                  <th className="p-3 font-medium">Última ejecución</th>
                  <th className="p-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/8">
                {(sources ?? []).map((s) => {
                  const c = bySource.get(s.id);
                  return (
                    <tr key={s.id}>
                      <td className="p-3">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand-600">
                          {s.name}
                        </a>
                        <p className="text-xs text-ink/40">{s.language.toUpperCase()} · cada {s.frequency_hours} h</p>
                      </td>
                      <td className="p-3 text-ink/70">{KIND[s.kind] ?? s.kind}</td>
                      <td className="p-3">
                        <Badge tone={TIER[s.tier].tone}>{TIER[s.tier].label}</Badge>
                      </td>
                      <td className="p-3 text-ink/70">{s.priority}</td>
                      <td className="p-3 text-ink/70">
                        {c?.publicada ?? 0}
                        {c?.revision ? <span className="text-amber-600"> (+{c.revision} en revisión)</span> : null}
                      </td>
                      <td className="p-3 text-ink/70">{s.last_run_at ? formatDate(s.last_run_at.slice(0, 10), { day: "numeric", month: "short" }) : "Nunca"}</td>
                      <td className="p-3">
                        <form action={toggleSource}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="status" value={s.status} />
                          <button className="text-xs font-semibold">
                            <Badge tone={s.status === "activa" ? "green" : s.status === "pausada" ? "slate" : "red"}>{s.status}</Badge>
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Últimas ejecuciones del importador</h2>
          {runs?.length ? (
            <Card className="divide-y divide-navy/8 text-sm">
              {runs.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
                  <span className="font-medium">{r.source?.name}</span>
                  <Badge tone={r.status === "ok" ? "green" : r.status === "error" ? "red" : "amber"}>{r.status}</Badge>
                  <span className="text-ink/55">
                    {r.found} encontradas · {r.created} nuevas · {r.updated} actualizadas · {r.expired} expiradas
                  </span>
                  <span className="ml-auto text-xs text-ink/40">{new Date(r.started_at).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}</span>
                </div>
              ))}
            </Card>
          ) : (
            <p className="text-sm text-ink/55">El importador todavía no se ha ejecutado.</p>
          )}
        </section>
      </main>
    </div>
  );
}
