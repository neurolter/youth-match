// Capa de pagos independiente del proveedor.
// Para conectar una pasarela (PayPhone, Kushki, dLocal, Paddle, Lemon Squeezy…):
//   1. Crea src/lib/payments/<proveedor>.ts que implemente PaymentProvider.
//   2. Regístrala en PROVIDERS y define PAYMENTS_PROVIDER=<proveedor> en Vercel.
//   3. Configura el webhook del proveedor hacia /api/webhooks/pagos/<proveedor>.
// El resto de la app (planes, acceso premium, suscripciones) ya está listo.

export type CheckoutInput = {
  userId: string;
  email: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
};

/** Evento normalizado que cualquier pasarela debe producir. */
export type SubscriptionEvent = {
  eventId: string;
  type: "suscripcion_activada" | "suscripcion_renovada" | "pago_fallido" | "suscripcion_cancelada";
  userId: string;
  planId: string;
  providerCustomerId?: string;
  providerSubscriptionId: string;
  currentPeriodEnd?: string; // ISO
  raw: unknown;
};

export interface PaymentProvider {
  id: string;
  /** Devuelve la URL del checkout alojado por la pasarela. */
  createCheckout(input: CheckoutInput): Promise<{ url: string }>;
  /** Cancela al final del periodo actual. */
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  /** Verifica la firma y traduce el webhook a un evento normalizado (o null si no aplica). */
  parseWebhook(request: Request): Promise<SubscriptionEvent | null>;
}

const PROVIDERS: Record<string, () => Promise<PaymentProvider>> = {
  // ejemplo: payphone: () => import("./payphone").then((m) => m.payphone),
};

export function paymentsEnabled() {
  const id = process.env.PAYMENTS_PROVIDER;
  return Boolean(id && PROVIDERS[id]);
}

export async function getPaymentProvider(id = process.env.PAYMENTS_PROVIDER): Promise<PaymentProvider | null> {
  if (!id || !PROVIDERS[id]) return null;
  return PROVIDERS[id]();
}
