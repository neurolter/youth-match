import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function UpdatePasswordPage() {
  await requireUser();
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Crea una nueva contraseña</h1>
      <p className="mt-1.5 mb-6 text-sm text-slate-500">Usa al menos 8 caracteres.</p>
      <UpdatePasswordForm />
    </>
  );
}
