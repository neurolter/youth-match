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
  { key: "orden", label: "Ordenar", options: { recientes: "Más recientes" }, empty: "Cierran primero" },
] as const;

const selectCls =
  "h-12 w-full appearance-none rounded-2xl border border-navy/12 bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%230b1f52%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pl-4 pr-9 text-sm font-medium text-ink focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

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

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => update("q", q.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Bloquea el scroll del fondo con el panel abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const activeType = params.get("tipo");
  const activeSelects = SELECTS.filter((s) => s.key !== "orden" && params.get(s.key)).length;
  const activeCount = activeSelects + (activeType ? 1 : 0) + (params.get("q") ? 1 : 0);

  const selects = SELECTS.map((s) => (
    <label key={s.key} className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45 lg:sr-only">{s.label}</span>
      <select value={params.get(s.key) ?? ""} onChange={(e) => update(s.key, e.target.value || null)} className={selectCls} aria-label={s.label}>
        <option value="">{"empty" in s ? s.empty : `${s.label}: todas`}</option>
        {Object.entries(s.options).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  ));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca becas, países, organizaciones…"
            enterKeyHint="search"
            className="h-14 w-full rounded-full border border-navy/10 bg-white pl-12 pr-11 text-[15px] shadow-[0_8px_30px_-18px_rgba(11,31,82,0.5)] placeholder:text-ink/35 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
            aria-label="Buscar oportunidades"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Borrar búsqueda" className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink/40 hover:bg-navy/5">
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={clsx(
            "relative grid size-14 shrink-0 place-items-center rounded-full border shadow-[0_8px_30px_-18px_rgba(11,31,82,0.5)] lg:hidden",
            activeSelects ? "border-navy bg-navy text-white" : "border-navy/10 bg-white text-navy",
          )}
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal className="size-5" />
          {activeSelects > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-accent-500 text-[11px] font-bold text-white">
              {activeSelects}
            </span>
          )}
        </button>
      </div>

      {/* Tipos: chips desplazables en móvil */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
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

      {/* Escritorio: filtros en línea */}
      <div className="hidden gap-2 lg:grid lg:grid-cols-5">{selects}</div>

      {/* Móvil y tablet: panel inferior */}
      <div className={clsx("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div
          className={clsx("absolute inset-0 bg-brand-950/50 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-label="Filtros"
          className={clsx(
            "absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[2rem] bg-paper px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-navy/15" />
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-navy">Filtros</h2>
            <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full bg-white ring-1 ring-navy/10" aria-label="Cerrar">
              <X className="size-5" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{selects}</div>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                SELECTS.forEach((s) => next.delete(s.key));
                start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
              }}
              className="h-13 flex-1 rounded-full bg-white font-semibold text-ink ring-1 ring-navy/12"
            >
              Limpiar
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-13 flex-[2] rounded-full bg-navy font-semibold text-white">
              Ver {total.toLocaleString("es-EC")} resultados
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={clsx("font-semibold text-ink/55 transition-opacity", pending && "opacity-40")}>
          {total === 1 ? "1 oportunidad abierta" : `${total.toLocaleString("es-EC")} oportunidades abiertas`}
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              start(() => router.replace(pathname, { scroll: false }));
            }}
            className="inline-flex items-center gap-1 font-semibold text-accent-600 hover:underline"
          >
            <X className="size-3.5" /> Limpiar todo
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
      aria-pressed={active}
      className={clsx(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-95",
        active ? "bg-navy text-white shadow-md shadow-navy/20" : "bg-white text-ink/75 ring-1 ring-navy/10 hover:ring-navy/25",
      )}
    >
      {children}
    </button>
  );
}
