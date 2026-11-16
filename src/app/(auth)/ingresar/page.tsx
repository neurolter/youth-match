import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Ingresar" };

const ERRORS: Record<string, string> = {
  enlace: "El enlace no es válido o ya expiró. Pide uno nuevo.",
  google: "No pudimos conectar con Google. Inténtalo de nuevo.",
};

export default async function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  const sp = await searchParams;
  const next = safeNext(sp.siguiente);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Bienvenido de nuevo</h1>
      <p className="mt-1.5 mb-6 text-sm text-slate-500">Ingresa para ver tus oportunidades recomendadas.</p>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <SignInForm next={next} />
      <p className="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-brand-600 hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </>
  );
}
