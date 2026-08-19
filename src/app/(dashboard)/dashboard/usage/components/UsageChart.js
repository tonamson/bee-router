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
  ReferenceLine,
} from "recharts";
import Card from "@/shared/components/Card";

const fmtTokens = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n || 0));
};

const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;
const fmtReqs = (n) => `${(n || 0).toLocaleString()} reqs`;

// Custom High-Tech Cyber Tooltip
function CustomChartTooltip({ active, payload, label, viewMode }) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload || {};
  const totalTokens = dataPoint.tokens || 0;
  const promptTokens = dataPoint.promptTokens || 0;
  const completionTokens = dataPoint.completionTokens || 0;
  const cost = dataPoint.cost || 0;
  const requests = dataPoint.requests || 0;

  return (
    <div className="rounded-xl border border-[#FFC700]/30 bg-[#12141A]/95 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_16px_rgba(255,199,0,0.15)] backdrop-blur-xl font-mono text-xs z-50 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-[#282B37] pb-2 mb-2.5">
        <span className="text-gray-300 font-semibold">{label}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFC700]/10 text-[#FFC700] border border-[#FFC700]/20 font-bold uppercase">
          {viewMode}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {viewMode === "tokens" ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="size-2 rounded-full bg-[#FFC700]" />
                Prompt (Input):
              </span>
              <span className="text-[#FFC700] font-bold">{fmtTokens(promptTokens)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="size-2 rounded-full bg-[#10B981]" />
                Completion (Output):
              </span>
              <span className="text-[#10B981] font-bold">{fmtTokens(completionTokens)}</span>
            </div>
            <div className="border-t border-[#282B37]/60 pt-1.5 mt-0.5 flex items-center justify-between text-gray-300 font-semibold">
              <span>Total Tokens:</span>
              <span className="text-white">{fmtTokens(totalTokens)}</span>
            </div>
          </>
        ) : viewMode === "cost" ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="size-2 rounded-full bg-[#F59E0B]" />
                Cost:
              </span>
              <span className="text-[#F59E0B] font-bold">{fmtCost(cost)}</span>
            </div>
            {totalTokens > 0 && (
              <div className="flex items-center justify-between gap-4 text-[11px] text-gray-500">
                <span>Tokens Volume:</span>
                <span>{fmtTokens(totalTokens)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="size-2 rounded-full bg-[#38BDF8]" />
              Requests:
            </span>
            <span className="text-[#38BDF8] font-bold">{fmtReqs(requests)}</span>
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

  // Aggregate Metrics for Header
  const summary = useMemo(() => {
    if (!Array.isArray(data) || !data.length) {
      return { totalTokens: 0, totalCost: 0, totalRequests: 0, peakTokens: 0, peakCost: 0, promptRatio: 0 };
    }
    let totalTokens = 0;
    let totalPrompt = 0;
    let totalCompletion = 0;
    let totalCost = 0;
    let totalRequests = 0;
    let peakTokens = 0;
    let peakCost = 0;

    data.forEach((d) => {
      const t = d.tokens || (d.promptTokens || 0) + (d.completionTokens || 0);
      const c = d.cost || 0;
      const r = d.requests || 0;
      totalTokens += t;
      totalPrompt += d.promptTokens || 0;
      totalCompletion += d.completionTokens || 0;
      totalCost += c;
      totalRequests += r;
      if (t > peakTokens) peakTokens = t;
      if (c > peakCost) peakCost = c;
    });

    const promptRatio = totalTokens > 0 ? Math.round((totalPrompt / totalTokens) * 100) : 0;
    return { totalTokens, totalCost, totalRequests, peakTokens, peakCost, promptRatio };
  }, [data]);

  return (
    <Card className="relative flex min-w-0 flex-col gap-4 p-4 sm:p-5 overflow-hidden border-[#282B37] bg-[#12141A]/90 backdrop-blur-xl shadow-xl">
      {/* Background Cyber Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-80 h-32 bg-[#FFC700]/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Header & Interactive Switcher */}
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#282B37]/80 pb-3.5">
        {/* Title & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#FFC700]">monitoring</span>
            <h3 className="text-sm font-bold text-white tracking-tight">Throughput &amp; Cost Flow</h3>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded-md bg-[#16181F] border border-[#282B37] text-gray-400">
              Total: <strong className="text-white">{viewMode === "cost" ? fmtCost(summary.totalCost) : fmtTokens(summary.totalTokens)}</strong>
            </span>
            {viewMode === "tokens" && summary.totalTokens > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-[#16181F] border border-[#282B37] text-gray-400">
                In/Out: <strong className="text-[#FFC700]">{summary.promptRatio}%</strong> / <strong className="text-[#10B981]">{100 - summary.promptRatio}%</strong>
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-[#16181F] border border-[#282B37] text-gray-400">
              Peak: <strong className="text-amber-400">{viewMode === "cost" ? fmtCost(summary.peakCost) : fmtTokens(summary.peakTokens)}</strong>
            </span>
          </div>
        </div>

        {/* View Mode Pills */}
        <div className="inline-flex items-center gap-1 rounded-xl bg-[#0D0E12] border border-[#282B37] p-1 self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode("tokens")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              viewMode === "tokens"
                ? "bg-[#FFC700] text-black shadow-[0_0_12px_rgba(255,199,0,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-[#16181F]"
            }`}
          >
            Tokens
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cost")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              viewMode === "cost"
                ? "bg-[#FFC700] text-black shadow-[0_0_12px_rgba(255,199,0,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-[#16181F]"
            }`}
          >
            Cost
          </button>
          <button
            type="button"
            onClick={() => setViewMode("requests")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              viewMode === "requests"
                ? "bg-[#FFC700] text-black shadow-[0_0_12px_rgba(255,199,0,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-[#16181F]"
            }`}
          >
            Requests
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-500 font-mono text-xs">
          <div className="size-8 rounded-full border-2 border-[#FFC700] border-t-transparent animate-spin" />
          <span>Rendering telemetry stream...</span>
        </div>
      ) : !hasData ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-500 font-mono text-xs bg-[#0D0E12]/50 rounded-xl border border-[#282B37]/60">
          <span className="material-symbols-outlined text-[32px] text-gray-600">query_stats</span>
          <span>No traffic recorded for period: {period.toUpperCase()}</span>
        </div>
      ) : (
        <div className="h-64 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
              <defs>
                {/* Tokens Gradients */}
                <linearGradient id="cyberPrompt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFC700" stopOpacity={0.45} />
                  <stop offset="70%" stopColor="#FFC700" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#FFC700" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cyberCompletion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                  <stop offset="70%" stopColor="#10B981" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>

                {/* Cost Gradient */}
                <linearGradient id="cyberCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.5} />
                  <stop offset="70%" stopColor="#F59E0B" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>

                {/* Requests Gradient */}
                <linearGradient id="cyberReqs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.5} />
                  <stop offset="70%" stopColor="#38BDF8" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} stroke="#282B37" vertical={false} />
              
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "monospace" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(40, 43, 55, 0.8)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "monospace" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={viewMode === "tokens" ? fmtTokens : viewMode === "cost" ? fmtCost : fmtTokens}
                width={56}
              />

              <Tooltip content={<CustomChartTooltip viewMode={viewMode} />} cursor={{ stroke: "#FFC700", strokeWidth: 1, strokeDasharray: "4 4" }} />

              {viewMode === "tokens" ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="promptTokens"
                    name="Prompt Tokens"
                    stackId="1"
                    stroke="#FFC700"
                    strokeWidth={2}
                    fill="url(#cyberPrompt)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#FFC700", stroke: "#0D0E12", strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completionTokens"
                    name="Completion Tokens"
                    stackId="1"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#cyberCompletion)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#10B981", stroke: "#0D0E12", strokeWidth: 2 }}
                  />
                </>
              ) : viewMode === "cost" ? (
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Cost"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  fill="url(#cyberCost)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#F59E0B", stroke: "#0D0E12", strokeWidth: 2 }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="requests"
                  name="Requests"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  fill="url(#cyberReqs)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#38BDF8", stroke: "#0D0E12", strokeWidth: 2 }}
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
