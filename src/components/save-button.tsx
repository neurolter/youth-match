"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import clsx from "clsx";
import { toggleSave } from "@/app/(app)/actions";

export function SaveButton({
  opportunityId,
  saved,
  loggedIn,
  variant = "icon",
}: {
  opportunityId: string;
  saved: boolean;
  loggedIn: boolean;
  variant?: "icon" | "full";
}) {
  const path = usePathname();
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [limit, setLimit] = useState(false);
  const [, start] = useTransition();

  const label = optimistic ? "Guardada" : "Guardar";
  const cls =
    variant === "icon"
      ? clsx(
          "grid size-11 place-items-center rounded-full transition active:scale-90",
          optimistic ? "bg-accent-500 text-white shadow-md shadow-accent-500/30" : "text-ink/45 hover:bg-navy/5 hover:text-navy",
        )
      : clsx(
          "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition active:translate-y-px",
          optimistic ? "bg-accent-500/10 text-accent-600 ring-1 ring-accent-500/30" : "bg-white text-ink ring-1 ring-navy/12 hover:ring-navy/25",
        );

  if (!loggedIn) {
    return (
      <Link href={`/ingresar?siguiente=${encodeURIComponent(path)}`} className={cls} aria-label="Guardar" title="Ingresa para guardar">
        <Bookmark className="size-[18px]" />
        {variant === "full" && "Guardar"}
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-pressed={optimistic}
        aria-label={label}
        title={label}
        className={cls}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          start(async () => {
            setOptimistic(!optimistic);
            const res = await toggleSave(opportunityId, path);
            if (res?.limit) setLimit(true);
          });
        }}
      >
        <Bookmark className={clsx("size-[18px]", optimistic && "fill-current")} />
        {variant === "full" && label}
      </button>
      {limit && (
        <div role="status" className="absolute right-0 top-12 z-20 w-64 rounded-2xl bg-navy p-3.5 text-xs leading-relaxed text-white shadow-xl">
          Llegaste al límite de 10 guardadas del plan Gratis.{" "}
          <Link href="/planes" className="font-bold text-accent-400 underline">
            Pásate a Premium
          </Link>
        </div>
      )}
    </div>
  );
}
