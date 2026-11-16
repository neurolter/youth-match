// Avisos por correo de Youth Match. Corre con `tsx` en GitHub Actions (npm run correos).
//
//   Todos los días: "se acerca la fecha límite" (7 y 2 días antes) y "nueva oportunidad en tu país".
//   Los lunes:      resumen semanal con las oportunidades nuevas que encajan con cada perfil.
//
// Variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, RESEND_API_KEY.
// Opcionales: CORREOS_SOLO_A=<correo> (prueba: solo a esa persona), CORREOS_FORZAR_SEMANAL=true.
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { countryName } from "../lib/constants";
import { CARD_COLUMNS, matchOpportunities, regionLabel, todayISO, type OpportunityCardData } from "../lib/opportunities";
import type { Profile } from "../lib/supabase/types";
import { emailEnabled, sendEmail } from "../emails/send";
import { countryEmail, deadlineEmail, unsubscribeUrl, weeklyEmail, type Email, type EmailOpp } from "../emails/templates";

type Opp = OpportunityCardData & { published_at: string | null };

const MAX_COUNTRY_EMAILS_PER_WEEK = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isoWeek(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

function toEmailOpp(o: Opp): EmailOpp {
  const place =
    o.modality === "virtual"
      ? "En línea"
      : o.destination_countries.length === 1
        ? countryName(o.destination_countries[0])
        : (regionLabel(o.region) ?? "Varios países");
  return { slug: o.slug, title: o.title, organization: o.organization, type: o.type, deadline: o.deadline, rolling_deadline: o.rolling_deadline, funding: o.funding, place };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY");
  if (!emailEnabled()) {
    console.log("RESEND_API_KEY no está configurada: no se envía nada.");
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const today = todayISO();
  const onlyTo = process.env.CORREOS_SOLO_A?.trim().toLowerCase() || null;
  const isMonday = new Date(`${today}T12:00:00Z`).getUTCDay() === 1;
  const doWeekly = isMonday || process.env.CORREOS_FORZAR_SEMANAL === "true";
  const week = isoWeek(today);

  // Correos confirmados de los usuarios
  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email && u.email_confirmed_at) emails.set(u.id, u.email);
    if (data.users.length < 1000) break;
  }

  const { data: profiles, error: pErr } = await db.from("profiles").select("*").eq("onboarded", true);
  if (pErr) throw pErr;

  const { data: oppsData, error: oErr } = await db
    .from("opportunities")
    .select(CARD_COLUMNS)
    .eq("status", "publicada")
    .or(`deadline.gte.${today},deadline.is.null,rolling_deadline.eq.true`)
    .limit(2000);
  if (oErr) throw oErr;
  const opps = (oppsData ?? []) as unknown as Opp[];
  const byId = new Map(opps.map((o) => [o.id, o]));

  // Lo ya enviado en los últimos 21 días (para no repetir)
  const since = new Date(Date.now() - 21 * 86_400_000).toISOString();
  const { data: logRows } = await db.from("email_log").select("dedupe_key, user_id, kind, sent_at").gte("sent_at", since);
  const sentKeys = new Set((logRows ?? []).map((r) => r.dedupe_key as string));
  const recentCountry = new Map<string, number>();
  for (const r of logRows ?? []) {
    if (r.kind === "nueva_en_tu_pais" && Date.parse(r.sent_at) > Date.now() - 7 * 86_400_000) {
      recentCountry.set(r.user_id, (recentCountry.get(r.user_id) ?? 0) + 1);
    }
  }

  // Guardadas y en seguimiento (para los avisos de fecha límite)
  const watched = new Map<string, Set<string>>();
  const addWatch = (u: string, o: string) => (watched.get(u) ?? watched.set(u, new Set()).get(u)!).add(o);
  const { data: saved } = await db.from("saved_opportunities").select("user_id, opportunity_id");
  for (const s of saved ?? []) addWatch(s.user_id, s.opportunity_id);
  const { data: apps } = await db.from("applications").select("user_id, opportunity_id, status").in("status", ["por_postular", "en_proceso"]);
  for (const a of apps ?? []) addWatch(a.user_id, a.opportunity_id);

  const stats = { fecha_limite: 0, nueva_en_tu_pais: 0, resumen_semanal: 0, errores: 0 };

  async function deliver(p: Profile, to: string, email: Email, keys: { key: string; opportunity_id: string | null }[]) {
    try {
      const id = await sendEmail(to, email, unsubscribeUrl(p.unsubscribe_token, email.kind));
      const rows = keys.map((k) => ({ user_id: p.id, kind: email.kind, opportunity_id: k.opportunity_id, dedupe_key: k.key, provider_id: id }));
      await db.from("email_log").insert(rows);
      keys.forEach((k) => sentKeys.add(k.key));
      stats[email.kind as keyof typeof stats]++;
      console.log(`✓ ${email.kind} → ${to}`);
    } catch (e) {
      stats.errores++;
      console.error(`✗ ${email.kind} → ${to}: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(600); // Resend admite ~2 envíos por segundo
  }

  for (const profile of (profiles ?? []) as Profile[]) {
    const to = emails.get(profile.id);
    if (!to) continue;
    if (onlyTo && to.toLowerCase() !== onlyTo) continue;

    // 1. Se acerca la fecha límite (7 y 2 días antes)
    if (profile.notify_deadlines) {
      const due: { opp: Opp; bucket: string }[] = [];
      for (const id of watched.get(profile.id) ?? []) {
        const o = byId.get(id);
        if (!o?.deadline || o.rolling_deadline) continue;
        const d = daysBetween(today, o.deadline);
        const bucket = d >= 6 && d <= 7 ? "7" : d >= 0 && d <= 2 ? "2" : null;
        if (!bucket) continue;
        const key = `fecha_limite:${bucket}:${profile.id}:${o.id}`;
        if (!sentKeys.has(key)) due.push({ opp: o, bucket });
      }
      if (due.length) {
        due.sort((a, b) => (a.opp.deadline ?? "").localeCompare(b.opp.deadline ?? ""));
        const email = deadlineEmail({ name: profile.full_name, opps: due.map((x) => toEmailOpp(x.opp)), today, token: profile.unsubscribe_token });
        await deliver(profile, to, email, due.map((x) => ({ key: `fecha_limite:${x.bucket}:${profile.id}:${x.opp.id}`, opportunity_id: x.opp.id })));
      }
    }

    // 2. Nueva oportunidad en tu país (publicadas en las últimas 48 h)
    if (profile.notify_country && profile.country && (recentCountry.get(profile.id) ?? 0) < MAX_COUNTRY_EMAILS_PER_WEEK) {
      const recent = opps.filter((o) => {
        if (!o.published_at || Date.parse(o.published_at) < Date.now() - 48 * 3600_000) return false;
        const inCountry = o.destination_countries.includes(profile.country!);
        const forNationality =
          !!profile.nationality && o.eligible_nationalities.length > 0 && o.eligible_nationalities.length <= 5 && o.eligible_nationalities.includes(profile.nationality);
        return (inCountry || forNationality) && !sentKeys.has(`pais:${profile.id}:${o.id}`);
      });
      const fits = matchOpportunities(profile, recent).slice(0, 3).map((m) => m.opportunity as Opp);
      if (fits.length) {
        const email = countryEmail({ name: profile.full_name, country: countryName(profile.country), opps: fits.map(toEmailOpp), today, token: profile.unsubscribe_token });
        await deliver(profile, to, email, fits.map((o) => ({ key: `pais:${profile.id}:${o.id}`, opportunity_id: o.id })));
      }
    }

    // 3. Resumen semanal (lunes)
    if (doWeekly && profile.notify_weekly && !sentKeys.has(`semana:${profile.id}:${week}`)) {
      const fresh = opps.filter((o) => o.published_at && Date.parse(o.published_at) >= Date.now() - 7 * 86_400_000);
      const matches = matchOpportunities(profile, fresh);
      if (matches.length) {
        const email = weeklyEmail({
          name: profile.full_name,
          opps: matches.slice(0, 6).map((m) => toEmailOpp(m.opportunity as Opp)),
          total: matches.length,
          today,
          token: profile.unsubscribe_token,
        });
        await deliver(profile, to, email, [{ key: `semana:${profile.id}:${week}`, opportunity_id: null }]);
      }
    }
  }

  const summary = `## Correos de Youth Match (${today})\n\n| Tipo | Enviados |\n|---|---|\n| Fecha límite | ${stats.fecha_limite} |\n| Nueva en tu país | ${stats.nueva_en_tu_pais} |\n| Resumen semanal${doWeekly ? "" : " (solo lunes)"} | ${stats.resumen_semanal} |\n| Errores | ${stats.errores} |\n`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  if (stats.errores && !stats.fecha_limite && !stats.nueva_en_tu_pais && !stats.resumen_semanal) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
