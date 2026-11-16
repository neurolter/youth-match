import type { Metadata } from "next";
import { MailX } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dejar de recibir correos", robots: { index: false } };

const KINDS: Record<string, string> = {
  fecha_limite: "los avisos de fecha límite",
  resumen_semanal: "el resumen semanal",
  nueva_en_tu_pais: "los avisos de nuevas oportunidades en tu país",
  todos: "todos los avisos por correo",
};

// Baja con un clic desde el enlace del correo (no requiere iniciar sesión).
export default async function UnsubscribePage({ searchParams }: PageProps<"/correos/baja">) {
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const kind = typeof sp.tipo === "string" && sp.tipo in KINDS ? sp.tipo : "todos";

  let ok = false;
  if (/^[0-9a-f-]{36}$/i.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("email_unsubscribe", { token, kind });
    ok = Boolean(data);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-4">
      <div className="max-w-md text-center">
        <Logo className="text-lg" />
        <div className="mx-auto mt-10 grid size-14 place-items-center rounded-2xl bg-navy text-white">
          <MailX className="size-6" />
        </div>
        {ok ? (
          <>
            <h1 className="mt-5 text-2xl font-bold text-navy">Listo, ya no recibirás {KINDS[kind]}</h1>
            <p className="mt-2 text-ink/60">Puedes volver a activarlos cuando quieras desde tu perfil.</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-bold text-navy">El enlace no es válido</h1>
            <p className="mt-2 text-ink/60">Puedes cambiar tus avisos por correo desde tu perfil.</p>
          </>
        )}
        <ButtonLink href="/perfil" className="mt-6">
          Ir a mis preferencias
        </ButtonLink>
      </div>
    </div>
  );
}
