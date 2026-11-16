import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/server";

const STATUS: Record<string, string> = {
  suscripcion_activada: "activa",
  suscripcion_renovada: "activa",
  pago_fallido: "pago_pendiente",
  suscripcion_cancelada: "cancelada",
};

// Webhook genérico de pagos: /api/webhooks/pagos/<proveedor>
export async function POST(request: Request, ctx: RouteContext<"/api/webhooks/pagos/[provider]">) {
  const { provider: providerId } = await ctx.params;
  const provider = await getPaymentProvider(providerId);
  if (!provider) return NextResponse.json({ error: "Pasarela no configurada" }, { status: 501 });

  let event;
  try {
    event = await provider.parseWebhook(request);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }
  if (!event) return NextResponse.json({ ok: true });

  const db = createAdminClient();

  // Idempotencia: cada evento se procesa una sola vez
  const { error: dup } = await db
    .from("payment_events")
    .insert({ provider: provider.id, event_id: event.eventId, type: event.type, payload: event.raw as never });
  if (dup) return NextResponse.json({ ok: true, duplicado: true });

  await db.from("subscriptions").upsert(
    {
      user_id: event.userId,
      plan_id: event.planId,
      status: STATUS[event.type],
      provider: provider.id,
      provider_customer_id: event.providerCustomerId ?? null,
      provider_subscription_id: event.providerSubscriptionId,
      current_period_end: event.currentPeriodEnd ?? null,
    },
    { onConflict: "provider_subscription_id" },
  );

  await db
    .from("payment_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider", provider.id)
    .eq("event_id", event.eventId);

  return NextResponse.json({ ok: true });
}
