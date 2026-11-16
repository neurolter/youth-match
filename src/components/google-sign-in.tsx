"use client";

// Inicio de sesión con el botón oficial de Google (Google Identity Services).
// Google habla directo con youthmatch.app, así que en la ventana de Google dice
// "Ir a youthmatch.app" (y no el dominio de Supabase). La sesión se crea en
// Supabase con el token que entrega Google (signInWithIdToken).
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui";

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "172293602639-mv4da37ngght16m6md6a6ftu2vuk9r6k.apps.googleusercontent.com";

type CredentialResponse = { credential: string };
type GoogleId = {
  initialize: (config: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
  prompt: () => void;
  cancel: () => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

export function GoogleSignIn({ next, oneTap = false, fallback }: { next: string; oneTap?: boolean; fallback: React.ReactNode }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed" | "signing">("loading");
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Si el script de Google no carga (bloqueador, red), se usa el botón anterior.
  useEffect(() => {
    const t = setTimeout(() => setState((s) => (s === "loading" ? "failed" : s)), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !window.google || !box.current) return;
    let cancelled = false;
    const google = window.google;
    const el = box.current;

    makeNonce().then(({ raw, hashed }) => {
      if (cancelled) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashed,
        context: "signin",
        ux_mode: "popup",
        itp_support: true,
        use_fedcm_for_prompt: true,
        callback: async ({ credential }: CredentialResponse) => {
          setState("signing");
          setError(null);
          const supabase = createClient();
          const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
          if (error) {
            console.error("google", error.message);
            setError("No pudimos iniciar sesión con Google. Inténtalo de nuevo.");
            setState("ready");
            return;
          }
          router.replace(next);
          router.refresh();
        },
      });
      google.accounts.id.renderButton(el, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "center",
        locale: "es",
        width: Math.min(400, Math.max(240, Math.round(el.getBoundingClientRect().width))),
      });
      if (oneTap) google.accounts.id.prompt();
      setState("ready");
    });

    return () => {
      cancelled = true;
      window.google?.accounts.id.cancel();
    };
  }, [scriptLoaded, next, oneTap, router]);

  return (
    <div className="space-y-2">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} onError={() => setState("failed")} />
      {state === "failed" ? (
        fallback
      ) : (
        <div className="relative flex min-h-11 justify-center">
          <div ref={box} className="w-full max-w-[400px] [&>div]:mx-auto" />
          {(state === "loading" || state === "signing") && (
            <div className="absolute inset-0 grid place-items-center rounded-full bg-white text-sm font-semibold text-ink/55 ring-1 ring-navy/12">
              {state === "signing" ? "Entrando…" : "Cargando Google…"}
            </div>
          )}
        </div>
      )}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
