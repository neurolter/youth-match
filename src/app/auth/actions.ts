"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext, siteOrigin } from "@/lib/auth";

export type AuthState = { error?: string; message?: string } | undefined;

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.";
  if (m.includes("user already registered")) return "Ya existe una cuenta con este correo. Intenta ingresar.";
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 8 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  if (m.includes("weak") || m.includes("pwned")) return "Esa contraseña es muy fácil de adivinar. Usa una más segura.";
  return "Algo salió mal. Inténtalo de nuevo.";
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("siguiente"));
  if (!email || !password) return { error: "Escribe tu correo y contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translateError(error.message) };
  redirect(next);
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!fullName || !email || !password) return { error: "Completa todos los campos." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (formData.get("terms") !== "on") return { error: "Debes aceptar los términos y la política de privacidad." };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?siguiente=/onboarding`,
    },
  });
  if (error) return { error: translateError(error.message) };
  if (data.session) redirect("/onboarding");
  return { message: `Te enviamos un correo a ${email}. Abre el enlace para activar tu cuenta.` };
}

export async function sendMagicLink(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(formData.get("siguiente"));
  if (!email) return { error: "Escribe tu correo." };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?siguiente=${encodeURIComponent(next)}` },
  });
  if (error) return { error: translateError(error.message) };
  return { message: `Listo. Te enviamos un enlace de acceso a ${email}.` };
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("siguiente"));
  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?siguiente=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/ingresar?error=google");
  redirect(data.url);
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Escribe tu correo." };
  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?siguiente=/actualizar-clave`,
  });
  if (error) return { error: translateError(error.message) };
  return { message: "Si existe una cuenta con ese correo, te llegará un enlace para crear una nueva contraseña." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: translateError(error.message) };
  redirect("/para-ti");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
