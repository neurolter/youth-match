import Link from "next/link";
import { CalendarClock, Crown, MapPin, Wallet } from "lucide-react";
import { Badge } from "@/components/ui";
import { SaveButton } from "@/components/save-button";
import { FUNDING, MODALITIES, countryName, type Funding } from "@/lib/constants";
import { deadlineLabel, regionLabel, typeLabel, type OpportunityCardData } from "@/lib/opportunities";

export function OpportunityCard({
  o,
  saved = false,
  loggedIn = false,
  reasons,
}: {
  o: OpportunityCardData;
  saved?: boolean;
  loggedIn?: boolean;
  reasons?: string[];
}) {
  const t = typeLabel(o.type);
  const dl = deadlineLabel(o);
  const place =
    o.modality === "virtual"
      ? "En línea"
      : o.destination_countries.length === 1
        ? countryName(o.destination_countries[0])
        : regionLabel(o.region) ?? "Varios países";

  return (
    <article className="group relative flex flex-col rounded-2xl bg-white p-5 ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 hover:ring-brand-200">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">
            <span aria-hidden>{t.emoji}</span> {t.label}
          </Badge>
          {o.is_premium && (
            <Badge tone="amber">
              <Crown className="size-3" /> Premium
            </Badge>
          )}
        </div>
        <div className="relative z-10">
          <SaveButton opportunityId={o.id} saved={saved} loggedIn={loggedIn} />
        </div>
      </div>

      <h3 className="text-base font-semibold leading-snug text-slate-900">
        <Link href={`/oportunidad/${o.slug}`} className="after:absolute after:inset-0">
          {o.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-slate-500">{o.organization}</p>
      {o.summary && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{o.summary}</p>}

      {reasons && reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <span key={r} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              ✓ {r}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5 text-slate-400" />
            {place}
            {o.modality === "hibrida" && ` · ${MODALITIES.hibrida}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Wallet className="size-3.5 text-slate-400" />
            {FUNDING[o.funding as Funding] ?? FUNDING.desconocido}
          </span>
        </div>
        <div className="mt-3">
          <Badge tone={dl.tone}>
            <CalendarClock className="size-3" /> {dl.text}
          </Badge>
        </div>
      </div>
    </article>
  );
}

export function OpportunityGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
