import Link from "next/link";
import { Crown } from "lucide-react";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { ButtonLink, Logo } from "@/components/ui";
import { getProfile, hasPremium } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, premium] = await Promise.all([getProfile(), hasPremium()]);
  const initials = (profile?.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href={profile ? "/para-ti" : "/"} aria-label="Youth Match">
              <Logo />
            </Link>
            {profile && <DesktopNav />}
          </div>
          {profile ? (
            <div className="flex items-center gap-2">
              {!premium && (
                <Link
                  href="/planes"
                  className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 sm:inline-flex"
                >
                  <Crown className="size-4" /> Premium
                </Link>
              )}
              {profile.role === "admin" && (
                <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block">
                  Admin
                </Link>
              )}
              <Link
                href="/perfil"
                aria-label="Mi perfil"
                className="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 ring-2 ring-white"
              >
                {initials || "YM"}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ButtonLink href="/ingresar" variant="ghost" size="sm">
                Ingresar
              </ButtonLink>
              <ButtonLink href="/registro" size="sm">
                Crear cuenta
              </ButtonLink>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-safe sm:px-6 sm:py-8">{children}</main>
      {profile && <MobileNav />}
    </div>
  );
}
