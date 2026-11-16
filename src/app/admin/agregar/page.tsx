import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, Logo, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { LinkForm } from "./link-form";

export const metadata: Metadata = { title: "Agregar por enlace" };

// Leer la página + la IA pueden tardar; se da margen a la función en Vercel.
export const maxDuration = 60;

export default async function AddByLinkPage() {
  await requireAdmin();
  return (
    <div className="bg-dots min-h-dvh">
      <header className="border-b border-navy/[0.06] bg-paper/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge tone="dark">Admin</Badge>
          </div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-navy">
            <ArrowLeft className="size-4" /> Panel
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-7 px-4 py-8 pb-24 sm:px-6">
        <PageHeader
          eyebrow="Carga manual"
          title="Agregar por enlace"
          description="Pega el link de una convocatoria que encontraste. La IA llena los datos en español; tú los revisas y decides si publicar."
        />
        <LinkForm />
      </main>
    </div>
  );
}
