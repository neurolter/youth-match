"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function reviewOpportunity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  if (!["publicada", "rechazada"].includes(decision)) return;
  const supabase = await createClient();
  await supabase
    .from("opportunities")
    .update({
      status: decision,
      published_at: decision === "publicada" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/descubrir");
}

export async function toggleSource(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) === "activa" ? "pausada" : "activa";
  const supabase = await createClient();
  await supabase.from("sources").update({ status }).eq("id", id);
  revalidatePath("/admin");
}
