import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, ClipboardList, Globe2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";
import { OpportunityCard } from "@/components/opportunity-card";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { CARD_COLUMNS, todayISO, type OpportunityCardData } from "@/lib/opportunities";
import { OPPORTUNITY_TYPES } from "@/lib/constants";

export default async function Home() {
  const user = await getUser();
  if (user) redirect("/para-ti");

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("opportunities")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("status", "publicada")
    .or(`deadline.gte.${todayISO()},deadline.is.null,rolling_deadline.eq.true`)
    .order("trust_score", { ascending: false })
    .limit(3);
  const featured = (data ?? []) as OpportunityCardData[];

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo className="text-lg" />
        <nav className="flex items-center gap-2">
          <Link href="/descubrir" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block">
            Explorar
          </Link>
          <Link href="/planes" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block">
            Planes
          </Link>
          <ButtonLink href="/ingresar" variant="ghost" size="sm">
            Ingresar
          </ButtonLink>
          <ButtonLink href="/registro" size="sm">
            Crear cuenta
          </ButtonLink>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-brand-50 to-white" />
          <div className="absolute -right-32 top-10 -z-10 size-96 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
                <Sparkles className="size-3.5" /> Hecho para jóvenes de Latinoamérica
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
                Tu próxima experiencia <span className="text-brand-600">internacional</span>, sin buscar por horas.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-slate-600">
                Becas, intercambios, congresos, voluntariados y programas de liderazgo de fuentes oficiales, reunidos en un solo lugar,
                actualizados cada día y recomendados según tu perfil.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/registro" size="lg">
                  Empieza gratis <ArrowRight className="size-4" />
                </ButtonLink>
                <ButtonLink href="/descubrir" size="lg" variant="secondary">
                  Ver oportunidades {count ? `(${count})` : ""}
                </ButtonLink>
              </div>
            </div>

            <div className="mt-12 flex flex-wrap gap-2">
              {Object.entries(OPPORTUNITY_TYPES)
                .filter(([k]) => k !== "otro")
                .map(([k, t]) => (
                  <Link
                    key={k}
                    href={`/descubrir?tipo=${k}`}
                    className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:ring-brand-300"
                  >
                    {t.emoji} {t.label}
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Abiertas ahora</h2>
              <Link href="/descubrir" className="text-sm font-semibold text-brand-600 hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featured.map((o) => (
                <OpportunityCard key={o.id} o={o} />
              ))}
            </div>
          </section>
        )}

        {/* Cómo funciona */}
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight">Así trabajamos por ti</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { icon: Globe2, title: "Reunimos todo", text: "Revisamos becas, embajadas, organismos internacionales y fundaciones, y traemos cada convocatoria por separado." },
                { icon: RefreshCw, title: "Siempre al día", text: "Cada día agregamos lo nuevo y ocultamos lo que ya cerró. Nada de enlaces viejos ni convocatorias vencidas." },
                { icon: Sparkles, title: "Hecho a tu medida", text: "Con tu perfil te mostramos primero lo que encaja contigo: tu edad, nacionalidad, estudios e intereses." },
                { icon: ShieldCheck, title: "Fuentes confiables", text: "Priorizamos fuentes oficiales y revisamos las demás. Siempre te llevamos al sitio oficial para postular." },
                { icon: ClipboardList, title: "Organiza tus postulaciones", text: "Guarda oportunidades y sigue tu avance: preparando, enviada y resultado." },
                { icon: BellRing, title: "No te pierdas fechas", text: "Con Premium te avisamos antes de que cierre lo que te interesa." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/70">
                  <div className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 px-6 py-12 text-center text-white sm:px-12">
            <h2 className="text-3xl font-bold tracking-tight">El mundo te está esperando</h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100">Crea tu cuenta gratis y recibe tus primeras recomendaciones en 2 minutos.</p>
            <ButtonLink href="/registro" size="lg" variant="secondary" className="mt-7">
              Crear mi cuenta gratis
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Youth Match</span>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-slate-900">Términos</Link>
            <Link href="/privacidad" className="hover:text-slate-900">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
