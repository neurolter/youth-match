import Link from "next/link";
import { Crown, Shield } from "lucide-react";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { InstallBanner } from "@/components/install-app";
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
    <div className="bg-dots flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-navy/[0.06] bg-paper/80 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6">
          <div className="flex items-center gap-6">
            <Link href={profile ? "/para-ti" : "/"} aria-label="Youth Match">
              <Logo />
            </Link>
            {profile && <DesktopNav />}
          </div>
          {profile ? (
            <div className="flex items-center gap-1.5">
              {!premium && (
                <Link
                  href="/planes"
                  className="hidden items-center gap-1.5 rounded-full bg-gradient-accent px-4 py-2 text-sm font-bold text-white shadow-md shadow-accent-500/25 transition hover:brightness-105 sm:inline-flex"
                >
                  <Crown className="size-4" /> Premium
                </Link>
              )}
              {profile.role === "admin" && (
                <Link
                  href="/admin"
                  aria-label="Administración"
                  className="grid size-10 place-items-center rounded-full text-ink/60 transition hover:bg-navy/5 hover:text-navy"
                >
                  <Shield className="size-5" />
                </Link>
              )}
              <Link
                href="/perfil"
                aria-label="Mi perfil"
                className="ml-1 grid size-10 place-items-center rounded-full bg-navy font-display text-sm font-bold text-white ring-4 ring-white"
              >
                {initials || "YM"}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="hidden min-[420px]:block">
                <ButtonLink href="/ingresar" variant="ghost" size="sm">
                  Ingresar
                </ButtonLink>
              </span>
              <ButtonLink href="/registro" size="sm">
                Crear cuenta
              </ButtonLink>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 pb-safe sm:px-6 sm:py-10">
        {profile && <InstallBanner />}
        {children}
      </main>
      {profile && <MobileNav />}
    </div>
  );
}
