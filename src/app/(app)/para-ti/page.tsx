import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { OpportunityCard, OpportunityGrid } from "@/components/opportunity-card";
import { ButtonLink, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { hasPremium, requireOnboardedProfile } from "@/lib/auth";
import { CARD_COLUMNS, matchOpportunities, todayISO, type OpportunityCardData } from "@/lib/opportunities";
import { savedIds } from "@/lib/queries";

export const metadata: Metadata = { title: "Para ti" };

const FREE_LIMIT = 6;

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{firstName ? `Hola, ${firstName} 👋` : "Para ti"}</h1>
          <p className="mt-1 text-slate-500">Oportunidades elegidas según tu perfil, ordenadas por compatibilidad.</p>
        </div>
        <Link href="/perfil" className="text-sm font-medium text-brand-600 hover:underline">
          Ajustar mis preferencias
        </Link>
      </div>

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
            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div>
                <p className="text-lg font-semibold">Tienes {matches.length - FREE_LIMIT} coincidencias más esperándote</p>
                <p className="mt-1 text-sm text-brand-100">Con Premium ves todas tus recomendaciones y recibes alertas antes de que cierren.</p>
              </div>
              <ButtonLink href="/planes" variant="secondary" className="mt-4 shrink-0 sm:mt-0">
                Ver Premium
              </ButtonLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}
