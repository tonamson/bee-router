"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "@/shared/components/Card";

const fmtTokens = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n || 0));
};

const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;
const fmtReqs = (n) => `${(n || 0).toLocaleString()} reqs`;

function CustomChartTooltip({ active, payload, label, viewMode }) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload || {};
  const totalTokens = dataPoint.tokens || (dataPoint.promptTokens || 0) + (dataPoint.completionTokens || 0);
  const promptTokens = dataPoint.promptTokens || 0;
  const completionTokens = dataPoint.completionTokens || 0;
  const cost = dataPoint.cost || 0;
  const requests = dataPoint.requests || 0;

  return (
    <div className="rounded-xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur-md text-xs font-mono z-50 min-w-[180px]">
      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2">
        <span className="font-semibold text-text-main">{label}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-text-muted font-bold uppercase">
          {viewMode}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {viewMode === "tokens" ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-text-muted">
                <span className="size-2 rounded-full bg-brand-500" />
                Prompt (In):
              </span>
              <span className="font-bold text-text-main">{fmtTokens(promptTokens)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-text-muted">
                <span className="size-2 rounded-full bg-emerald-500" />
                Completion (Out):
              </span>
              <span className="font-bold text-text-main">{fmtTokens(completionTokens)}</span>
            </div>
            <div className="border-t border-border pt-1 mt-0.5 flex items-center justify-between font-semibold text-text-main">
              <span>Total:</span>
              <span>{fmtTokens(totalTokens)}</span>
            </div>
          </>
        ) : viewMode === "cost" ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-text-muted">
                <span className="size-2 rounded-full bg-amber-500" />
                Cost:
              </span>
              <span className="font-bold text-amber-500">{fmtCost(cost)}</span>
            </div>
            {totalTokens > 0 && (
              <div className="flex items-center justify-between gap-4 text-[11px] text-text-muted">
                <span>Tokens:</span>
                <span>{fmtTokens(totalTokens)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="size-2 rounded-full bg-blue-500" />
              Requests:
            </span>
            <span className="font-bold text-text-main">{fmtReqs(requests)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

CustomChartTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  viewMode: PropTypes.string,
};

export default function UsageChart({ period = "7d", data: externalData }) {
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(!externalData);
  const [viewMode, setViewMode] = useState("tokens");

  const fetchData = useCallback(async () => {
    if (externalData) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/usage/chart?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setFetched(json);
      }
    } catch (e) {
      console.error("Failed to fetch chart data:", e);
    } finally {
      setLoading(false);
    }
  }, [period, externalData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const data = externalData || fetched;
  const hasData = useMemo(() => {
    return Array.isArray(data) && data.some((d) => d.tokens > 0 || d.cost > 0 || d.requests > 0);
  }, [data]);

  return (
    <Card className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      {/* Header: Title + Mode Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[10px] bg-surface-2 text-text-muted">
            <span className="material-symbols-outlined text-[20px]">show_chart</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-main">Usage Trends</h3>
            <p className="text-xs text-text-muted">Throughput and cost across the selected period</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("tokens")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "tokens"
                ? "bg-brand-500 text-black shadow-xs"
                : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
          >
            Tokens
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cost")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "cost"
                ? "bg-brand-500 text-black shadow-xs"
                : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
          >
            Cost
          </button>
          <button
            type="button"
            onClick={() => setViewMode("requests")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "requests"
                ? "bg-brand-500 text-black shadow-xs"
                : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
          >
            Requests
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      {loading ? (
        <div className="h-56 flex items-center justify-center text-text-muted text-sm">
          Loading chart data...
        </div>
      ) : !hasData ? (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-text-muted text-sm border border-dashed border-border rounded-xl">
          <span className="material-symbols-outlined text-[28px] text-text-subtle">query_stats</span>
          <span>No usage activity recorded for this period</span>
        </div>
      ) : (
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTokensPrompt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#eab308" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradTokensComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradCostCrm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradReqsCrm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
              
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)", opacity: 0.6 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={viewMode === "tokens" ? fmtTokens : viewMode === "cost" ? fmtCost : fmtTokens}
                width={52}
              />

              <Tooltip content={<CustomChartTooltip viewMode={viewMode} />} />

              {viewMode === "tokens" ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="promptTokens"
                    name="Prompt"
                    stackId="1"
                    stroke="#eab308"
                    strokeWidth={2}
                    fill="url(#gradTokensPrompt)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#eab308" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completionTokens"
                    name="Completion"
                    stackId="1"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradTokensComp)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#10b981" }}
                  />
                </>
              ) : viewMode === "cost" ? (
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Cost"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradCostCrm)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#f59e0b" }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="requests"
                  name="Requests"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#gradReqsCrm)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#3b82f6" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

UsageChart.propTypes = {
  period: PropTypes.string,
  data: PropTypes.array,
};
