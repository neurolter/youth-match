"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Ticket } from "lucide-react";
import { Alert, Button, Card, Input } from "@/components/ui";
import { redeemCode, type RedeemState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="shrink-0">
      {pending ? "Canjeando…" : "Canjear"}
    </Button>
  );
}

export function RedeemForm() {
  const [state, action] = useActionState<RedeemState, FormData>(redeemCode, undefined);
  return (
    <Card className="mx-auto max-w-xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold text-navy">
        <Ticket className="size-5" /> ¿Tienes un código?
      </h2>
      <p className="mt-1 text-sm text-ink/55">Escríbelo aquí para activar Premium gratis.</p>
      <form action={action} className="mt-4 flex gap-2">
        <Input name="code" required placeholder="Tu código" className="uppercase" autoComplete="off" maxLength={40} />
        <Submit />
      </form>
      {state?.error && <div className="mt-3"><Alert>{state.error}</Alert></div>}
      {state?.ok && <div className="mt-3"><Alert tone="green">{state.ok}</Alert></div>}
    </Card>
  );
}
