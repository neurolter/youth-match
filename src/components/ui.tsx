import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "light" | "accent";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-navy text-white shadow-[0_6px_20px_-8px_rgba(11,31,82,0.7)] hover:bg-brand-800 active:translate-y-px",
  accent:
    "bg-gradient-accent text-white shadow-[0_8px_24px_-10px_rgba(239,35,60,0.7)] hover:brightness-105 active:translate-y-px",
  secondary: "bg-white text-ink ring-1 ring-navy/12 hover:ring-navy/25 hover:bg-white active:translate-y-px",
  ghost: "text-ink/70 hover:bg-navy/5 hover:text-ink",
  light: "bg-white text-navy hover:bg-brand-50 active:translate-y-px",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};
const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return clsx(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

const field =
  "w-full rounded-2xl border border-navy/12 bg-white text-[15px] text-ink placeholder:text-ink/35 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(field, "h-12 px-4", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx(field, "h-12 px-3.5", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(field, "px-4 py-3", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={clsx("mb-2 block text-sm font-semibold text-ink/80", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={clsx("rounded-[1.4rem] bg-white shadow-[0_1px_0_rgba(11,31,82,0.04)] ring-1 ring-navy/8", className)}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: "slate" | "brand" | "green" | "amber" | "red" | "dark";
  className?: string;
}) {
  const tones = {
    slate: "bg-navy/6 text-ink/70",
    brand: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-rose-50 text-rose-700",
    dark: "bg-navy text-white",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-500">{eyebrow}</p>
        )}
        <h1 className="text-[2rem] font-bold leading-[1.05] text-navy sm:text-[2.6rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-ink/60">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-[1.6rem] border-2 border-dashed border-navy/12 bg-white/70 px-6 py-16 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-navy text-white shadow-lg shadow-navy/20">{icon}</div>
      <h3 className="text-xl font-bold text-navy">{title}</h3>
      {description && <p className="mt-2 max-w-md text-[15px] text-ink/60">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "red", children }: { tone?: "red" | "green" | "brand"; children: ReactNode }) {
  const tones = {
    red: "bg-rose-50 text-rose-800 ring-rose-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    brand: "bg-brand-50 text-brand-800 ring-brand-200",
  };
  return <div className={clsx("rounded-2xl px-4 py-3 text-sm ring-1", tones[tone])}>{children}</div>;
}

export function Logo({ className, variant = "color", size = 34 }: { className?: string; variant?: "color" | "white"; size?: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5 font-display font-bold tracking-tight", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={variant === "white" ? "/brand/youth-match-simbolo-oscuro.png" : "/brand/youth-match-simbolo.png"}
        alt=""
        width={size}
        height={size}
        className="shrink-0"
      />
      <span className={clsx("whitespace-nowrap text-[1.15em] leading-none", variant === "white" ? "text-white" : "text-navy")}>
        Youth Match
      </span>
    </span>
  );
}
