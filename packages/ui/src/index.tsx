import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { clsx } from "clsx";
import { AlertCircle, Compass } from "lucide-react";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matrix-red focus-visible:ring-offset-2 focus-visible:ring-offset-matrix-bg disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-matrix-red text-white shadow-lg shadow-red-950/30 hover:bg-red-600 active:scale-[.98]",
        variant === "secondary" && "border border-white/10 bg-white/10 text-white backdrop-blur-md hover:bg-white/15",
        variant === "ghost" && "text-zinc-300 hover:bg-white/10 hover:text-white",
        variant === "danger" && "bg-red-950 text-red-200 hover:bg-red-900",
        size === "sm" && "min-h-9 px-4 text-xs",
        size === "md" && "min-h-11 px-5 text-sm",
        size === "lg" && "min-h-12 px-7 text-sm",
        size === "icon" && "h-11 w-11",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function GlassCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-white/[.08] bg-white/[.055] shadow-glass backdrop-blur-xl", className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "red" | "green" | "yellow"; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
      tone === "neutral" && "border-white/10 bg-black/30 text-zinc-200",
      tone === "red" && "border-red-400/20 bg-red-500/15 text-red-200",
      tone === "green" && "border-green-400/20 bg-green-500/15 text-green-200",
      tone === "yellow" && "border-yellow-400/20 bg-yellow-500/15 text-yellow-100",
      className,
    )}>{children}</span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("relative overflow-hidden rounded-xl bg-white/[.06] after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/[.07] after:to-transparent", className)} aria-hidden="true" />;
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="MediaMatrix">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="12" height="12" rx="3" fill="#E50914" />
        <rect x="18" y="2" width="12" height="12" rx="3" fill="white" fillOpacity=".9" />
        <rect x="2" y="18" width="12" height="12" rx="3" fill="white" fillOpacity=".35" />
        <path d="M20 19.5L28.5 24L20 28.5V19.5Z" fill="white" />
      </svg>
      {!compact && <span className="text-[17px] font-extrabold tracking-[-.04em] text-white">Media<span className="text-matrix-red">Matrix</span></span>}
    </span>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[.025] px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.06] text-zinc-400">{icon ?? <Compass size={22} />}</div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action }: { title?: string; description: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-red-500/15 bg-red-500/[.045] px-6 py-10 text-center">
      <AlertCircle className="mb-4 text-red-400" size={28} />
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
