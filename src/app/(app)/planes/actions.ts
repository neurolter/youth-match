"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export type RedeemState = { error?: string; ok?: string } | undefined;

export async function redeemCode(_: RedeemState, formData: FormData): Promise<RedeemState> {
  const user = await getUser();
  if (!user) return { error: "Inicia sesión o crea tu cuenta para canjear el código." };
  const code = String(formData.get("code") ?? "").trim();
  if (code.length < 3) return { error: "Escribe tu código." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_promo_code", { input: code });
  if (error || !data) return { error: "No pudimos canjear el código. Inténtalo de nuevo." };
  if (!data.ok) return { error: data.message ?? "Código no válido." };

  const until = data.until
    ? new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Guayaquil" }).format(new Date(data.until))
    : null;
  revalidatePath("/", "layout");
  return { ok: `¡Listo! Tienes Premium${until ? ` hasta el ${until}` : ""}. Disfrútalo 🎉` };
}
