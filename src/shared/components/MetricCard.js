"use client";

import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";
import Card from "./Card";

/**
 * MetricCard - Enterprise-grade KPI metric card
 * Follows Linear / Vercel design system with high data-density and crisp typography.
 */
export default function MetricCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  delta,
  deltaType = "positive", // "positive" | "negative" | "neutral"
  deltaLabel,
  subtext,
  variant = "default",
  className,
  children,
  onClick,
  ...props
}) {
  const variantStyles = {
    default: "hover:border-border transition-all",
    brand: "hover:border-brand-500/40 hover:shadow-[0_0_20px_rgba(255,199,0,0.12)] transition-all",
    blue: "hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] transition-all",
    emerald: "hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.12)] transition-all",
    amber: "hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.12)] transition-all",
    rose: "hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.12)] transition-all",
  };

  const valueColors = {
    default: "text-text-main",
    brand: "text-brand-400",
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };

  const defaultIconColors = {
    default: "text-text-muted bg-surface-2",
    brand: "text-brand-400 bg-brand-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    rose: "text-rose-400 bg-rose-500/10",
  };

  return (
    <Card
      className={cn(
        "flex min-w-0 flex-col justify-between gap-3 px-4 py-3.5 border-border/80",
        variantStyles[variant] || variantStyles.default,
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {/* Top row: Title and Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-muted text-[11px] uppercase font-semibold tracking-wider truncate">
          {title}
        </span>
        {icon && (
          <div
            className={cn(
              "size-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
              iconBg || defaultIconColors[variant] || defaultIconColors.default,
              iconColor
            )}
          >
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="min-w-0">
        <div className={cn("truncate text-2xl font-bold tracking-tight font-mono", valueColors[variant] || valueColors.default)}>
          {value}
        </div>

        {/* Bottom row: Delta indicator or Subtext */}
        {(delta !== undefined || subtext || deltaLabel) && (
          <div className="flex items-center gap-1.5 mt-1 text-[11px]">
            {delta !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded text-[10px]",
                  deltaType === "positive" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                  deltaType === "negative" && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                  deltaType === "neutral" && "bg-surface-2 text-text-muted border border-border/40"
                )}
              >
                {deltaType === "positive" ? "↑" : deltaType === "negative" ? "↓" : "•"} {delta}
              </span>
            )}
            {deltaLabel && (
              <span className="text-text-muted truncate">{deltaLabel}</span>
            )}
            {subtext && !deltaLabel && (
              <div className="flex items-center gap-1 text-text-muted truncate">
                <span
                  className={cn(
                    "size-1.5 rounded-full shrink-0",
                    variant === "brand" ? "bg-brand-400" : variant === "emerald" ? "bg-emerald-400" : variant === "blue" ? "bg-blue-400" : variant === "amber" ? "bg-amber-400" : "bg-text-subtle"
                  )}
                />
                <span className="truncate">{subtext}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {children}
    </Card>
  );
}

MetricCard.propTypes = {
  title: PropTypes.node.isRequired,
  value: PropTypes.node.isRequired,
  icon: PropTypes.string,
  iconBg: PropTypes.string,
  iconColor: PropTypes.string,
  delta: PropTypes.node,
  deltaType: PropTypes.oneOf(["positive", "negative", "neutral"]),
  deltaLabel: PropTypes.node,
  subtext: PropTypes.node,
  variant: PropTypes.oneOf(["default", "brand", "blue", "emerald", "amber", "rose"]),
  className: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
};
