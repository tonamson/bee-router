"use client";

import { useEffect, useMemo, useState } from "react";
import { formatResetTime, getRemainingPercentage } from "./utils";

const PAGE_SIZE = 10;

/**
 * Format reset time display (Today, 12:00 PM)
 */
function formatResetTimeDisplay(resetTime) {
  if (!resetTime) return null;

  try {
    const date = new Date(resetTime);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dayStr = "";
    if (date >= today && date < tomorrow) {
      dayStr = "Today";
    } else if (date >= tomorrow && date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
      dayStr = "Tomorrow";
    } else {
      dayStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${dayStr}, ${timeStr}`;
  } catch {
    return null;
  }
}

function getColorClasses(remainingPercentage) {
  if (remainingPercentage > 70) {
    return {
      text: "text-brand-400 font-semibold",
      barGradient: "bg-gradient-to-r from-[#FFC700] via-[#FFD700] to-[#F59E0B]",
      dotBg: "bg-brand-400 shadow-[0_0_8px_rgba(255,199,0,0.8)]",
      trackBg: "bg-black/30 dark:bg-black/50 border border-brand-500/20",
    };
  }

  if (remainingPercentage >= 30) {
    return {
      text: "text-amber-400 font-semibold",
      barGradient: "bg-gradient-to-r from-[#F59E0B] to-[#D97706]",
      dotBg: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
      trackBg: "bg-black/30 dark:bg-black/50 border border-amber-500/20",
    };
  }

  return {
    text: "text-rose-400 font-semibold",
    barGradient: "bg-gradient-to-r from-rose-500 to-red-600",
    dotBg: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse",
    trackBg: "bg-black/30 dark:bg-black/50 border border-rose-500/20",
  };
}

function sortQuotas(quotas, sortMode) {
  if (sortMode === "remaining-asc") {
    return [...quotas].sort((a, b) => a.remaining - b.remaining || a.name.localeCompare(b.name));
  }

  if (sortMode === "remaining-desc") {
    return [...quotas].sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));
  }

  return quotas;
}

/**
 * Quota Table Component - Table-based display for quota data
 */
export default function QuotaTable({
  quotas = [],
  compact = false,
  sortMode = "default",
  showSortLabel = false,
  onHideQuota = null,
}) {
  const [page, setPage] = useState(1);

  const normalizedQuotas = useMemo(
    () => quotas.map((quota, index) => ({
      ...quota,
      index,
      remaining: getRemainingPercentage(quota),
    })),
    [quotas],
  );

  const sortedQuotas = useMemo(
    () => sortQuotas(normalizedQuotas, sortMode),
    [normalizedQuotas, sortMode],
  );

  const totalPages = Math.max(1, Math.ceil(sortedQuotas.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [sortMode, quotas]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  if (!quotas || quotas.length === 0) {
    return null;
  }

  const currentPageRows = sortedQuotas.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const pageStart = sortedQuotas.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, sortedQuotas.length);

  const cellPad = compact ? "py-1 px-1.5" : "py-2 px-3";
  const nameText = compact ? "text-[11px]" : "text-sm";
  const resetPrimary = compact ? "text-[11px]" : "text-sm";
  const resetSecondary = compact ? "text-[10px] leading-tight" : "text-xs";
  const sortLabel = "Sorted by account remaining";
  const hasHideAction = typeof onHideQuota === "function";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] text-text-muted">
          {sortedQuotas.length} quota{sortedQuotas.length > 1 ? "s" : ""}
        </div>
        {showSortLabel && (
          <div className="rounded-md border border-black/10 bg-black/[0.02] px-2 py-1 text-[10px] text-text-muted dark:border-white/10 dark:bg-white/[0.03]">
            {sortLabel}
          </div>
        )}
      </div>

      <div className="space-y-px">
        {currentPageRows.map((quota) => {
          const colors = getColorClasses(quota.remaining);
          const countdown = formatResetTime(quota.resetAt);
          const resetDisplay = formatResetTimeDisplay(quota.resetAt);
          // recurring defaults true: a missing flag means the quota
          // refreshes at resetAt. Bonus/one-shot packs set recurring:false
          // and their resetAt is a hard expiry, so word it as "expires".
          const recurring = quota.recurring !== false;
          const countdownLabel = recurring ? `in ${countdown}` : `expires in ${countdown}`;

          return (
            <div
              key={`${quota.name}-${quota.index}`}
              className={`flex items-center gap-2.5 border-b border-border/50 hover:bg-surface-2/40 transition-colors ${cellPad}`}
            >
              {/* Name */}
              <div className="flex w-36 min-w-0 items-center gap-2">
                <span className={`size-1.5 rounded-full ${colors.dotBg} shrink-0`} />
                <span className={`${nameText} font-medium text-text-primary truncate`}>
                  {quota.name}
                </span>
              </div>

              {/* Progress + used/total */}
              <div className={`min-w-0 flex-1 ${compact ? "space-y-1" : "space-y-1.5"}`}>
                <div className={`${compact ? "h-1" : "h-1.5"} rounded-full overflow-hidden p-0.5 ${colors.trackBg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${colors.barGradient}`}
                    style={{ width: `${Math.min(quota.remaining, 100)}%` }}
                  />
                </div>

                <div className={`flex items-center justify-between gap-1 min-w-0 ${compact ? "text-[10px]" : "text-xs"}`}>
                  <span
                    className="text-text-muted font-mono truncate"
                    title={`${quota.used.toLocaleString()} / ${quota.total > 0 ? quota.total.toLocaleString() : "∞"}`}
                  >
                    {quota.used.toLocaleString()} / {quota.total > 0 ? quota.total.toLocaleString() : "∞"}
                  </span>
                  <span className={`font-mono text-[11px] font-semibold ${colors.text} shrink-0 tabular-nums`}>
                    {quota.remaining}%
                  </span>
                </div>
              </div>

              {/* Reset time */}
              <div className="min-w-0 shrink">
                {countdown !== "-" || resetDisplay ? (
                  compact ? (
                    <div
                      className={`${resetPrimary} font-mono text-[11px] font-semibold text-brand-400 truncate`}
                      title={resetDisplay || ""}
                    >
                      {countdown !== "-" ? countdownLabel : resetDisplay}
                    </div>
                  ) : (
                    <div className="min-w-0 space-y-0.5">
                      {countdown !== "-" && (
                        <div className={`${resetPrimary} font-mono text-[11px] font-semibold text-brand-400 truncate flex items-center gap-1`}>
                          <span className="material-symbols-outlined text-[12px] text-brand-400">timer</span>
                          <span>{countdownLabel}</span>
                        </div>
                      )}
                      {resetDisplay && (
                        <div className={`${resetSecondary} text-text-muted truncate`}>
                          {resetDisplay}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className={`${resetPrimary} text-text-muted italic`}>N/A</div>
                )}
              </div>

              {/* Hide action */}
              {hasHideAction && (
                <button
                  type="button"
                  onClick={() => onHideQuota(quota)}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary dark:hover:bg-white/5"
                  title="Hide this quota row"
                  aria-label={`Hide quota ${quota.name}`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    visibility_off
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="rounded-md border border-black/10 bg-black/[0.02] px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between gap-2 text-[10px] text-text-muted">
            <span>
              Showing {pageStart}-{pageEnd} of {sortedQuotas.length}
            </span>
            <span>
              Page {page} / {totalPages}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={page === 1}
              className="flex h-6 items-center rounded-md border border-black/10 px-2 text-[10px] text-text-primary transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              disabled={page === totalPages}
              className="flex h-6 items-center rounded-md border border-black/10 px-2 text-[10px] text-text-primary transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
