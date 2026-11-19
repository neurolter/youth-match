import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, BellRing, ClipboardList, Globe2, ShieldCheck, Sparkles, TimerOff } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/site";
import { FounderSection } from "@/components/founder-section";
import { OpportunityCard } from "@/components/opportunity-card";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { CARD_COLUMNS, daysLeft, todayISO, type OpportunityCardData } from "@/lib/opportunities";
import { OPPORTUNITY_TYPES } from "@/lib/constants";

// Destinos del pase de abordar de la portada
const DESTINATIONS = [
  ["MAD", "Madrid, España"],
  ["TYO", "Tokio, Japón"],
  ["BER", "Berlín, Alemania"],
  ["NYC", "Nueva York, EE. UU."],
  ["SYD", "Sídney, Australia"],
] as const;

export default async function Home() {
  const user = await getUser();
  if (user) redirect("/para-ti");

  const supabase = await createClient();
  const open = `deadline.gte.${todayISO()},deadline.is.null,rolling_deadline.eq.true`;
  const [{ data }, { count }] = await Promise.all([
    // Destacadas: abiertas a cualquier nacionalidad y que no sean microvoluntariados en línea
    supabase
      .from("opportunities")
      .select(CARD_COLUMNS)
      .eq("status", "publicada")
      .or(open)
      .filter("eligible_nationalities", "eq", "{}")
      .or("type.neq.voluntariado,modality.neq.virtual")
      .order("trust_score", { ascending: false })
      .limit(30),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "publicada").or(open),
  ]);
  // Primero las 100 % financiadas y con fecha límite confirmada; luego por confianza
  const rank = (o: OpportunityCardData) => (o.funding === "total" ? 2 : 0) + (o.deadline || o.rolling_deadline ? 1 : 0);
  const featured = ((data ?? []) as OpportunityCardData[])
    .filter((o) => (daysLeft(o.deadline) ?? 99) >= 7) // nada que cierre en menos de una semana
    .sort((a, b) => rank(b) - rank(a) || b.trust_score - a.trust_score)
    .slice(0, 3);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ------------------------------------------------------------- HERO */}
      <section className="bg-globe grain relative overflow-hidden text-white">
        <header className="relative z-10 mx-auto flex h-18 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo variant="white" />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/registro?siguiente=%2Fdescubrir" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/75 hover:text-white sm:block">
              Explorar
            </Link>
            <Link href="/planes" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/75 hover:text-white sm:block">
              Planes
            </Link>
            <Link href="/ingresar" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/85 hover:text-white sm:block">
              Ingresar
            </Link>
            <ButtonLink href="/ingresar" variant="light" size="sm" className="sm:hidden">
              Ingresar
            </ButtonLink>
            <span className="hidden sm:block">
              <ButtonLink href="/registro" variant="light" size="sm">
                Crear cuenta
              </ButtonLink>
            </span>
          </nav>
        </header>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
          <div className="stagger">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur">
              <Sparkles className="size-3.5 text-accent-400" /> Hecho para jóvenes de Latinoamérica
            </span>
            <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[0.98] sm:text-7xl">
              Tu próxima experiencia <span className="text-gradient-accent">internacional</span> te está buscando.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              Becas, intercambios, congresos y voluntariados de fuentes oficiales. Reunidos en un solo lugar y elegidos para tu perfil.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/registro" variant="accent" size="lg">
                Empieza gratis <ArrowRight className="size-4" />
              </ButtonLink>
              <Link
                href="/registro?siguiente=%2Fdescubrir"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full px-7 font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/10"
              >
                Ver oportunidades{count ? ` (${count})` : ""}
              </Link>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[
                [String(count ?? 0), "abiertas ahora"],
                ["100 %", "en español"],
                ["Gratis", "para empezar"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-bold">{n}</dt>
                  <dd className="mt-0.5 text-xs text-white/55">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Pase de abordar ilustrativo */}
          <div className="relative mx-auto w-full max-w-sm lg:max-w-md" aria-hidden>
            <div
              className="animate-float relative rounded-[1.6rem] bg-paper text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]"
              style={{ ["--ticket-bg" as string]: "var(--color-brand-950)" }}
            >
              <div className="h-2 rounded-t-[1.6rem] bg-gradient-accent" />
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">Pase de oportunidad</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">✓ Para tu perfil</span>
                </div>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-display text-4xl font-extrabold text-navy">UIO</p>
                    <p className="text-xs font-medium text-ink/50">Quito, Ecuador</p>
                  </div>
                  <svg viewBox="0 0 120 30" className="mb-3 h-8 flex-1 text-accent-500">
                    <path d="M2 24 C 40 2, 80 2, 116 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 6" className="animate-dash" style={{ strokeDashoffset: 120 }} />
                    <circle cx="116" cy="20" r="3.5" fill="currentColor" />
                  </svg>
                  <div className="h-14 overflow-hidden text-right">
                    <div className="animate-ticker">
                      {[...DESTINATIONS, DESTINATIONS[0]].map(([code, city], i) => (
                        <div key={i} className="h-14">
                          <p className="font-display text-4xl font-extrabold leading-10 text-navy">{code}</p>
                          <p className="text-xs leading-4 font-medium text-ink/50">{city}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-6 font-display text-xl font-bold leading-snug text-navy">De Ecuador al mundo</p>
                <p className="mt-1 text-sm text-ink/55">Pasajero: tú</p>
              </div>
              <div className="ticket-perf grid grid-cols-3 gap-3 px-6 pb-6 pt-4">
                {[
                  ["Tipo", "🎓 Beca"],
                  ["Financia", "100 % todo incluido"],
                  ["Embarque", "Postula ya"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">{l}</p>
                    <p className="mt-1 text-sm font-bold text-navy">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* ---------------------------------------------------------- TIPOS */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-500">¿Qué buscas?</p>
          <h2 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">Elige tu próximo destino</h2>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(OPPORTUNITY_TYPES)
              .filter(([k]) => k !== "otro")
              .map(([k, t]) => (
                <Link
                  key={k}
                  href={`/registro?siguiente=${encodeURIComponent(`/descubrir?tipo=${k}`)}`}
                  className="group flex items-center justify-between gap-2 rounded-2xl bg-white p-4 ring-1 ring-navy/8 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy/10 hover:ring-navy/15"
                >
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-navy">
                    <span className="text-xl" aria-hidden>{t.emoji}</span> {t.label}
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-ink/30 transition group-hover:text-accent-500" />
                </Link>
              ))}
          </div>
        </section>

        {featured.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-bold text-navy sm:text-4xl">Abiertas ahora</h2>
              <Link href="/registro?siguiente=%2Fdescubrir" className="shrink-0 text-sm font-bold text-accent-600 hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="stagger grid gap-5 md:grid-cols-3">
              {featured.map((o) => (
                <OpportunityCard key={o.id} o={o} href={`/registro?siguiente=${encodeURIComponent(`/oportunidad/${o.slug}`)}`} />
              ))}
            </div>
          </section>
        )}

        {/* ------------------------------------------------- CÓMO FUNCIONA */}
        <section className="border-y border-navy/[0.06] bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-500">Cómo funciona</p>
              <h2 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">Nosotros buscamos. Tú postulas.</h2>
            </div>
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Globe2, title: "Reunimos todo", text: "Revisamos becas, embajadas, organismos internacionales y fundaciones, y traemos cada convocatoria por separado." },
                { icon: TimerOff, title: "Nada vencido", text: "Cuando una convocatoria cierra, desaparece sola. Solo ves lo que todavía puedes postular." },
                { icon: Sparkles, title: "Hecho a tu medida", text: "Con tu perfil te mostramos primero lo que encaja contigo: edad, nacionalidad, estudios e intereses." },
                { icon: ShieldCheck, title: "Fuentes confiables", text: "Priorizamos fuentes oficiales y revisamos las demás. Siempre te llevamos al sitio oficial para postular." },
                { icon: ClipboardList, title: "Organiza tu camino", text: "Guarda oportunidades y sigue tu avance: preparando, enviada y resultado." },
                { icon: BellRing, title: "Nunca llegues tarde", text: "Te avisamos por correo antes de que cierre lo que guardaste." },
              ].map(({ icon: Icon, title, text }, i) => (
                <div key={title} className="relative pl-15">
                  <div className="absolute left-0 top-0 grid size-11 place-items-center rounded-2xl bg-navy text-white">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-display text-xs font-bold text-accent-500">0{i + 1}</span>
                  <h3 className="text-lg font-bold text-navy">{title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink/60">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- FUNDADOR */}
        <FounderSection />

        {/* ------------------------------------------------------------ CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="bg-globe grain relative overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white sm:px-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/youth-match-logo-blanco.png" alt="Youth Match" width={890} height={732} className="relative mx-auto mb-7 w-36" />
            <h2 className="relative text-3xl font-bold sm:text-5xl">El mundo te está esperando</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/70">Crea tu cuenta gratis y recibe tus primeras recomendaciones en 2 minutos.</p>
            <ButtonLink href="/registro" variant="accent" size="lg" className="relative mt-8">
              Crear mi cuenta gratis <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-navy/[0.06] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-ink/55 sm:flex-row sm:px-6">
          <Logo size={26} className="text-sm" />
          <div className="flex gap-5">
            <Link href="/registro?siguiente=%2Fdescubrir" className="hover:text-navy">Explorar</Link>
            <Link href="/terminos" className="hover:text-navy">Términos</Link>
            <Link href="/privacidad" className="hover:text-navy">Privacidad</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-navy">Contacto</a>
          </div>
          <span>© {new Date().getFullYear()} Youth Match</span>
        </div>
      </footer>
    </div>
  );
}
