import Link from "next/link";
import clsx from "clsx";
import { Crown, Lock } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import { FUNDING, countryName, type Funding } from "@/lib/constants";
import { daysLeft, eligibleFor, formatDate, regionLabel, typeLabel, type OpportunityCardData } from "@/lib/opportunities";

// Color de la franja según el tipo de oportunidad
const TYPE_TINT: Record<string, string> = {
  beca: "from-brand-600 to-brand-400",
  intercambio: "from-sky-600 to-cyan-400",
  congreso: "from-accent-600 to-accent-500",
  voluntariado: "from-emerald-600 to-teal-400",
  pasantia: "from-slate-700 to-slate-500",
  competencia: "from-amber-500 to-yellow-300",
  liderazgo: "from-fuchsia-600 to-rose-400",
  curso: "from-indigo-600 to-brand-400",
  fellowship: "from-violet-600 to-brand-500",
  campamento: "from-lime-600 to-emerald-400",
  otro: "from-slate-500 to-slate-300",
};

const SHORT_FUNDING: Record<Funding, string> = {
  total: "100 % pagada",
  parcial: "Parcial",
  sin_financiamiento: "Sin beca",
  desconocido: "Por confirmar",
};

export function OpportunityCard({
  o,
  saved = false,
  loggedIn = false,
  reasons,
  nationality,
}: {
  o: OpportunityCardData;
  saved?: boolean;
  loggedIn?: boolean;
  reasons?: string[];
  nationality?: string | null;
}) {
  const eligible = eligibleFor(o, nationality);
  const onlyFor =
    o.eligible_nationalities.length && (eligible === false || o.eligible_nationalities.length <= 3)
      ? o.eligible_nationalities.slice(0, 2).map(countryName).join(", ") + (o.eligible_nationalities.length > 2 ? ` y ${o.eligible_nationalities.length - 2} más` : "")
      : null;
  const fundingText =
    o.type === "voluntariado" && o.funding === "desconocido" ? "No aplica" : (SHORT_FUNDING[o.funding as Funding] ?? FUNDING.desconocido);
  const t = typeLabel(o.type);
  const d = o.rolling_deadline ? null : daysLeft(o.deadline);
  const urgent = d !== null && d >= 0 && d <= 7;
  const soon = d !== null && d > 7 && d <= 30;
  const place =
    o.modality === "virtual"
      ? "En línea"
      : o.destination_countries.length === 1
        ? countryName(o.destination_countries[0])
        : (regionLabel(o.region) ?? "Varios países");

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-[1.4rem] bg-white ring-1 ring-navy/8 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(11,31,82,0.45)] hover:ring-navy/15"
      style={{ ["--ticket-bg" as string]: "var(--color-paper)" }}
    >
      <div className={clsx("h-1.5 bg-gradient-to-r", TYPE_TINT[o.type] ?? TYPE_TINT.otro)} />

      <div className="flex flex-1 flex-col p-5 pb-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy/[0.05] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-navy/80">
              <span aria-hidden className="text-sm leading-none">{t.emoji}</span> {t.label}
            </span>
            {o.is_premium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                <Crown className="size-3" /> Premium
              </span>
            )}
          </div>
          <div className="relative z-10 -mr-1 -mt-1">
            <SaveButton opportunityId={o.id} saved={saved} loggedIn={loggedIn} />
          </div>
        </div>

        <h3 className="text-[1.15rem] font-bold leading-snug text-navy">
          <Link href={`/oportunidad/${o.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {o.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-sm font-medium text-ink/55">{o.organization}</p>

        {onlyFor && (
          <p
            className={clsx(
              "mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              eligible === false ? "bg-rose-50 text-rose-700" : "bg-navy/[0.05] text-ink/65",
            )}
          >
            <Lock className="size-3" /> {eligible === false ? "No disponible para tu país · " : ""}Solo para {onlyFor}
          </p>
        )}

        {reasons && reasons.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <span key={r} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                ✓ {r}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Talón del boleto */}
      <div className="ticket-perf mx-0 grid grid-cols-[1fr_1fr_auto] items-end gap-3 px-5 pb-5 pt-4">
        <Field label="Destino" value={place} />
        <Field label="Financia" value={fundingText} highlight={o.funding === "total"} />
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Cierra</p>
          {o.rolling_deadline ? (
            <p className="mt-1 text-sm font-bold text-emerald-700">Siempre abierta</p>
          ) : d === null ? (
            <p className="mt-1 text-sm font-semibold text-ink/50">Por confirmar</p>
          ) : (
            <p
              className={clsx(
                "mt-0.5 font-display text-lg font-bold leading-none",
                urgent ? "text-accent-600" : soon ? "text-accent-500" : "text-navy",
              )}
              title={formatDate(o.deadline) ?? undefined}
            >
              {d === 0 ? "¡Hoy!" : d === 1 ? "Mañana" : d <= 60 ? `${d} días` : formatDate(o.deadline, { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">{label}</p>
      <p className={clsx("mt-1 truncate text-sm font-semibold", highlight ? "text-emerald-700" : "text-ink/80")}>{value}</p>
    </div>
  );
}

export function OpportunityGrid({ children }: { children: React.ReactNode }) {
  return <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">{children}</div>;
}
