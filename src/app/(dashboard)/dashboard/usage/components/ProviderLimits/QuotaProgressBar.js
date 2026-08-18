"use client";

import { cn } from "@/shared/utils/cn";
import { formatResetTime } from "./utils";

// Calculate color and gradient classes based on remaining percentage
const getColorClasses = (remainingPercentage) => {
  const pct = Number(remainingPercentage) || 0;
  if (pct > 70) {
    return {
      text: "text-brand-500 dark:text-brand-400 font-bold",
      barGradient: "bg-gradient-to-r from-[#FFC700] via-[#FFD700] to-[#F59E0B]",
      trackBg: "bg-surface-2 dark:bg-black/60 border border-brand-500/20",
      dotBg: "bg-brand-400 shadow-[0_0_8px_rgba(255,199,0,0.8)]",
    };
  }
  
  if (pct >= 30) {
    return {
      text: "text-amber-500 dark:text-amber-400 font-bold",
      barGradient: "bg-gradient-to-r from-[#F59E0B] to-[#D97706]",
      trackBg: "bg-surface-2 dark:bg-black/60 border border-amber-500/20",
      dotBg: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
    };
  }
  
  // 0-29% including 0% (out of quota) - show critical red/rose
  return {
    text: "text-rose-500 dark:text-rose-400 font-bold",
    barGradient: "bg-gradient-to-r from-rose-500 to-red-600",
    trackBg: "bg-surface-2 dark:bg-black/60 border border-rose-500/20",
    dotBg: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse",
  };
};

// Format reset time display
const formatResetTimeDisplay = (resetTime) => {
  if (!resetTime) return null;
  
  try {
    const resetDate = new Date(resetTime);
    const now = new Date();
    const isToday = resetDate.toDateString() === now.toDateString();
    const isTomorrow = resetDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    
    const timeStr = resetDate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    
    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    
    return resetDate.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
};

export default function QuotaProgressBar({
  percentage = 0,
  label = "",
  used = 0,
  total = 0,
  unlimited = false,
  resetTime = null,
  recurring = true,
}) {
  const colors = getColorClasses(percentage);
  const countdown = formatResetTime(resetTime);
  const resetDisplay = formatResetTimeDisplay(resetTime);

  // recurring defaults true. One-shot packs (e.g. CodeBuddy CN bonus packs)
  // set recurring:false: resetTime is a hard expiry, so word it as "expires".
  const resetWord = recurring ? "Reset" : "Expires";

  // percentage is already remaining percentage (from ProviderLimitCard)
  const remaining = percentage;
  
  return (
    <div className="space-y-2.5">
      {/* Label and percentage */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-text-primary">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", colors.dotBg)} />
          <span className={cn("font-mono text-xs tabular-nums", colors.text)}>
            {remaining}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {!unlimited && (
        <div className={cn("h-2.5 w-full rounded-full overflow-hidden", colors.trackBg)}>
          <div
            className={cn("h-full rounded-full transition-all duration-500", colors.barGradient)}
            style={{ width: `${Math.max(0, Math.min(remaining ?? 0, 100))}%` }}
          />
        </div>
      )}

      {/* Usage details and countdown */}
      <div className="flex items-center justify-between text-xs text-text-muted gap-2">
        <span className="font-mono text-[11px]">
          {used.toLocaleString()} / {total.toLocaleString()} requests
        </span>
        {countdown !== "-" && (
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[13px] text-brand-400">timer</span>
            <span className="text-[11px] text-text-muted">{resetWord} in</span>
            <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-black/40 dark:bg-black/60 border border-brand-500/30 text-brand-300 shadow-[0_0_6px_rgba(255,199,0,0.1)] tabular-nums">
              {countdown}
            </span>
          </div>
        )}
      </div>

      {/* Reset time display */}
      {resetDisplay && (
        <div className="text-[11px] text-text-muted/70 flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px] text-text-subtle">schedule</span>
          <span>{resetWord} at {resetDisplay}</span>
        </div>
      )}
    </div>
  );
}
