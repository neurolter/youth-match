import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p className="rounded-xl bg-amber-50 p-4 text-amber-800">
        Borrador inicial. Debe ser revisado por un abogado y adecuarse a la Ley Orgánica de Protección de Datos Personales (LOPDP)
        de Ecuador antes del lanzamiento público.
      </p>
      <h2>Datos que recopilamos</h2>
      <p>
        Nombre, correo, país, nacionalidad, año de nacimiento, nivel de estudios, idiomas e intereses. Los usamos únicamente para
        recomendarte oportunidades y para el funcionamiento de tu cuenta.
      </p>
      <h2>Datos que NO pedimos</h2>
      <p>No solicitamos números de pasaporte, documentos de identidad ni datos bancarios dentro de la plataforma.</p>
      <h2>Tus derechos</h2>
      <p>Puedes acceder, corregir o eliminar tus datos en cualquier momento escribiéndonos o desde tu perfil.</p>
    </>
  );
}
