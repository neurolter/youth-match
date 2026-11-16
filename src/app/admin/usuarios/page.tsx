import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Crown, Ticket } from "lucide-react";
import { Badge, Card, Logo, PageHeader, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { countryName } from "@/lib/constants";
import { setPremium, togglePromoCode } from "./actions";
import { CodeForm } from "./code-form";

export const metadata: Metadata = { title: "Usuarios y Premium" };

const fmt = (d: string | null) =>
  d ? new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Guayaquil" }).format(new Date(d)) : "—";

const SOURCE: Record<string, string> = { cortesia: "Cortesía", codigo: "Código", promo: "Código" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const supabase = await createClient();

  const [{ data: users }, { data: codes }] = await Promise.all([
    supabase.rpc("admin_users"),
    supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
  ]);

  const list = (users ?? []).filter(
    (u) => !q || u.email?.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q),
  );
  const premiumCount = (users ?? []).filter((u) => u.premium_until || u.premium_source).length;

  return (
    <div className="bg-dots min-h-dvh">
      <header className="border-b border-navy/[0.06] bg-paper/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge tone="dark">Admin</Badge>
          </div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-navy">
            <ArrowLeft className="size-4" /> Panel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 pb-24 sm:px-6">
        <PageHeader
          eyebrow="Accesos"
          title="Usuarios y Premium"
          description="Da Premium gratis a quien quieras o crea códigos para que tus amigos lo activen solos desde la página de Planes."
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["Usuarios", users?.length ?? 0],
            ["Con Premium", premiumCount],
            ["Códigos activos", (codes ?? []).filter((c) => c.active).length],
          ].map(([label, n]) => (
            <Card key={label} className="p-4">
              <p className="text-2xl font-bold">{n}</p>
              <p className="text-sm text-ink/55">{label}</p>
            </Card>
          ))}
        </div>

        {/* Códigos promocionales */}
        <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
              <Ticket className="size-5" /> Nuevo código
            </h2>
            <p className="mb-4 mt-1 text-sm text-ink/55">
              Tus amigos se registran, van a <b>Planes</b> y escriben el código. Premium se activa al instante por los días que elijas.
            </p>
            <CodeForm />
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy">Códigos creados</h2>
            {codes?.length ? (
              <ul className="mt-4 divide-y divide-navy/[0.06]">
                {codes.map((c) => {
                  const expired = c.expires_at && new Date(c.expires_at) < new Date();
                  const full = c.max_uses !== null && c.uses >= c.max_uses;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-bold tracking-wide text-navy">{c.code}</p>
                        <p className="text-xs text-ink/55">
                          {c.days} días · {c.uses}
                          {c.max_uses ? ` de ${c.max_uses}` : ""} {c.uses === 1 ? "uso" : "usos"}
                          {c.expires_at ? ` · hasta ${fmt(c.expires_at)}` : ""}
                          {c.note ? ` · ${c.note}` : ""}
                        </p>
                      </div>
                      {!c.active ? (
                        <Badge>Pausado</Badge>
                      ) : expired ? (
                        <Badge tone="red">Vencido</Badge>
                      ) : full ? (
                        <Badge tone="amber">Agotado</Badge>
                      ) : (
                        <Badge tone="green">Activo</Badge>
                      )}
                      <form action={togglePromoCode}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={String(c.active)} />
                        <button className={buttonClass("ghost", "sm", "h-8 px-3")}>{c.active ? "Pausar" : "Activar"}</button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink/55">Todavía no has creado códigos.</p>
            )}
          </Card>
        </section>

        {/* Usuarios */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-navy">Usuarios</h2>
            <form className="flex gap-2">
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por correo o nombre"
                className="h-10 w-64 rounded-full border border-navy/12 bg-white px-4 text-sm focus:border-brand-500 focus:outline-none"
              />
              <button className={buttonClass("secondary", "sm")}>Buscar</button>
            </form>
          </div>

          <div className="space-y-2">
            {list.map((u) => {
              const premium = Boolean(u.premium_until || u.premium_source);
              const paid = premium && u.premium_source && !SOURCE[u.premium_source];
              return (
                <Card key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                  <div className="min-w-0 flex-1 basis-60">
                    <p className="truncate font-semibold text-navy">
                      {u.full_name || "Sin nombre"} {u.role === "admin" && <Badge tone="dark" className="ml-1">Admin</Badge>}
                    </p>
                    <p className="truncate text-sm text-ink/55">{u.email}</p>
                    <p className="text-xs text-ink/40">
                      {u.country ? `${countryName(u.country)} · ` : ""}Desde {fmt(u.created_at)}
                      {!u.onboarded && " · Perfil incompleto"}
                    </p>
                  </div>
                  <div className="text-sm">
                    {premium ? (
                      <Badge tone="amber">
                        <Crown className="size-3" /> Premium{u.premium_until ? ` hasta ${fmt(u.premium_until)}` : ""}
                        {u.premium_source && SOURCE[u.premium_source] ? ` · ${SOURCE[u.premium_source]}` : ""}
                      </Badge>
                    ) : (
                      <Badge>Gratis</Badge>
                    )}
                  </div>
                  {!paid && (
                    <form action={setPremium} className="flex items-center gap-1.5">
                      <input type="hidden" name="uid" value={u.id} />
                      <button name="days" value="30" className={buttonClass("secondary", "sm", "h-8 px-3")}>
                        +30 días
                      </button>
                      <button name="days" value="90" className={buttonClass("secondary", "sm", "h-8 px-3")}>
                        +90 días
                      </button>
                      {premium && (
                        <button name="days" value="0" className={buttonClass("ghost", "sm", "h-8 px-3 text-rose-600")}>
                          Quitar
                        </button>
                      )}
                    </form>
                  )}
                </Card>
              );
            })}
            {!list.length && <p className="text-sm text-ink/55">No hay usuarios que coincidan.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
