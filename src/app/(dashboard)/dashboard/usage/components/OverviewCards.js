"use client";

import PropTypes from "prop-types";
import MetricCard from "@/shared/components/MetricCard";

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
      <MetricCard
        title="Total Requests"
        value={fmt(stats.totalRequests)}
        icon="send"
        variant="default"
        subtext="Active gateway"
      />

      <MetricCard
        title="Input Tokens"
        value={fmt(stats.totalPromptTokens)}
        icon="input"
        variant="brand"
        subtext="Prompt payload"
      />

      <MetricCard
        title="Cached Tokens"
        value={fmt(stats.totalCachedTokens)}
        icon="offline_bolt"
        variant="blue"
        subtext="Provider cache"
      />

      <MetricCard
        title="Output Tokens"
        value={fmt(stats.totalCompletionTokens)}
        icon="output"
        variant="emerald"
        subtext="Completions"
      />

      <MetricCard
        title="Est. Cost"
        value={`~${fmtCost(stats.totalCost)}`}
        icon="monetization_on"
        variant="amber"
        subtext="Calculated rates"
      />

      <MetricCard
        title="Token Save"
        value={`~${fmtUsd(save.costSavedEst)}`}
        icon="savings"
        variant="brand"
        subtext="Savings saved"
      />
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
