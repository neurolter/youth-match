import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Usuario actual (o null). Validado contra Supabase en cada request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

/** Perfil del usuario actual (o null si no hay sesión). */
export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

/** Exige sesión; si no hay, envía a /ingresar. */
export async function requireUser(next?: string) {
  const user = await getUser();
  if (!user) redirect(next ? `/ingresar?siguiente=${encodeURIComponent(next)}` : "/ingresar");
  return user;
}

/** Exige sesión y onboarding completo. */
export async function requireOnboardedProfile(next?: string) {
  await requireUser(next);
  const profile = await getProfile();
  if (!profile) redirect("/ingresar");
  if (!profile.onboarded) redirect("/onboarding");
  return profile;
}

export async function requireAdmin() {
  await requireUser("/admin");
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/descubrir");
  return profile;
}

/** ¿El usuario tiene plan premium activo? */
export const hasPremium = cache(async () => {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_has_premium");
  return Boolean(data);
});

/** URL base del sitio (para enlaces de correo y OAuth). */
export async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Solo permite redirecciones internas (evita open redirects). */
export function safeNext(next: unknown, fallback = "/para-ti") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
