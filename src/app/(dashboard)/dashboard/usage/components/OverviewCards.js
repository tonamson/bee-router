"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;
function fmtUsd(n) {
  const v = Number(n) || 0;
  if (v <= 0) return "$0.00";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 10) return `$${v.toFixed(3).replace(/0$/, "")}`;
  return `$${v.toFixed(2)}`;
}

export default function OverviewCards({ stats }) {
  const save = stats.tokenSave || {};
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 sm:gap-4">
      <Card className="flex min-w-0 flex-col justify-between gap-2 px-4 py-3 border-border/80 hover:border-brand-500/40 hover:shadow-[0_0_15px_rgba(255,199,0,0.08)] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs uppercase font-semibold tracking-wider">Total Requests</span>
          <div className="size-7 rounded-lg bg-surface-2 flex items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-[16px]">send</span>
          </div>
        </div>
        <div>
          <span className="truncate text-2xl font-bold text-text-main">{fmt(stats.totalRequests)}</span>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
            <span className="size-1.5 rounded-full bg-brand-500" />
            <span>Active gateway</span>
          </div>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col justify-between gap-2 px-4 py-3 border-border/80 hover:border-brand-500/40 hover:shadow-[0_0_15px_rgba(255,199,0,0.08)] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs uppercase font-semibold tracking-wider">Input Tokens</span>
          <div className="size-7 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
            <span className="material-symbols-outlined text-[16px]">input</span>
          </div>
        </div>
        <div>
          <span className="truncate text-2xl font-bold text-brand-400">{fmt(stats.totalPromptTokens)}</span>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
            <span className="size-1.5 rounded-full bg-brand-400" />
            <span>Prompt payload</span>
          </div>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col justify-between gap-2 px-4 py-3 border-border/80 hover:border-blue-500/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs uppercase font-semibold tracking-wider">Cached Tokens</span>
          <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <span className="material-symbols-outlined text-[16px]">offline_bolt</span>
          </div>
        </div>
        <div>
          <span className="truncate text-2xl font-bold text-blue-400">{fmt(stats.totalCachedTokens)}</span>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
            <span className="size-1.5 rounded-full bg-blue-400" />
            <span>Provider cache</span>
          </div>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col justify-between gap-2 px-4 py-3 border-border/80 hover:border-emerald-500/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs uppercase font-semibold tracking-wider">Output Tokens</span>
          <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-[16px]">output</span>
          </div>
        </div>
        <div>
          <span className="truncate text-2xl font-bold text-emerald-400">{fmt(stats.totalCompletionTokens)}</span>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Completions</span>
          </div>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col justify-between gap-2 px-4 py-3 border-border/80 hover:border-amber-500/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs uppercase font-semibold tracking-wider">Est. Cost</span>
          <div className="size-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-[16px]">monetization_on</span>
          </div>
        </div>
        <div>
          <span className="truncate text-2xl font-bold text-amber-400">~{fmtCost(stats.totalCost)}</span>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted">
            <span className="size-1.5 rounded-full bg-amber-400" />
            <span>Calculated rates</span>
          </div>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col justify-between gap-2 px-4 py-3 border-border/80 hover:border-brand-500/40 hover:shadow-[0_0_15px_rgba(255,199,0,0.08)] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs uppercase font-semibold tracking-wider">Token Save</span>
          <div className="size-7 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
            <span className="material-symbols-outlined text-[16px]">savings</span>
          </div>
        </div>
        <div>
          <span className="truncate text-2xl font-bold text-brand-400">~{fmtUsd(save.costSavedEst)}</span>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-brand-500/90 font-medium">
            <span className="size-1.5 rounded-full bg-brand-500 shadow-[0_0_6px_rgba(255,199,0,0.8)]" />
            <span>Savings saved</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
