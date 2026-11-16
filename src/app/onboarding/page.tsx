import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { Logo } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Cuéntanos sobre ti" };

export default async function OnboardingPage() {
  await requireUser("/onboarding");
  const profile = await getProfile();
  if (!profile) redirect("/ingresar");

  return (
    <div className="min-h-dvh bg-paper px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <Logo className="text-lg" />
        <div className="mt-8 mb-8">
          <h1 className="text-[2rem] font-bold leading-[1.05] text-navy sm:text-[2.6rem]">Personalicemos tus oportunidades</h1>
          <p className="mt-2 text-ink/55">
            Tres preguntas rápidas para mostrarte primero lo que de verdad encaja contigo. Puedes cambiarlo cuando quieras.
          </p>
        </div>
        <ProfileForm profile={profile} mode="onboarding" />
      </div>
    </div>
  );
}
