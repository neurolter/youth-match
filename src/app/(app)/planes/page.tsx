import type { Metadata } from "next";
import { Check, Crown } from "lucide-react";
import clsx from "clsx";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getUser, hasPremium } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/payments";
import { RedeemForm } from "./redeem-form";

export const metadata: Metadata = { title: "Planes" };

function price(cents: number, currency: string) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export default async function PlansPage() {
  const supabase = await createClient();
  const [{ data: plans }, user, premium] = await Promise.all([
    supabase.from("plans").select("*").eq("active", true).order("sort_order"),
    getUser(),
    hasPremium(),
  ]);
  const canPay = paymentsEnabled();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <Badge tone="amber" className="mb-3">
          <Crown className="size-3" /> Youth Match Premium
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">Invierte en tu próxima experiencia internacional</h1>
        <p className="mx-auto mt-2 max-w-xl text-ink/55">
          Una beca o un congreso pueden cambiar tu carrera. Premium te ayuda a no perderte ninguna.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(plans ?? []).map((p) => {
          const featured = p.id === "premium_mensual";
          const current = (p.id === "gratis" && user && !premium) || (p.id !== "gratis" && premium);
          return (
            <Card key={p.id} className={clsx("flex flex-col p-6", featured && "ring-2 ring-brand-600")}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{p.name}</h2>
                {featured && <Badge tone="brand">Recomendado</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink/55">{p.description}</p>
              <p className="mt-5 text-3xl font-bold">
                {p.price_cents === 0 ? "Gratis" : price(p.price_cents, p.currency)}
                {p.billing_interval && (
                  <span className="text-base font-normal text-ink/55">/{p.billing_interval === "mes" ? "mes" : "año"}</span>
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-ink/80">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-600" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {current ? (
                  <span className="flex h-11 items-center justify-center rounded-xl bg-navy/5 text-sm font-semibold text-ink/70">Tu plan actual</span>
                ) : p.id === "gratis" ? (
                  <ButtonLink href={user ? "/descubrir" : "/registro"} variant="secondary" className="w-full">
                    {user ? "Explorar" : "Empezar gratis"}
                  </ButtonLink>
                ) : canPay ? (
                  <ButtonLink href={`/api/checkout?plan=${p.id}`} className="w-full">
                    Elegir {p.name}
                  </ButtonLink>
                ) : (
                  <span className="flex h-11 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">
                    Disponible muy pronto
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {user && !premium && <RedeemForm />}
      <p className="text-center text-xs text-ink/40">Precios en dólares estadounidenses. Puedes cancelar cuando quieras.</p>
    </div>
  );
}
