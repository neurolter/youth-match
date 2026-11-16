import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { Filters } from "@/components/filters";
import { OpportunityCard, OpportunityGrid } from "@/components/opportunity-card";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { PAGE_SIZE, savedIds, searchOpportunities } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Descubrir oportunidades",
  description: "Becas, intercambios, congresos y voluntariados internacionales abiertos ahora mismo.",
};

export default async function DiscoverPage({ searchParams }: PageProps<"/descubrir">) {
  const sp = await searchParams;
  const [{ items, total, page }, saved, user] = await Promise.all([searchOpportunities(sp), savedIds(), getUser()]);
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
        description="Becas, intercambios, congresos y más, abiertos ahora y actualizados cada día."
      />

      <Suspense>
        <Filters total={total} />
      </Suspense>

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
              <OpportunityCard key={o.id} o={o} saved={saved.has(o.id)} loggedIn={!!user} />
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
