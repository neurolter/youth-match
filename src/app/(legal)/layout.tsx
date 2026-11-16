import Link from "next/link";
import { Logo } from "@/components/ui";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-sm leading-relaxed text-ink/80 sm:px-6 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-navy [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-navy">
        {children}
      </main>
    </div>
  );
}
