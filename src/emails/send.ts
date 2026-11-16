// Envío de correos con Resend (https://resend.com). Sin RESEND_API_KEY no se envía nada.
import type { Email } from "./templates";

export const EMAIL_FROM = process.env.EMAIL_FROM || "Youth Match <no-responder@youthmatch.app>";
export const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;

export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);

/** Envía un correo. Devuelve el id de Resend o lanza un error. */
export async function sendEmail(to: string, email: Email, unsubscribeUrl?: string): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY");

  const headers: Record<string, string> = {};
  if (unsubscribeUrl) {
    // Botón "Cancelar suscripción" nativo de Gmail / Outlook.
    headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: EMAIL_REPLY_TO,
        headers,
        tags: [{ name: "tipo", value: email.kind }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const data = (await res.json()) as { id?: string };
      return data.id ?? "";
    }
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    throw new Error(`Resend respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  throw new Error("Resend no respondió tras varios intentos");
}
