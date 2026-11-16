// Plantillas de correo de Youth Match (HTML con estilos en línea + versión de texto).
// Código puro: lo usan tanto la app (Next.js) como el envío programado (tsx).

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://youthmatch.app").replace(/\/$/, "");

const NAVY = "#0b1f52";
const INK = "#0d1530";
const PAPER = "#f6f4ef";
const ACCENT = "#ef233c";

export type EmailOpp = {
  slug: string;
  title: string;
  organization: string;
  type: string;
  deadline: string | null;
  rolling_deadline: boolean;
  funding: string;
  place: string;
};

export type Email = { subject: string; html: string; text: string; kind: EmailKind };
export type EmailKind = "bienvenida" | "fecha_limite" | "resumen_semanal" | "nueva_en_tu_pais";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FUNDING: Record<string, string> = {
  total: "100 % financiada",
  parcial: "Financiamiento parcial",
  sin_financiamiento: "Sin financiamiento",
  desconocido: "Financiamiento por confirmar",
};

/** Enlace con UTM para medir qué correos traen visitas. */
export function link(path: string, campaign: EmailKind) {
  const u = new URL(path, SITE_URL);
  u.searchParams.set("utm_source", "email");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

export function unsubscribeUrl(token: string, kind: EmailKind | "todos") {
  return `${SITE_URL}/correos/baja?t=${encodeURIComponent(token)}&tipo=${kind}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function daysLeft(deadline: string | null, today: string) {
  if (!deadline) return null;
  return Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function closeText(o: EmailOpp, today: string) {
  if (o.rolling_deadline) return "Abierta todo el año";
  const d = daysLeft(o.deadline, today);
  if (d === null) return "Fecha límite por confirmar";
  if (d <= 0) return "¡Cierra hoy!";
  if (d === 1) return "Cierra mañana";
  return `Cierra el ${formatDate(o.deadline!)} (en ${d} días)`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:999px;background:${ACCENT};background-image:linear-gradient(95deg,#ef233c,#f97316 55%,#facc15)">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`;
}

function card(o: EmailOpp, kind: EmailKind, today: string) {
  const url = link(`/oportunidad/${o.slug}`, kind);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;background:#ffffff;border:1px solid #e3e6ee;border-radius:16px">
<tr><td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif">
<a href="${url}" style="font-size:17px;font-weight:bold;color:${NAVY};text-decoration:none;line-height:1.35">${esc(o.title)}</a>
<div style="margin-top:4px;font-size:13px;color:#5b6276">${esc(o.organization)}</div>
<div style="margin-top:10px;font-size:13px;color:${INK}">📍 ${esc(o.place)} &nbsp;·&nbsp; 💰 ${esc(o.type === "voluntariado" && o.funding === "desconocido" ? "Voluntariado sin pago" : (FUNDING[o.funding] ?? FUNDING.desconocido))}</div>
<div style="margin-top:6px;font-size:13px;font-weight:bold;color:${ACCENT}">⏳ ${esc(closeText(o, today))}</div>
<div style="margin-top:12px"><a href="${url}" style="font-size:13px;font-weight:bold;color:#1a56d6;text-decoration:none">Ver y postular →</a></div>
</td></tr></table>`;
}

function layout(opts: { preheader: string; title: string; body: string; unsubscribe?: string }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${PAPER}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:8px 4px 20px"><a href="${SITE_URL}"><img src="${SITE_URL}/brand/youth-match-simbolo.png" width="36" height="36" alt="Youth Match" style="vertical-align:middle;border:0"></a>
<span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:${NAVY};vertical-align:middle;margin-left:8px">Youth Match</span></td></tr>
<tr><td style="background:#ffffff;border-radius:24px;padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:${INK};font-size:15px;line-height:1.6">
<div style="height:6px;border-radius:6px;background:${ACCENT};background-image:linear-gradient(95deg,#ef233c,#f97316 55%,#facc15);margin:-8px 0 24px"></div>
${opts.body}
</td></tr>
<tr><td style="padding:20px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a90a2;line-height:1.6;text-align:center">
Recibes este correo porque tienes una cuenta en Youth Match.<br>
${opts.unsubscribe ? `<a href="${opts.unsubscribe}" style="color:#8a90a2">Dejar de recibir estos avisos</a> · ` : ""}<a href="${SITE_URL}/perfil" style="color:#8a90a2">Mis preferencias</a>
</td></tr></table></td></tr></table></body></html>`;
}

const firstName = (name: string | null) => (name ?? "").trim().split(/\s+/)[0] || "";

// ---------------------------------------------------------------------------

export function welcomeEmail(p: { name: string | null }): Email {
  const hi = firstName(p.name) ? `¡Hola, ${esc(firstName(p.name))}!` : "¡Hola!";
  const body = `<h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:${NAVY}">${hi} Bienvenido a Youth Match 🌍</h1>
<p>Ya tienes tu perfil listo. A partir de ahora te mostramos primero las becas, intercambios, congresos y voluntariados que encajan contigo.</p>
<p style="margin:20px 0 6px;font-weight:bold;color:${NAVY}">Tres cosas para empezar:</p>
<ol style="padding-left:20px;margin:0">
<li style="margin-bottom:6px"><b>Revisa "Para ti"</b>: tus oportunidades ordenadas por compatibilidad.</li>
<li style="margin-bottom:6px"><b>Guarda</b> las que te interesen y te avisaremos antes de que cierren.</li>
<li><b>Marca "Postularé"</b> para llevar el control de cada postulación.</li></ol>
${button(link("/para-ti", "bienvenida"), "Ver mis oportunidades")}
<p style="color:#5b6276;font-size:14px">Cada lunes te enviaremos las nuevas oportunidades de la semana para tu perfil.</p>`;
  return {
    kind: "bienvenida",
    subject: "Bienvenido a Youth Match: tus oportunidades te esperan 🌍",
    html: layout({ preheader: "Tu perfil está listo. Mira las oportunidades elegidas para ti.", title: "Bienvenido", body }),
    text: `${firstName(p.name) ? `Hola, ${firstName(p.name)}` : "Hola"}. Bienvenido a Youth Match.\n\nMira tus oportunidades: ${link("/para-ti", "bienvenida")}\n\nGuarda las que te interesen y te avisaremos antes de que cierren.`,
  };
}

export function deadlineEmail(p: { name: string | null; opps: EmailOpp[]; today: string; token: string }): Email {
  const first = p.opps[0];
  const d = daysLeft(first.deadline, p.today) ?? 0;
  const subject =
    p.opps.length === 1
      ? `⏳ ${d <= 1 ? "Último día" : `Quedan ${d} días`} para postular: ${first.title}`
      : `⏳ ${p.opps.length} de tus oportunidades guardadas cierran pronto`;
  const body = `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:${NAVY}">Se acerca la fecha límite, ¡postula ya!</h1>
<p>${firstName(p.name) ? `${esc(firstName(p.name))}, estas` : "Estas"} oportunidades que guardaste cierran pronto. No dejes pasar tu chance:</p>
${p.opps.map((o) => card(o, "fecha_limite", p.today)).join("")}
${button(link(`/oportunidad/${first.slug}`, "fecha_limite"), "Postular ahora")}`;
  const unsub = unsubscribeUrl(p.token, "fecha_limite");
  return {
    kind: "fecha_limite",
    subject,
    html: layout({ preheader: "Tus oportunidades guardadas están por cerrar.", title: subject, body, unsubscribe: unsub }),
    text: `Se acerca la fecha límite:\n\n${p.opps.map((o) => `- ${o.title} (${closeText(o, p.today)}): ${link(`/oportunidad/${o.slug}`, "fecha_limite")}`).join("\n")}\n\nDejar de recibir: ${unsub}`,
  };
}

export function weeklyEmail(p: { name: string | null; opps: EmailOpp[]; total: number; today: string; token: string }): Email {
  const n = p.total;
  const subject = n === 1 ? "Esta semana hay 1 nueva oportunidad internacional para ti" : `Esta semana hay ${n} nuevas oportunidades internacionales para ti`;
  const body = `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:${NAVY}">${firstName(p.name) ? `${esc(firstName(p.name))}, esta` : "Esta"} semana hay <span style="color:${ACCENT}">${n} ${n === 1 ? "nueva oportunidad" : "nuevas oportunidades"}</span> para ti</h1>
<p>Las elegimos según tu perfil. Estas son las que mejor encajan contigo:</p>
${p.opps.map((o) => card(o, "resumen_semanal", p.today)).join("")}
${button(link("/para-ti", "resumen_semanal"), n > p.opps.length ? `Ver las ${n} oportunidades` : "Ver todas mis oportunidades")}`;
  const unsub = unsubscribeUrl(p.token, "resumen_semanal");
  return {
    kind: "resumen_semanal",
    subject,
    html: layout({ preheader: "Tu resumen semanal de becas, intercambios y congresos.", title: subject, body, unsubscribe: unsub }),
    text: `${subject}:\n\n${p.opps.map((o) => `- ${o.title} — ${o.organization}: ${link(`/oportunidad/${o.slug}`, "resumen_semanal")}`).join("\n")}\n\nVer todas: ${link("/para-ti", "resumen_semanal")}\nDejar de recibir: ${unsub}`,
  };
}

export function countryEmail(p: { name: string | null; country: string; opps: EmailOpp[]; today: string; token: string }): Email {
  const first = p.opps[0];
  const subject =
    p.opps.length === 1
      ? `🚀 Nueva oportunidad para jóvenes de ${p.country}: ${first.title}`
      : `🚀 ${p.opps.length} nuevas oportunidades para jóvenes de ${p.country}`;
  const body = `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:${NAVY}">¡Acaban de subir ${p.opps.length === 1 ? "una oportunidad" : "oportunidades"} para ${esc(p.country)}!</h1>
<p>${p.opps.length === 1 ? "Es" : "Son"} para tu país y ${p.opps.length === 1 ? "encaja" : "encajan"} con tu perfil. Postula antes que nadie:</p>
${p.opps.map((o) => card(o, "nueva_en_tu_pais", p.today)).join("")}
${button(link(`/oportunidad/${first.slug}`, "nueva_en_tu_pais"), "Aplicar ya")}`;
  const unsub = unsubscribeUrl(p.token, "nueva_en_tu_pais");
  return {
    kind: "nueva_en_tu_pais",
    subject,
    html: layout({ preheader: `Nuevas oportunidades para jóvenes de ${p.country}.`, title: subject, body, unsubscribe: unsub }),
    text: `${subject}\n\n${p.opps.map((o) => `- ${o.title}: ${link(`/oportunidad/${o.slug}`, "nueva_en_tu_pais")}`).join("\n")}\n\nDejar de recibir: ${unsub}`,
  };
}
