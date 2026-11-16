import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" aria-label="Inicio">
          <Logo className="text-lg" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 lg:block">
        <div className="absolute -right-20 -top-20 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 size-80 rounded-full bg-accent-500/25 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/youth-match-logo-blanco.png" alt="Youth Match" width={890} height={732} className="w-56" />
          <div>
          <p className="text-3xl font-bold leading-tight">
            Tu próxima beca, intercambio o congreso internacional, sin pasar horas buscando.
          </p>
          <p className="mt-4 max-w-md text-brand-100">
            Reunimos oportunidades de fuentes oficiales, las mantenemos al día y te mostramos primero las que encajan contigo.
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
