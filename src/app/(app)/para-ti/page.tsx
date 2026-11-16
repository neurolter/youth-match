import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { OpportunityCard, OpportunityGrid } from "@/components/opportunity-card";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { hasPremium, requireOnboardedProfile } from "@/lib/auth";
import { CARD_COLUMNS, matchOpportunities, todayISO, type OpportunityCardData } from "@/lib/opportunities";
import { savedIds } from "@/lib/queries";

export const metadata: Metadata = { title: "Para ti" };

const FREE_LIMIT = 10; // plan gratis: 10 recomendaciones por semana

export default async function ForYouPage() {
  const profile = await requireOnboardedProfile("/para-ti");
  const supabase = await createClient();
  const today = todayISO();

  const [{ data }, saved, premium] = await Promise.all([
    supabase
      .from("opportunities")
      .select(CARD_COLUMNS)
      .eq("status", "publicada")
      .or(`deadline.gte.${today},deadline.is.null,rolling_deadline.eq.true`)
      .limit(500),
    savedIds(),
    hasPremium(),
  ]);

  const matches = matchOpportunities(profile, (data ?? []) as OpportunityCardData[]);
  const visible = premium ? matches.slice(0, 60) : matches.slice(0, FREE_LIMIT);
  const firstName = profile.full_name?.split(" ")[0];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Elegidas para ti"
        title={firstName ? <>Hola, {firstName} <span className="inline-block animate-[float_3s_ease-in-out_infinite]">👋</span></> : "Para ti"}
        description="Ordenadas según qué tan bien encajan con tu perfil."
        action={
          <Link href="/perfil" className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-navy ring-1 ring-navy/12 hover:ring-navy/25">
            Ajustar preferencias
          </Link>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title="Aún no hay coincidencias para tu perfil"
          description="Cada día llegan oportunidades nuevas. Mientras tanto, explora todo el catálogo o amplía tus preferencias."
          action={<ButtonLink href="/descubrir">Explorar todas</ButtonLink>}
        />
      ) : (
        <>
          <OpportunityGrid>
            {visible.map((m) => (
              <OpportunityCard key={m.opportunity.id} o={m.opportunity} saved={saved.has(m.opportunity.id)} loggedIn reasons={m.reasons} />
            ))}
          </OpportunityGrid>
          {!premium && matches.length > FREE_LIMIT && (
            <div className="bg-globe grain relative overflow-hidden rounded-[1.6rem] p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
              <div className="relative">
                <p className="font-display text-2xl font-bold">
                  Tienes <span className="text-gradient-accent">{matches.length - FREE_LIMIT} coincidencias más</span> esperándote
                </p>
                <p className="mt-1.5 text-sm text-white/70">Con Premium ves todas tus recomendaciones cada semana y guardas sin límite.</p>
              </div>
              <ButtonLink href="/planes" variant="accent" className="relative mt-5 shrink-0 sm:mt-0">
                Ver Premium
              </ButtonLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}
