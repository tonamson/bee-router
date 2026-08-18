"use client";

import { useTheme } from "@/shared/hooks/useTheme";
import { cn } from "@/shared/utils/cn";

export default function ThemeToggle({ className, variant = "default" }) {
  const { isDark, toggleTheme } = useTheme();

  const variants = {
    default: cn(
      "flex items-center justify-center size-9 rounded-full",
      "text-text-muted hover:text-brand-500",
      "hover:bg-surface-2 transition-all duration-150 cursor-pointer"
    ),
    card: cn(
      "flex items-center justify-center size-10 rounded-full",
      "bg-surface/80 hover:bg-surface",
      "border border-border hover:border-brand-500/40",
      "backdrop-blur-md shadow-sm hover:shadow-[var(--shadow-honey-glow)]",
      "text-text-muted hover:text-brand-500",
      "transition-all duration-200 group cursor-pointer"
    ),
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(variants[variant] || variants.default, className)}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span
        className={cn(
          "material-symbols-outlined text-[20px] transition-transform duration-300",
          isDark ? "text-brand-400 group-hover:rotate-45" : "text-amber-600 group-hover:rotate-12"
        )}
      >
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
