"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Input, Label } from "@/components/ui";
import { createPromoCode, type CodeState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Creando…" : "Crear código"}
    </Button>
  );
}

export function CodeForm() {
  const [state, action] = useActionState<CodeState, FormData>(createPromoCode, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Código</Label>
          <Input id="code" name="code" required placeholder="AMIGOS2026" className="uppercase" maxLength={40} />
        </div>
        <div>
          <Label htmlFor="days">Días de Premium</Label>
          <Input id="days" name="days" type="number" min={1} max={730} defaultValue={30} required />
        </div>
        <div>
          <Label htmlFor="max_uses">Máximo de personas (opcional)</Label>
          <Input id="max_uses" name="max_uses" type="number" min={1} placeholder="Sin límite" />
        </div>
        <div>
          <Label htmlFor="expires_at">Se puede canjear hasta (opcional)</Label>
          <Input id="expires_at" name="expires_at" type="date" />
        </div>
      </div>
      <div>
        <Label htmlFor="note">Nota interna (opcional)</Label>
        <Input id="note" name="note" placeholder="Ej.: amigos que prueban la app" maxLength={200} />
      </div>
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="green">{state.ok}</Alert>}
      <Submit />
    </form>
  );
}
