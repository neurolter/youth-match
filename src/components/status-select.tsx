"use client";

import clsx from "clsx";
import { useOptimistic, useTransition } from "react";
import { updateApplication } from "@/app/(app)/actions";
import { APPLICATION_STATUS, type ApplicationStatus } from "@/lib/constants";

export function StatusSelect({ id, status }: { id: string; status: ApplicationStatus }) {
  const [value, setValue] = useOptimistic(status);
  const [, start] = useTransition();
  return (
    <select
      value={value}
      aria-label="Estado de la postulación"
      onChange={(e) => {
        const next = e.target.value as ApplicationStatus;
        const fd = new FormData();
        fd.set("id", id);
        fd.set("status", next);
        start(async () => {
          setValue(next);
          await updateApplication(fd);
        });
      }}
      className={clsx(
        "h-10 rounded-xl border-0 px-3 text-sm font-medium ring-1 ring-navy/10 focus:outline-none focus:ring-2 focus:ring-brand-500",
        APPLICATION_STATUS[value].color,
      )}
    >
      {Object.entries(APPLICATION_STATUS).map(([k, v]) => (
        <option key={k} value={k}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
