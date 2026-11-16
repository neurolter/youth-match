import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { OpportunityCard, OpportunityGrid } from "@/components/opportunity-card";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireUser } from "@/lib/auth";
import { CARD_COLUMNS, type OpportunityCardData } from "@/lib/opportunities";

export const metadata: Metadata = { title: "Guardadas" };

export default async function SavedPage() {
  const user = await requireUser("/guardadas");
  const supabase = await createClient();
  const profile = await getProfile();
  const { data } = await supabase
    .from("saved_opportunities")
    .select(`created_at, opportunity:opportunities(${CARD_COLUMNS})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (data ?? [])
    .map((r) => r.opportunity as unknown as OpportunityCardData | null)
    .filter((o): o is OpportunityCardData => !!o);

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Tu lista" title="Guardadas" description="Las oportunidades que marcaste para revisar después." />
      {items.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-6" />}
          title="Todavía no guardas ninguna oportunidad"
          description="Toca el ícono de marcador en cualquier oportunidad para tenerla a mano aquí."
          action={<ButtonLink href="/descubrir">Descubrir oportunidades</ButtonLink>}
        />
      ) : (
        <OpportunityGrid>
          {items.map((o) => (
            <OpportunityCard key={o.id} o={o} saved loggedIn nationality={profile?.nationality} />
          ))}
        </OpportunityGrid>
      )}
    </div>
  );
}
