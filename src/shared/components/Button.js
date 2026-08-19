"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  primary:
    "bg-brand-500 hover:bg-brand-600 text-black font-bold motion-safe:active:scale-[0.98] disabled:bg-surface-3 disabled:text-text-muted transition-all",
  secondary:
    "bg-surface-2 hover:bg-surface-3 text-text-main border border-border/80 hover:border-brand-500/30 shadow-sm disabled:opacity-50 transition-all",
  outline:
    "border border-border text-text-main hover:bg-surface-2 hover:border-brand-500/50 hover:text-brand-500 dark:hover:text-brand-400 disabled:opacity-50 transition-all",
  ghost:
    "text-text-muted hover:bg-surface-2 hover:text-text-main disabled:opacity-50 transition-all",
  danger:
    "bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm disabled:bg-surface-3 disabled:text-text-muted transition-all",
  success:
    "bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm disabled:bg-surface-3 disabled:text-text-muted transition-all",
  cta:
    "btn-cta bg-brand-500 hover:bg-brand-600 text-black font-bold motion-safe:active:scale-[0.98] transition-all",
};

const sizes = {
  sm: "h-7 px-3 text-xs rounded-[8px]",
  md: "h-9 px-4 text-sm rounded-[10px]",
  lg: "h-11 px-6 text-sm rounded-[10px]",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 ease-out cursor-pointer",
        "motion-safe:active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
      ) : icon ? (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="material-symbols-outlined text-[18px]">{iconRight}</span>
      )}
    </button>
  );
}
