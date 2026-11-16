"use client";

import Link from "next/link";
import clsx from "clsx";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Link2, Sparkles, TriangleAlert } from "lucide-react";
import { analyzeLink, saveOpportunity, type AnalyzeState, type SaveState } from "./actions";
import type { Draft } from "./types";
import { Alert, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { COUNTRIES, EDUCATION_LEVELS, FUNDING, INTERESTS, LANGUAGES, MODALITIES, OPPORTUNITY_TYPES, REGIONS } from "@/lib/constants";

function Submit({ children, variant = "primary", name, value }: { children: React.ReactNode; variant?: "primary" | "accent" | "secondary"; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} name={name} value={value} disabled={pending} className="w-full sm:w-auto">
      {pending ? "Un momento…" : children}
    </Button>
  );
}

export function LinkForm() {
  const [analysis, analyze] = useActionState<AnalyzeState, FormData>(analyzeLink, { status: "idle" });
  const [showText, setShowText] = useState(false);
  const askText = analysis.status === "error" && analysis.askText;

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <form action={analyze} className="space-y-4">
          <div>
            <Label htmlFor="url">Enlace de la convocatoria</Label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
              <Input id="url" name="url" type="url" required placeholder="https://www.oas.org/es/becas/…" className="pl-10" />
            </div>
            <p className="mt-2 text-xs text-ink/50">Pega el enlace de UNA oportunidad concreta (no la página principal del sitio).</p>
          </div>

          {(showText || askText) && (
            <div>
              <Label htmlFor="texto">Texto de la convocatoria (opcional)</Label>
              <Textarea
                id="texto"
                name="texto"
                rows={8}
                placeholder="Si el sitio no deja leer la página, ábrela en tu navegador, selecciona todo el texto (Ctrl+A / Cmd+A), cópialo y pégalo aquí."
              />
            </div>
          )}

          {analysis.status === "error" && (
            <Alert>
              <span className="flex gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {analysis.message}
              </span>
            </Alert>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!showText && !askText ? (
              <button type="button" onClick={() => setShowText(true)} className="text-left text-sm font-semibold text-brand-700 hover:underline">
                ¿El sitio bloquea la lectura? Pegar el texto
              </button>
            ) : (
              <span />
            )}
            <Submit variant="accent">
              <Sparkles className="size-4" /> Llenar con IA
            </Submit>
          </div>
        </form>
      </Card>

      {analysis.status === "ok" && (
        <DraftEditor
          key={analysis.draft.url + analysis.draft.title}
          initial={analysis.draft}
          notes={analysis.notes}
          closed={analysis.closed}
        />
      )}
    </div>
  );
}

const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
const countryOptions = Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1], "es"));

function DraftEditor({ initial, notes, closed }: { initial: Draft; notes: string | null; closed: boolean }) {
  const [d, setD] = useState<Draft>(initial);
  const [saved, save] = useActionState<SaveState, FormData>(saveOpportunity, { status: "idle" });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const toggle = (k: "education_levels" | "languages" | "areas", v: string) =>
    setD((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  useEffect(() => {
    if (saved.status === "ok") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [saved.status]);

  if (saved.status === "ok") {
    return (
      <Card className="flex flex-col items-center p-8 text-center">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <h2 className="mt-3 text-xl font-bold text-navy">{saved.published ? "¡Publicada!" : "Guardada en revisión"}</h2>
        <p className="mt-1 text-sm text-ink/60">
          {saved.published ? "Ya aparece en Descubrir y en las recomendaciones." : "La encuentras en la cola de revisión del panel."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={`/oportunidad/${saved.slug}`} className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white">
            Ver oportunidad
          </Link>
          <a href="/admin/agregar" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-navy ring-1 ring-navy/12">
            Agregar otra
          </a>
        </div>
      </Card>
    );
  }

  return (
    <form action={save} className="space-y-6">
      <input type="hidden" name="draft" value={JSON.stringify({ ...d, benefits: d.benefits, requirements: d.requirements })} />

      {closed && (
        <Alert>
          <span className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" /> Según el contenido, esta convocatoria ya cerró. Revisa la fecha antes de publicar.
          </span>
        </Alert>
      )}
      {notes && <Alert tone="brand">Notas de la IA: {notes}</Alert>}

      <Card className="space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-navy">Revisa y corrige</h2>
        <Field label="Título">
          <Input value={d.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Organización">
            <Input value={d.organization} onChange={(e) => set("organization", e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={d.type} onChange={(e) => set("type", e.target.value)}>
              {Object.entries(OPPORTUNITY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.emoji} {v.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Resumen (máx. 2 frases)">
          <Textarea rows={3} value={d.summary} onChange={(e) => set("summary", e.target.value)} maxLength={450} />
        </Field>
        <Field label="Link de postulación oficial">
          <Input type="url" value={d.application_url} onChange={(e) => set("application_url", e.target.value)} />
        </Field>
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-navy">Fechas</h2>
        <label className="flex items-center gap-3 text-sm font-semibold text-ink/80">
          <input type="checkbox" checked={d.rolling_deadline} onChange={(e) => set("rolling_deadline", e.target.checked)} className="size-5 accent-navy" />
          Convocatoria abierta todo el año (sin fecha límite)
        </label>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Fecha límite">
            <Input type="date" value={d.deadline} disabled={d.rolling_deadline} onChange={(e) => set("deadline", e.target.value)} />
          </Field>
          <Field label="Inicio del programa">
            <Input type="date" value={d.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </Field>
          <Field label="Fin del programa">
            <Input type="date" value={d.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-navy">Lugar y financiamiento</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Modalidad">
            <Select value={d.modality} onChange={(e) => set("modality", e.target.value)}>
              {Object.entries(MODALITIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Región">
            <Select value={d.region} onChange={(e) => set("region", e.target.value)}>
              <option value="">Sin definir</option>
              {Object.entries(REGIONS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Financiamiento">
            <Select value={d.funding} onChange={(e) => set("funding", e.target.value)}>
              {Object.entries(FUNDING).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Nota de costos (opcional)">
          <Input value={d.cost_note} onChange={(e) => set("cost_note", e.target.value)} placeholder="Ej.: cubre pasaje y alojamiento; la inscripción cuesta USD 50" />
        </Field>
        <CountryPicker label="País(es) de destino" value={d.destination_countries} onChange={(v) => set("destination_countries", v)} />
        <CountryPicker
          label="Nacionalidades que pueden postular (vacío = todas)"
          value={d.eligible_nationalities}
          onChange={(v) => set("eligible_nationalities", v)}
        />
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-navy">Para quién es</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Edad mínima">
            <Input type="number" min={0} max={120} value={d.min_age ?? ""} onChange={(e) => set("min_age", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
          <Field label="Edad máxima">
            <Input type="number" min={0} max={120} value={d.max_age ?? ""} onChange={(e) => set("max_age", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
        </div>
        <Chips label="Nivel de estudios" options={Object.entries(EDUCATION_LEVELS)} value={d.education_levels} onToggle={(v) => toggle("education_levels", v)} />
        <Chips label="Idiomas" options={Object.entries(LANGUAGES)} value={d.languages} onToggle={(v) => toggle("languages", v)} />
        <Chips label="Áreas (máx. 5)" options={INTERESTS.map((i) => [i, i])} value={d.areas} onToggle={(v) => toggle("areas", v)} />
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-navy">Beneficios y requisitos</h2>
        <Field label="Qué incluye (uno por línea)">
          <Textarea rows={5} defaultValue={d.benefits.join("\n")} onChange={(e) => set("benefits", lines(e.target.value))} />
        </Field>
        <Field label="Requisitos (uno por línea)">
          <Textarea rows={5} defaultValue={d.requirements.join("\n")} onChange={(e) => set("requirements", lines(e.target.value))} />
        </Field>
      </Card>

      {saved.status === "error" && <Alert>{saved.message}</Alert>}

      <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-[1.4rem] bg-white/95 p-3 shadow-xl ring-1 ring-navy/10 backdrop-blur sm:flex-row sm:justify-end">
        <Submit variant="secondary" name="accion" value="revision">
          Guardar en revisión
        </Submit>
        <Submit variant="accent" name="accion" value="publicar">
          Publicar ahora
        </Submit>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink/80">{label}</span>
      {children}
    </label>
  );
}

function Chips({ label, options, value, onToggle }: { label: string; options: [string, string][]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-ink/80">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(([k, v]) => (
          <button
            key={k}
            type="button"
            onClick={() => onToggle(k)}
            className={clsx(
              "rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition",
              value.includes(k) ? "bg-navy text-white ring-navy" : "bg-white text-ink/75 ring-navy/12 hover:ring-navy/25",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function CountryPicker({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-ink/80">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-sm font-semibold text-white">
            {COUNTRIES[c] ?? c}
            <button type="button" aria-label={`Quitar ${COUNTRIES[c] ?? c}`} onClick={() => onChange(value.filter((x) => x !== c))} className="text-white/70 hover:text-white">
              ×
            </button>
          </span>
        ))}
        <select
          value=""
          onChange={(e) => e.target.value && !value.includes(e.target.value) && onChange([...value, e.target.value])}
          className="h-10 rounded-full border border-navy/12 bg-white px-3 text-sm text-ink"
          aria-label={`Agregar a ${label}`}
        >
          <option value="">+ Agregar país</option>
          {countryOptions.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
