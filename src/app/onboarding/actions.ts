"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { COUNTRIES, EDUCATION_LEVELS, INTERESTS, LANGUAGES, OPPORTUNITY_TYPES, REGIONS } from "@/lib/constants";
import { emailEnabled, sendEmail } from "@/emails/send";
import { welcomeEmail } from "@/emails/templates";

export type ProfileState = { error?: string; message?: string } | undefined;

const pick = (fd: FormData, key: string, allowed: readonly string[]) =>
  fd.getAll(key).map(String).filter((v) => allowed.includes(v));

export async function saveProfile(_: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await getUser();
  if (!user) redirect("/ingresar");

  const fullName = String(fd.get("full_name") ?? "").trim().slice(0, 120);
  if (!fullName) return { error: "Escribe tu nombre." };
  const birthYear = Number(fd.get("birth_year")) || null;
  const education = String(fd.get("education_level") ?? "");
  const nationality = String(fd.get("nationality") ?? "");
  const country = String(fd.get("country") ?? "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      nationality: nationality in COUNTRIES ? nationality : null,
      country: country in COUNTRIES ? country : null,
      birth_year: birthYear,
      education_level: education in EDUCATION_LEVELS ? education : null,
      languages: pick(fd, "languages", Object.keys(LANGUAGES)),
      opportunity_types: pick(fd, "opportunity_types", Object.keys(OPPORTUNITY_TYPES)),
      regions: pick(fd, "regions", Object.keys(REGIONS)),
      interests: pick(fd, "interests", INTERESTS),
      only_funded: fd.get("only_funded") === "on",
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) return { error: "No pudimos guardar tu perfil. Inténtalo de nuevo." };

  // Preferencias de correo (solo desde la pantalla de Perfil)
  if (fd.get("mode") === "edit") {
    await supabase
      .from("profiles")
      .update({
        notify_deadlines: fd.get("notify_deadlines") === "on",
        notify_weekly: fd.get("notify_weekly") === "on",
        notify_country: fd.get("notify_country") === "on",
      })
      .eq("id", user.id);
  }

  // Correo de bienvenida: una sola vez, al terminar el onboarding.
  if (fd.get("mode") === "onboarding" && emailEnabled() && user.email) {
    const { data: p } = await supabase.from("profiles").select("welcome_sent_at").eq("id", user.id).maybeSingle();
    if (p && !p.welcome_sent_at) {
      try {
        await sendEmail(user.email, welcomeEmail({ name: fullName }));
        await supabase.from("profiles").update({ welcome_sent_at: new Date().toISOString() }).eq("id", user.id);
      } catch (e) {
        console.error("correo de bienvenida", e);
      }
    }
  }

  revalidatePath("/", "layout");
  if (fd.get("mode") === "onboarding") redirect("/para-ti");
  return { message: "Cambios guardados." };
}
