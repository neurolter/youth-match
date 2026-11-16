import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Globe2, Lock } from "lucide-react";
import { Filters } from "@/components/filters";
import { OpportunityCard, OpportunityGrid } from "@/components/opportunity-card";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { getProfile, getUser } from "@/lib/auth";
import { PAGE_SIZE, savedIds, searchOpportunities } from "@/lib/queries";
import { countryName } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Descubrir oportunidades",
  description: "Becas, intercambios, congresos y voluntariados internacionales abiertos ahora mismo.",
};

export default async function DiscoverPage({ searchParams }: PageProps<"/descubrir">) {
  const sp = await searchParams;
  const [profile, saved, user] = await Promise.all([getProfile(), savedIds(), getUser()]);
  const nationality = profile?.nationality ?? null;
  const { items, total, page, hiddenNotEligible, onlineVolunteering, showAll } = await searchOpportunities(sp, nationality);

  const withParam = (key: string, value: string | null) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "pagina" && k !== key) next.set(k, v);
    if (value) next.set(key, value);
    const s = next.toString();
    return s ? `/descubrir?${s}` : "/descubrir";
  };
  const hasFilters = Object.keys(sp).some((k) => k !== "pagina");
  const pages = Math.ceil(total / PAGE_SIZE);

  const pageHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "pagina") next.set(k, v);
    if (p > 1) next.set("pagina", String(p));
    const s = next.toString();
    return s ? `/descubrir?${s}` : "/descubrir";
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Explora el mundo"
        title="Descubrir"
        description="Becas, intercambios, congresos y más, con convocatoria abierta ahora."
      />

      <Suspense>
        <Filters total={total} />
      </Suspense>

      {(hiddenNotEligible > 0 || (showAll && nationality)) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-white px-4 py-3 text-sm text-ink/65 ring-1 ring-navy/8">
          <Lock className="size-4 text-ink/40" />
          {showAll ? (
            <>
              Estás viendo también las que no aceptan tu nacionalidad.
              <Link href={withParam("todas", null)} className="font-semibold text-brand-700 hover:underline">
                Ver solo las mías
              </Link>
            </>
          ) : (
            <>
              Ocultamos {hiddenNotEligible} {hiddenNotEligible === 1 ? "oportunidad que no acepta" : "oportunidades que no aceptan"} postulantes de{" "}
              {countryName(nationality!)}.
              <Link href={withParam("todas", "1")} className="font-semibold text-brand-700 hover:underline">
                Mostrarlas igual
              </Link>
            </>
          )}
        </p>
      )}

      {onlineVolunteering > 0 && (
        <Link
          href={`/descubrir?tipo=voluntariado&modalidad=virtual${showAll ? "&todas=1" : ""}`}
          className="group flex items-center gap-4 rounded-[1.4rem] bg-white p-4 ring-1 ring-navy/8 transition hover:ring-navy/20 sm:p-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Globe2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-navy">
              {onlineVolunteering} {onlineVolunteering === 1 ? "voluntariado en línea" : "voluntariados en línea"} con organizaciones internacionales
            </span>
            <span className="block text-sm text-ink/55">Tareas cortas desde tu casa. Suman experiencia y contactos para tu CV.</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-ink/40 transition group-hover:translate-x-0.5 group-hover:text-navy" />
        </Link>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<Compass className="size-6" />}
          title={hasFilters ? "No encontramos oportunidades con esos filtros" : "Estamos cargando las primeras oportunidades"}
          description={
            hasFilters
              ? "Prueba quitando algún filtro o buscando con otras palabras."
              : "Nuestro importador está trayendo becas, congresos e intercambios de fuentes oficiales. Vuelve pronto."
          }
          action={
            hasFilters ? (
              <ButtonLink href="/descubrir" variant="secondary">
                Ver todas
              </ButtonLink>
            ) : !user ? (
              <ButtonLink href="/registro">Crear cuenta y recibir avisos</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <OpportunityGrid>
            {items.map((o) => (
              <OpportunityCard key={o.id} o={o} saved={saved.has(o.id)} loggedIn={!!user} nationality={nationality} />
            ))}
          </OpportunityGrid>
          {pages > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Paginación">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-navy ring-1 ring-navy/12 hover:ring-navy/25">
                  ← Anterior
                </Link>
              )}
              <span className="text-sm font-medium text-ink/55">
                Página {page} de {pages}
              </span>
              {page < pages && (
                <Link href={pageHref(page + 1)} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-navy ring-1 ring-navy/12 hover:ring-navy/25">
                  Siguiente →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
