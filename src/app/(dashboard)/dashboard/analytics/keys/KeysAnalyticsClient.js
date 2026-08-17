"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardSkeleton, SegmentedControl } from "@/shared/components";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
];

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;

function maskApiKey(key) {
  if (!key || typeof key !== "string") return "—";
  if (key.length <= 8) return `${key.charAt(0)}***`;
  return `${key.slice(0, 8)}***`;
}

function fmtTime(iso) {
  if (!iso) return "Never";
  const diffMins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (Number.isNaN(diffMins)) return iso;
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function emptyUsage() {
  return { requests: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, cost: 0, lastUsed: null };
}

function addUsage(target, row) {
  target.requests += row.requests || 0;
  target.promptTokens += row.promptTokens || 0;
  target.completionTokens += row.completionTokens || 0;
  target.cachedTokens += row.cachedTokens || 0;
  target.cost += row.cost || 0;
  if (row.lastUsed && (!target.lastUsed || row.lastUsed > target.lastUsed)) target.lastUsed = row.lastUsed;
}

function mergeKeyUsage(keys, byApiKey) {
  const byId = {};
  const byMask = {};
  for (const row of Object.values(byApiKey || {})) {
    const bucket = row.apiKeyId ? (byId[row.apiKeyId] ||= emptyUsage()) : (byMask[row.apiKeyKey] ||= emptyUsage());
    addUsage(bucket, row);
  }
  return keys.map((k) => {
    const masked = maskApiKey(k.key);
    const usage = byId[k.id] || byMask[masked] || emptyUsage();
    return { id: k.id, name: k.name, isActive: k.isActive, createdAt: k.createdAt, apiKeyMasked: masked, ...usage };
  });
}

export default function KeysAnalyticsClient() {
  const [period, setPeriod] = useState("7d");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [keysRes, statsRes] = await Promise.all([
        fetch("/api/keys"),
        fetch(`/api/usage/stats?period=${period}`),
      ]);
      if (!keysRes.ok) throw new Error("Failed to load keys");
      if (!statsRes.ok) throw new Error("Failed to load usage");
      const keysJson = await keysRes.json();
      const statsJson = await statsRes.json();
      setRows(mergeKeyUsage(keysJson.keys || [], statsJson.byApiKey));
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.requests || 0) - (a.requests || 0) || (a.name || "").localeCompare(b.name || "")),
    [rows]
  );

  return (
    <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">Usage per gateway API key. Open a key for model, provider, and chart detail.</p>
        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} size="sm" className="w-full sm:w-auto" />
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">{error}</p>
      )}

      {loading ? (
        <CardSkeleton />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-bg-subtle/30 text-text-muted uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Secret</th>
                  <th className="px-4 py-3 text-right">Requests</th>
                  <th className="px-4 py-3 text-right">Input</th>
                  <th className="px-4 py-3 text-right">Output</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Last used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                      No API keys yet. Create one on Endpoint.
                    </td>
                  </tr>
                )}
                {sorted.map((row) => (
                  <tr key={row.id} className="hover:bg-bg-subtle/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/analytics/keys/${row.id}`} className="font-medium text-primary hover:underline">
                        {row.name || "Untitled"}
                      </Link>
                      {row.isActive === false && (
                        <span className="ml-2 text-xs text-orange-500">Paused</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{row.apiKeyMasked}</td>
                    <td className="px-4 py-3 text-right">{fmt(row.requests)}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{fmt(row.promptTokens)}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{fmt(row.completionTokens)}</td>
                    <td className="px-4 py-3 text-right">{fmtCost(row.cost)}</td>
                    <td className="px-4 py-3 text-right text-text-muted whitespace-nowrap">{fmtTime(row.lastUsed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
