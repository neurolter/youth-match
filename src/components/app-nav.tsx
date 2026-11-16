"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Bookmark, ClipboardList, Compass, Sparkles, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/descubrir", label: "Descubrir", icon: Compass },
  { href: "/para-ti", label: "Para ti", icon: Sparkles },
  { href: "/guardadas", label: "Guardadas", icon: Bookmark },
  { href: "/postulaciones", label: "Postulaciones", icon: ClipboardList },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

export function DesktopNav() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
      {ITEMS.slice(0, 4).map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={clsx(
            "rounded-lg px-3 py-2 text-sm font-medium transition",
            path.startsWith(href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Navegación"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={clsx(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-brand-600" : "text-slate-500",
                )}
              >
                <Icon className={clsx("size-5", active && "stroke-[2.5]")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
