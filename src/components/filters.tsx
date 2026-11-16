"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import clsx from "clsx";
import { FUNDING, MODALITIES, OPPORTUNITY_TYPES, REGIONS } from "@/lib/constants";

const SELECTS = [
  { key: "region", label: "Región", options: REGIONS },
  { key: "financiamiento", label: "Financiamiento", options: { total: FUNDING.total, parcial: FUNDING.parcial, sin_financiamiento: FUNDING.sin_financiamiento } },
  { key: "modalidad", label: "Modalidad", options: MODALITIES },
  { key: "cierre", label: "Fecha límite", options: { "7": "Cierra en 7 días", "30": "Cierra en 30 días", "90": "Cierra en 3 meses" } },
] as const;

export function Filters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("pagina");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  // Búsqueda con pequeña espera mientras escribe
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => update("q", q.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeType = params.get("tipo");
  const activeCount = SELECTS.filter((s) => params.get(s.key)).length + (activeType ? 1 : 0) + (params.get("q") ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca becas, congresos, países, organizaciones…"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
            aria-label="Buscar oportunidades"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            "inline-flex h-12 items-center gap-2 rounded-xl border px-4 text-sm font-medium shadow-sm lg:hidden",
            open || activeCount ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700",
          )}
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{activeCount}</span>}
        </button>
      </div>

      {/* Tipos como chips desplazables */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]">
        <Chip active={!activeType} onClick={() => update("tipo", null)}>
          Todas
        </Chip>
        {Object.entries(OPPORTUNITY_TYPES)
          .filter(([k]) => k !== "otro")
          .map(([key, { label, emoji }]) => (
            <Chip key={key} active={activeType === key} onClick={() => update("tipo", activeType === key ? null : key)}>
              <span aria-hidden>{emoji}</span> {label}
            </Chip>
          ))}
      </div>

      <div className={clsx("grid gap-2 sm:grid-cols-2 lg:grid-cols-5", !open && "hidden lg:grid")}>
        {SELECTS.map((s) => (
          <select
            key={s.key}
            value={params.get(s.key) ?? ""}
            onChange={(e) => update(s.key, e.target.value || null)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
            aria-label={s.label}
          >
            <option value="">{s.label}: todas</option>
            {Object.entries(s.options).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ))}
        <select
          value={params.get("orden") ?? ""}
          onChange={(e) => update("orden", e.target.value || null)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
          aria-label="Ordenar"
        >
          <option value="">Ordenar: cierran primero</option>
          <option value="recientes">Más recientes</option>
        </select>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className={clsx(pending && "opacity-50")}>
          {total === 1 ? "1 oportunidad" : `${total.toLocaleString("es-EC")} oportunidades`}
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              start(() => router.replace(pathname, { scroll: false }));
            }}
            className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
          >
            <X className="size-3.5" /> Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
        active ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300",
      )}
    >
      {children}
    </button>
  );
}
