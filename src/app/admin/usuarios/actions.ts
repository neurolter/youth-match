"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type CodeState = { error?: string; ok?: string } | undefined;

export async function setPremium(formData: FormData) {
  await requireAdmin();
  const uid = String(formData.get("uid"));
  const days = Number(formData.get("days"));
  if (!uid || !Number.isFinite(days)) return;
  const supabase = await createClient();
  await supabase.rpc("admin_set_premium", { uid, days });
  revalidatePath("/admin/usuarios");
}

export async function createPromoCode(_: CodeState, formData: FormData): Promise<CodeState> {
  await requireAdmin();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const days = Number(formData.get("days"));
  const maxUses = String(formData.get("max_uses") ?? "").trim();
  const expires = String(formData.get("expires_at") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return { error: "El código debe tener de 3 a 40 letras, números, guiones o _." };
  if (!Number.isInteger(days) || days < 1 || days > 730) return { error: "Los días de Premium deben estar entre 1 y 730." };
  const max = maxUses ? Number(maxUses) : null;
  if (max !== null && (!Number.isInteger(max) || max < 1)) return { error: "El máximo de usos debe ser un número mayor a 0 (o déjalo vacío)." };

  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").insert({
    code,
    days,
    max_uses: max,
    expires_at: expires ? new Date(`${expires}T23:59:59-05:00`).toISOString() : null,
    note,
  });
  if (error) return { error: error.code === "23505" ? "Ese código ya existe." : "No se pudo crear el código." };
  revalidatePath("/admin/usuarios");
  return { ok: `Código ${code} creado.` };
}

export async function togglePromoCode(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const supabase = await createClient();
  await supabase.from("promo_codes").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/usuarios");
}
