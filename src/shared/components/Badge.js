"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  default: "bg-surface-2 text-text-muted border border-border-subtle",
  brand: "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30",
  honey: "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30",
  primary: "bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30",
  success: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  error: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  className,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            variant === "success" && "bg-green-500",
            variant === "warning" && "bg-amber-500",
            variant === "error" && "bg-red-500",
            variant === "info" && "bg-blue-500",
            (variant === "primary" || variant === "brand" || variant === "honey") &&
              "bg-brand-500 shadow-[0_0_6px_rgba(255,199,0,0.6)]",
            variant === "default" && "bg-text-subtle"
          )}
        />
      )}
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      {children}
    </span>
  );
}
