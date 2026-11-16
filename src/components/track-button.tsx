"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { ClipboardCheck, ClipboardPlus } from "lucide-react";
import { trackApplication } from "@/app/(app)/actions";

export function TrackButton({ opportunityId, tracking, loggedIn }: { opportunityId: string; tracking: boolean; loggedIn: boolean }) {
  const path = usePathname();
  const [pending, start] = useTransition();
  const cls =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold ring-1 transition disabled:opacity-60";

  if (!loggedIn) {
    return (
      <Link href={`/ingresar?siguiente=${encodeURIComponent(path)}`} className={`${cls} bg-white text-slate-800 ring-slate-200 hover:bg-slate-50`}>
        <ClipboardPlus className="size-4" /> Postularé
      </Link>
    );
  }
  if (tracking) {
    return (
      <span className={`${cls} bg-emerald-50 text-emerald-700 ring-emerald-200`}>
        <ClipboardCheck className="size-4" /> En seguimiento
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => trackApplication(opportunityId, path))}
      className={`${cls} bg-white text-slate-800 ring-slate-200 hover:bg-slate-50`}
    >
      <ClipboardPlus className="size-4" /> {pending ? "…" : "Postularé"}
    </button>
  );
}
