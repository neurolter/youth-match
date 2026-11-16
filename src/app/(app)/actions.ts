"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { APPLICATION_STATUS, type ApplicationStatus } from "@/lib/constants";

const FREE_SAVE_LIMIT = 10;

export async function toggleSave(opportunityId: string, path: string) {
  const user = await getUser();
  if (!user) redirect(`/ingresar?siguiente=${encodeURIComponent(path)}`);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id")
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_opportunities").delete().eq("user_id", user.id).eq("opportunity_id", opportunityId);
    revalidatePath(path);
    return { saved: false };
  }

  const { data: premium } = await supabase.rpc("user_has_premium");
  if (!premium) {
    const { count } = await supabase
      .from("saved_opportunities")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= FREE_SAVE_LIMIT) {
      return { saved: false, limit: true };
    }
  }

  await supabase.from("saved_opportunities").insert({ user_id: user.id, opportunity_id: opportunityId });
  revalidatePath(path);
  return { saved: true };
}

export async function trackApplication(opportunityId: string, path: string) {
  const user = await getUser();
  if (!user) redirect(`/ingresar?siguiente=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  await supabase
    .from("applications")
    .upsert({ user_id: user.id, opportunity_id: opportunityId }, { onConflict: "user_id,opportunity_id", ignoreDuplicates: true });
  revalidatePath(path);
  revalidatePath("/postulaciones");
}

export async function updateApplication(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/ingresar");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as ApplicationStatus;
  const notes = formData.get("notes");
  if (!(status in APPLICATION_STATUS)) return;

  const supabase = await createClient();
  await supabase
    .from("applications")
    .update({ status, ...(notes !== null ? { notes: String(notes).slice(0, 2000) } : {}) })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/postulaciones");
}

export async function removeApplication(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/ingresar");
  const supabase = await createClient();
  await supabase.from("applications").delete().eq("id", String(formData.get("id"))).eq("user_id", user.id);
  revalidatePath("/postulaciones");
}
