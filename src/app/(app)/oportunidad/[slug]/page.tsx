import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Crown, ExternalLink, GraduationCap,
  Languages, MapPin, ShieldCheck, Users, Wallet,
} from "lucide-react";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { SaveButton } from "@/components/save-button";
import { TrackButton } from "@/components/track-button";
import { createClient } from "@/lib/supabase/server";
import { getUser, hasPremium } from "@/lib/auth";
import { EDUCATION_LEVELS, FUNDING, LANGUAGES, MODALITIES, countryName, type EducationLevel, type Funding } from "@/lib/constants";
import { deadlineLabel, formatDate, regionLabel, typeLabel } from "@/lib/opportunities";

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("opportunities")
    .select("*, source:sources(name, url, tier)")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/oportunidad/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const o = await load(slug);
  if (!o) return { title: "Oportunidad no encontrada" };
  return { title: o.title, description: o.summary ?? `${typeLabel(o.type).label} de ${o.organization}` };
}

export default async function OpportunityPage({ params }: PageProps<"/oportunidad/[slug]">) {
  const { slug } = await params;
  const o = await load(slug);
  if (!o) notFound();

  const user = await getUser();
  const supabase = await createClient();
  const [premium, savedRes, appRes] = await Promise.all([
    hasPremium(),
    user
      ? supabase.from("saved_opportunities").select("opportunity_id").eq("user_id", user.id).eq("opportunity_id", o.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("applications").select("id, status").eq("user_id", user.id).eq("opportunity_id", o.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const t = typeLabel(o.type);
  const dl = deadlineLabel(o);
  const locked = o.is_premium && !premium;
  const closed = o.status === "expirada";
  const applyUrl = o.application_url ?? o.canonical_url;

  const facts = [
    {
      icon: MapPin,
      label: "Dónde",
      value:
        o.modality === "virtual"
          ? "En línea"
          : [o.destination_countries.map(countryName).join(", ") || regionLabel(o.region), MODALITIES[o.modality as keyof typeof MODALITIES]]
              .filter(Boolean)
              .join(" · "),
    },
    { icon: Wallet, label: "Financiamiento", value: [FUNDING[o.funding as Funding], o.cost_note].filter(Boolean).join(" — ") },
    {
      icon: CalendarClock,
      label: "Fechas del programa",
      value:
        o.start_date || o.end_date
          ? [formatDate(o.start_date), formatDate(o.end_date)].filter(Boolean).join(" al ")
          : null,
    },
    {
      icon: Users,
      label: "Edad",
      value: o.min_age && o.max_age ? `De ${o.min_age} a ${o.max_age} años` : o.min_age ? `Desde ${o.min_age} años` : o.max_age ? `Hasta ${o.max_age} años` : null,
    },
    {
      icon: GraduationCap,
      label: "Nivel",
      value: o.education_levels.map((l) => EDUCATION_LEVELS[l as EducationLevel] ?? l).join(", ") || null,
    },
    {
      icon: Languages,
      label: "Idiomas",
      value: o.languages.map((l) => LANGUAGES[l as keyof typeof LANGUAGES] ?? l).join(", ") || null,
    },
    {
      icon: ShieldCheck,
      label: "Nacionalidades",
      value: o.eligible_nationalities.length ? o.eligible_nationalities.map(countryName).join(", ") : "Abierta a todas las nacionalidades",
    },
  ].filter((f) => f.value);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/descubrir" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Volver a descubrir
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge tone="brand">
                {t.emoji} {t.label}
              </Badge>
              {o.is_premium && (
                <Badge tone="amber">
                  <Crown className="size-3" /> Premium
                </Badge>
              )}
              {closed && <Badge tone="slate">Convocatoria cerrada</Badge>}
            </div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{o.title}</h1>
            <p className="mt-2 text-slate-500">{o.organization}</p>
          </div>

          {o.summary && <p className="text-lg leading-relaxed text-slate-700">{o.summary}</p>}

          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-500" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="text-sm text-slate-800">{value}</p>
                </div>
              </div>
            ))}
          </Card>

          {locked ? (
            <Card className="relative overflow-hidden p-6 text-center">
              <Crown className="mx-auto size-8 text-amber-500" />
              <h2 className="mt-3 font-semibold">Oportunidad exclusiva Premium</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Desbloquea los requisitos completos, beneficios y el enlace para postular.
              </p>
              <ButtonLink href="/planes" className="mt-4">
                Ver planes
              </ButtonLink>
            </Card>
          ) : (
            <>
              {o.benefits.length > 0 && (
                <Section title="Qué incluye">
                  <List items={o.benefits} />
                </Section>
              )}
              {o.requirements.length > 0 && (
                <Section title="Requisitos">
                  <List items={o.requirements} />
                </Section>
              )}
              {o.description && (
                <Section title="Descripción">
                  <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{o.description}</div>
                </Section>
              )}
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Fecha límite</p>
              <p className="mt-1 text-lg font-semibold">
                {o.rolling_deadline ? "Abierta todo el año" : (formatDate(o.deadline) ?? "Por confirmar")}
              </p>
              {!o.rolling_deadline && o.deadline && (
                <Badge tone={dl.tone} className="mt-1.5">
                  {dl.text}
                </Badge>
              )}
            </div>

            {applyUrl && !locked && !closed && (
              <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
                Postular en el sitio oficial <ExternalLink className="size-4" />
              </a>
            )}
            <div className="grid grid-cols-2 gap-2">
              <SaveButton opportunityId={o.id} saved={!!savedRes.data} loggedIn={!!user} variant="full" />
              <TrackButton opportunityId={o.id} tracking={!!appRes.data} loggedIn={!!user} />
            </div>
            {appRes.data && (
              <Link href="/postulaciones" className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline">
                <ClipboardList className="size-4" /> Ver en mis postulaciones
              </Link>
            )}

            {o.source && (
              <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">
                Fuente:{" "}
                <a href={o.canonical_url ?? o.source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-700 hover:underline">
                  {o.source.name}
                </a>
                {o.source.tier === 1 && " · fuente oficial"}
                {o.updated_at && <> · actualizado el {formatDate(o.updated_at.slice(0, 10), { day: "numeric", month: "short" })}</>}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm text-slate-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}
