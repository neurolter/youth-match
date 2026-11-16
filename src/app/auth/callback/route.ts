import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

// Recibe el regreso de Google, enlaces mágicos, confirmación de correo y
// recuperación de contraseña. Soporta tanto `code` (PKCE) como `token_hash`.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("siguiente") ?? url.searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/ingresar?error=enlace", url.origin));
  }

  // Si aún no completa su perfil, va al onboarding
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user && next !== "/actualizar-clave") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profile && !profile.onboarded) {
      return NextResponse.redirect(new URL("/onboarding", url.origin));
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
