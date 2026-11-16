import type { Metadata } from "next";
import { PenLine, Sparkles } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Estudio de postulaciones" };

export default function StudioPage() {
  return (
    <div className="mx-auto max-w-2xl py-6 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg">
        <Sparkles className="size-7" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Estudio de postulaciones con IA</h1>
      <p className="mt-3 text-slate-500">
        Muy pronto podrás redactar tus ensayos de motivación, cartas y respuestas de postulación con ayuda de inteligencia
        artificial, adaptadas a cada convocatoria y a tu perfil.
      </p>
      <Card className="mt-8 space-y-3 p-6 text-left">
        {["Ensayo de motivación a partir de tu historia", "Respuestas adaptadas a los requisitos de cada beca", "Revisión de tono, ortografía y extensión"].map((f) => (
          <p key={f} className="flex items-center gap-3 text-sm text-slate-700">
            <PenLine className="size-4 text-brand-600" /> {f}
          </p>
        ))}
      </Card>
      <ButtonLink href="/descubrir" variant="secondary" className="mt-8">
        Mientras tanto, descubre oportunidades
      </ButtonLink>
    </div>
  );
}
