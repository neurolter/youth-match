"use client";

import { useRef } from "react";
import { Menu, X } from "lucide-react";
import { buttonClass } from "@/components/ui";

/** Menú desplegable de la portada en celular y tablet (se cierra al elegir una opción). */
export function MobileMenu({
  items,
}: {
  items: readonly (readonly [string, string])[];
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={ref}
      className="group relative lg:hidden"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a"))
          ref.current?.removeAttribute("open");
      }}
    >
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/20 [&::-webkit-details-marker]:hidden">
        <Menu className="size-4 group-open:hidden" />
        <X className="hidden size-4 group-open:block" /> Menú
      </summary>
      <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl bg-white p-2 text-navy shadow-2xl shadow-black/30">
        {items.map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-navy/5"
          >
            {label}
          </a>
        ))}
        <div className="my-2 h-px bg-navy/10" />
        <a
          href="/ingresar"
          className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-navy/5"
        >
          Ingresar
        </a>
        <a
          href="/registro"
          className={buttonClass("primary", "md", "mt-1 w-full")}
        >
          Crear cuenta gratis
        </a>
      </div>
    </details>
  );
}
