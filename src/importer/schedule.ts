import type { Source } from "./types";

/** ¿Le toca correr a esta fuente? Media hora de margen para que el cron de 6 h no se la salte. */
export function isDue(s: Source, now = Date.now()): boolean {
  if (s.status === "pausada") return false;
  if (!s.last_run_at) return true;
  // Una fuente con errores se reintenta una vez al día, para que se recupere sola.
  const hours = s.status === "con_errores" ? Math.max(24, s.frequency_hours) : s.frequency_hours;
  return now - new Date(s.last_run_at).getTime() >= (hours - 0.5) * 3600_000;
}
