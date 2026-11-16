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
          "grid size-9 place-items-center rounded-full transition",
          optimistic ? "bg-brand-600 text-white" : "bg-white/90 text-slate-600 ring-1 ring-slate-200 hover:text-brand-600",
        )
      : clsx(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
          optimistic ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50",
        );

  if (!loggedIn) {
    return (
      <Link href={`/ingresar?siguiente=${encodeURIComponent(path)}`} className={cls} aria-label="Guardar" title="Ingresa para guardar">
        <Bookmark className="size-4" />
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
        <Bookmark className={clsx("size-4", optimistic && "fill-current")} />
        {variant === "full" && label}
      </button>
      {limit && (
        <div className="absolute right-0 top-11 z-10 w-60 rounded-xl bg-slate-900 p-3 text-xs text-white shadow-lg">
          Llegaste al límite de 10 guardadas del plan Gratis.{" "}
          <Link href="/planes" className="font-semibold text-accent-400 underline">
            Pásate a Premium
          </Link>
        </div>
      )}
    </div>
  );
}
