import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Trash2 } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { APPLICATION_STATUS, type ApplicationStatus } from "@/lib/constants";
import { deadlineLabel, typeLabel } from "@/lib/opportunities";
import { removeApplication } from "../actions";

export const metadata: Metadata = { title: "Mis postulaciones" };

export default async function ApplicationsPage() {
  const user = await requireUser("/postulaciones");
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, status, notes, updated_at, opportunity:opportunities(id, slug, title, organization, type, deadline, rolling_deadline)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const apps = (data ?? []).filter((a) => a.opportunity);
  const counts = Object.keys(APPLICATION_STATUS).map((s) => ({
    status: s as ApplicationStatus,
    n: apps.filter((a) => a.status === s).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mis postulaciones</h1>
        <p className="mt-1 text-slate-500">Lleva el control de cada oportunidad a la que vas a postular.</p>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="Aún no sigues ninguna postulación"
          description='En cada oportunidad toca "Postularé" para seguir tu avance: preparando, enviada y resultado.'
          action={<ButtonLink href="/descubrir">Buscar oportunidades</ButtonLink>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {counts.map(({ status, n }) => (
              <div key={status} className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                <p className="text-2xl font-bold">{n}</p>
                <p className="text-xs text-slate-500">{APPLICATION_STATUS[status].label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {apps.map((a) => {
              const o = a.opportunity!;
              const dl = deadlineLabel(o);
              return (
                <Card key={a.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-500">
                        {typeLabel(o.type).emoji} {typeLabel(o.type).label}
                      </span>
                      <Badge tone={dl.tone}>{dl.text}</Badge>
                    </div>
                    <Link href={`/oportunidad/${o.slug}`} className="mt-1 block truncate font-semibold hover:text-brand-600">
                      {o.title}
                    </Link>
                    <p className="text-sm text-slate-500">{o.organization}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusSelect id={a.id} status={a.status as ApplicationStatus} />
                    <form action={removeApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="grid size-10 place-items-center rounded-xl text-slate-400 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Quitar de mis postulaciones"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
