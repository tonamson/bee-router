"use client";

import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Card from "@/shared/components/Card";

const fmtTokens = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
};

const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;

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
  const hasData = data.some((d) => d.tokens > 0 || d.cost > 0);

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <div className="grid w-full grid-cols-2 items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1 sm:w-auto sm:self-start">
        <button
          onClick={() => setViewMode("tokens")}
          className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
            viewMode === "tokens"
              ? "bg-brand-500 text-black shadow-[0_2px_8px_rgba(255,199,0,0.3)]"
              : "text-text-muted hover:text-text-main hover:bg-surface-2"
          }`}
        >
          Tokens
        </button>
        <button
          onClick={() => setViewMode("cost")}
          className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
            viewMode === "cost"
              ? "bg-brand-500 text-black shadow-[0_2px_8px_rgba(255,199,0,0.3)]"
              : "text-text-muted hover:text-text-main hover:bg-surface-2"
          }`}
        >
          Cost
        </button>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">Loading...</div>
      ) : !hasData ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">No data for this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTokens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFC700" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#F59E0B" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#D97706" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} stroke="#282B37" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(40, 43, 55, 0.6)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(40, 43, 55, 0.6)" }}
              tickFormatter={viewMode === "tokens" ? fmtTokens : fmtCost}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(22, 24, 31, 0.95)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 199, 0, 0.3)",
                borderRadius: "10px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 199, 0, 0.15)",
                padding: "8px 12px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#9ca3af", marginBottom: "4px", fontWeight: 500 }}
              itemStyle={{ color: "#FFC700", fontWeight: 600 }}
              formatter={(value, name) =>
                name === "tokens" ? [fmtTokens(value), "Tokens"] : [fmtCost(value), "Cost"]
              }
            />
            {viewMode === "tokens" ? (
              <Area
                type="monotone"
                dataKey="tokens"
                stroke="#FFC700"
                strokeWidth={2.5}
                fill="url(#gradTokens)"
                dot={false}
                activeDot={{ r: 5, fill: "#FFC700", stroke: "#0D0E12", strokeWidth: 2 }}
              />
            ) : (
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#F59E0B"
                strokeWidth={2.5}
                fill="url(#gradCost)"
                dot={false}
                activeDot={{ r: 5, fill: "#F59E0B", stroke: "#0D0E12", strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

UsageChart.propTypes = {
  period: PropTypes.string,
  data: PropTypes.array,
};
