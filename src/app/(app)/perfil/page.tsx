import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Crown, LogOut } from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { Button, ButtonLink, Card } from "@/components/ui";
import { getProfile, getUser, hasPremium, requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  await requireUser("/perfil");
  const [profile, user, premium] = await Promise.all([getProfile(), getUser(), hasPremium()]);
  if (!profile) redirect("/ingresar");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-[2rem] font-bold leading-[1.05] text-navy sm:text-[2.6rem]">Mi perfil</h1>
        <p className="mt-1 text-ink/55">{user?.email}</p>
      </div>

      <Card className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Crown className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Plan {premium ? "Premium" : "Gratis"}</p>
            <p className="text-xs text-ink/55">
              {premium ? "Tienes acceso a todo." : "Desbloquea todas tus recomendaciones y alertas."}
            </p>
          </div>
        </div>
        {!premium && (
          <ButtonLink href="/planes" size="sm">
            Mejorar
          </ButtonLink>
        )}
      </Card>

      <ProfileForm profile={profile} mode="edit" />

      <form action={signOut} className="border-t border-navy/10 pt-6">
        <Button type="submit" variant="ghost">
          <LogOut className="size-4" /> Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
