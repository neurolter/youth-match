import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ResetPage() {
  return (
    <>
      <h1 className="text-[2rem] font-bold leading-tight text-navy">Recupera tu contraseña</h1>
      <p className="mt-1.5 mb-6 text-sm text-ink/55">Te enviaremos un enlace para crear una nueva.</p>
      <ResetRequestForm />
      <p className="mt-6 text-center text-sm text-ink/55">
        <Link href="/ingresar" className="font-semibold text-brand-600 hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </>
  );
}
