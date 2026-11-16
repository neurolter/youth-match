"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Bookmark, ClipboardList, Compass, Sparkles, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/descubrir", label: "Descubrir", icon: Compass },
  { href: "/para-ti", label: "Para ti", icon: Sparkles },
  { href: "/guardadas", label: "Guardadas", icon: Bookmark },
  { href: "/postulaciones", label: "Postulaciones", short: "Postulo", icon: ClipboardList },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

export function DesktopNav() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 rounded-full bg-navy/[0.04] p-1 md:flex" aria-label="Principal">
      {ITEMS.slice(0, 4).map(({ href, label }) => {
        const active = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              active ? "bg-white text-navy shadow-sm ring-1 ring-navy/8" : "text-ink/60 hover:text-navy",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 md:hidden"
      aria-label="Navegación"
    >
      <ul className="grid grid-cols-5 rounded-[1.6rem] bg-navy/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(6,15,46,0.6)] ring-1 ring-white/10 backdrop-blur-xl">
        {ITEMS.map(({ href, label, short, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.2rem] text-[10.5px] font-semibold transition",
                  active ? "bg-white text-navy" : "text-white/65 active:bg-white/10",
                )}
              >
                <Icon className={clsx("size-5", active && "stroke-[2.4]")} />
                <span className="truncate">{short ?? label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
