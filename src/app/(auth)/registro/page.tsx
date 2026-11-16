import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function SignUpPage({ searchParams }: PageProps<"/registro">) {
  const sp = await searchParams;
  const fromCatalog = typeof sp.siguiente === "string";
  const next = safeNext(sp.siguiente);

  return (
    <>
      <h1 className="text-[2rem] font-bold leading-tight text-navy">
        {fromCatalog ? "Crea tu cuenta para ver las oportunidades" : "Crea tu cuenta"}
      </h1>
      <p className="mt-1.5 mb-6 text-sm text-ink/55">
        {fromCatalog
          ? "Es gratis. Accede a todas las becas, intercambios y congresos, elegidos para tu perfil."
          : "Gratis. En 2 minutos tendrás oportunidades recomendadas para ti."}
      </p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-ink/55">
        ¿Ya tienes cuenta?{" "}
        <Link href={fromCatalog ? `/ingresar?siguiente=${encodeURIComponent(next)}` : "/ingresar"} className="font-semibold text-brand-600 hover:underline">
          Ingresa
        </Link>
      </p>
    </>
  );
}
