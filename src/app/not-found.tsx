import { Compass } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <Logo className="text-lg" />
        <div className="mx-auto mt-10 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Compass className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">No encontramos esta página</h1>
        <p className="mt-2 text-ink/55">Puede que la oportunidad ya no exista o que el enlace esté mal escrito.</p>
        <ButtonLink href="/descubrir" className="mt-6">
          Ir a descubrir
        </ButtonLink>
      </div>
    </div>
  );
}
