import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos de uso" };

export default function TermsPage() {
  return (
    <>
      <h1>Términos de uso</h1>
      <p className="rounded-xl bg-amber-50 p-4 text-amber-800">
        Borrador inicial. Debe ser revisado por un abogado antes del lanzamiento público.
      </p>
      <h2>1. Qué es Youth Match</h2>
      <p>
        Youth Match reúne información pública sobre oportunidades internacionales (becas, intercambios, congresos, voluntariados y
        otras) publicadas por terceros. No somos los organizadores de esas oportunidades ni decidimos sobre su selección.
      </p>
      <h2>2. Exactitud de la información</h2>
      <p>
        Hacemos lo posible por mantener la información actualizada, pero las bases, requisitos y fechas oficiales son las que publica
        cada organizador. Antes de postular, verifica siempre la información en el sitio oficial enlazado.
      </p>
      <h2>3. Tu cuenta</h2>
      <p>Eres responsable de la información de tu perfil y de mantener segura tu contraseña.</p>
      <h2>4. Planes de pago</h2>
      <p>Los planes Premium se renuevan automáticamente según el periodo elegido y puedes cancelarlos en cualquier momento.</p>
    </>
  );
}
