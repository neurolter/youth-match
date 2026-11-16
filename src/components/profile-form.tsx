"use client";

import clsx from "clsx";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { saveProfile, type ProfileState } from "@/app/onboarding/actions";
import { Alert, Button, Input, Label, Select } from "@/components/ui";
import { COUNTRIES, EDUCATION_LEVELS, INTERESTS, LANGUAGES, OPPORTUNITY_TYPES, REGIONS } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/types";

const countryOptions = Object.entries(COUNTRIES)
  .filter(([c]) => c !== "GLOBAL")
  .sort((a, b) => a[1].localeCompare(b[1], "es"));

function Chips({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: [string, string][];
  defaultValue: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => {
        const on = selected.includes(value);
        return (
          <label
            key={value}
            className={clsx(
              "inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition active:scale-95",
              on ? "bg-navy text-white ring-navy" : "bg-white text-ink/80 ring-navy/10 hover:ring-navy/20",
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={value}
              checked={on}
              onChange={() => setSelected((s) => (on ? s.filter((v) => v !== value) : [...s, value]))}
              className="sr-only"
            />
            {on && <Check className="size-3.5" />}
            {label}
          </label>
        );
      })}
    </div>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Guardando…" : label}
    </Button>
  );
}

const STEPS = ["Sobre ti", "Lo que buscas", "Tus intereses"];

export function ProfileForm({ profile, mode }: { profile: Profile; mode: "onboarding" | "edit" }) {
  const [state, action] = useActionState<ProfileState, FormData>(saveProfile, undefined);
  const [step, setStep] = useState(0);
  const onboarding = mode === "onboarding";
  const show = (i: number) => (!onboarding || step === i ? "" : "hidden");
  const thisYear = new Date().getFullYear();

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="mode" value={mode} />

      {onboarding && (
        <ol className="flex gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <div className={clsx("h-1.5 rounded-full", i <= step ? "bg-gradient-accent" : "bg-navy/10")} />
              <p className={clsx("mt-2 text-xs font-medium", i === step ? "text-brand-700" : "text-ink/40")}>{s}</p>
            </li>
          ))}
        </ol>
      )}

      <section className={clsx("space-y-5", show(0))}>
        {!onboarding && <h2 className="text-lg font-semibold">Sobre ti</h2>}
        <div>
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="nationality">Nacionalidad</Label>
            <Select id="nationality" name="nationality" defaultValue={profile.nationality ?? "EC"}>
              {countryOptions.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="country">País donde vives</Label>
            <Select id="country" name="country" defaultValue={profile.country ?? "EC"}>
              {countryOptions.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="birth_year">Año de nacimiento</Label>
            <Select id="birth_year" name="birth_year" defaultValue={profile.birth_year?.toString() ?? ""}>
              <option value="">Prefiero no decirlo</option>
              {Array.from({ length: 30 }, (_, i) => thisYear - 14 - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="education_level">Nivel de estudios</Label>
            <Select id="education_level" name="education_level" defaultValue={profile.education_level ?? ""}>
              <option value="">Selecciona</option>
              {Object.entries(EDUCATION_LEVELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Idiomas que hablas</Label>
          <Chips name="languages" options={Object.entries(LANGUAGES)} defaultValue={profile.languages.length ? profile.languages : ["es"]} />
        </div>
      </section>

      <section className={clsx("space-y-5", show(1))}>
        {!onboarding && <h2 className="text-lg font-semibold">Lo que buscas</h2>}
        <div>
          <Label>¿Qué tipo de oportunidades te interesan?</Label>
          <Chips
            name="opportunity_types"
            options={Object.entries(OPPORTUNITY_TYPES)
              .filter(([k]) => k !== "otro")
              .map(([k, v]) => [k, `${v.emoji} ${v.label}`])}
            defaultValue={profile.opportunity_types}
          />
        </div>
        <div>
          <Label>¿A dónde te gustaría ir?</Label>
          <Chips name="regions" options={Object.entries(REGIONS)} defaultValue={profile.regions} />
        </div>
        <label className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-navy/10">
          <input type="checkbox" name="only_funded" defaultChecked={profile.only_funded} className="size-5 accent-brand-600" />
          <span>
            <span className="block text-sm font-medium">Solo oportunidades con financiamiento</span>
            <span className="block text-xs text-ink/55">Ocultaremos las que no cubren ningún costo.</span>
          </span>
        </label>
      </section>

      <section className={clsx("space-y-5", show(2))}>
        {!onboarding && <h2 className="text-lg font-semibold">Tus intereses</h2>}
        <div>
          <Label>Temas que te apasionan</Label>
          <Chips name="interests" options={INTERESTS.map((i) => [i, i])} defaultValue={profile.interests} />
        </div>
      </section>

      {!onboarding && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Avisos por correo</h2>
          {[
            ["notify_weekly", "Resumen semanal", "Cada lunes, las nuevas oportunidades que encajan contigo.", profile.notify_weekly],
            ["notify_deadlines", "Fechas límite", "Te avisamos 7 y 2 días antes de que cierre una oportunidad guardada.", profile.notify_deadlines],
            ["notify_country", "Nuevas en tu país", "Cuando se publica una oportunidad para tu país.", profile.notify_country],
          ].map(([name, title, desc, on]) => (
            <label key={name as string} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-navy/10">
              <input type="checkbox" name={name as string} defaultChecked={on as boolean} className="size-5 accent-navy" />
              <span>
                <span className="block text-sm font-semibold text-navy">{title as string}</span>
                <span className="block text-xs text-ink/55">{desc as string}</span>
              </span>
            </label>
          ))}
        </section>
      )}

      {state?.error && <Alert>{state.error}</Alert>}
      {state?.message && <Alert tone="green">{state.message}</Alert>}

      <div className="flex items-center justify-between gap-3">
        {onboarding && step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
            Atrás
          </Button>
        ) : (
          <span />
        )}
        {onboarding && step < STEPS.length - 1 ? (
          <Button type="button" size="lg" onClick={() => setStep(step + 1)}>
            Continuar
          </Button>
        ) : (
          <Submit label={onboarding ? "Ver mis oportunidades" : "Guardar cambios"} />
        )}
      </div>
    </form>
  );
}
