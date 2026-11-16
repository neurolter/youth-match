import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que requieren sesión iniciada
const PROTECTED = [
  "/para-ti", "/guardadas", "/postulaciones", "/perfil", "/onboarding", "/admin", "/organizador",
  // El catálogo es solo para usuarios registrados (en la portada se ven 3 de muestra)
  "/descubrir", "/oportunidad",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresca la sesión. No pongas código entre createServerClient y getClaims.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    // Quien llega a explorar suele ser nuevo: se le invita a crear su cuenta.
    // El resto (enlaces de correos, páginas personales) va a "Ingresar".
    url.pathname = path.startsWith("/descubrir") ? "/registro" : "/ingresar";
    url.search = "";
    url.searchParams.set("siguiente", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
