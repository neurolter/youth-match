import { NextResponse } from "next/server";

// Endpoint preparado para el asistente de IA (fase 2).
// Las llamadas al modelo de IA SIEMPRE se hacen aquí, en el servidor, nunca en el navegador.
// Al implementarlo: validar sesión y plan premium, limitar uso por usuario y leer la API key
// desde process.env (AI_PROVIDER, GEMINI_API_KEY o ANTHROPIC_API_KEY).
export async function POST() {
  return NextResponse.json({ error: "El estudio de postulaciones estará disponible pronto." }, { status: 501 });
}
