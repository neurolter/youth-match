import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-[2rem] font-bold leading-tight text-navy">Crea tu cuenta</h1>
      <p className="mt-1.5 mb-6 text-sm text-ink/55">
        Gratis. En 2 minutos tendrás oportunidades recomendadas para ti.
      </p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-ink/55">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-semibold text-brand-600 hover:underline">
          Ingresa
        </Link>
      </p>
    </>
  );
}
