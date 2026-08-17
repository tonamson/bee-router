"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardSkeleton, ConfirmModal, SegmentedControl } from "@/shared/components";
import Pagination from "@/shared/components/Pagination";
import OverviewCards from "@/app/(dashboard)/dashboard/usage/components/OverviewCards";
import UsageChart from "@/app/(dashboard)/dashboard/usage/components/UsageChart";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
];

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;

function fmtTime(iso) {
  if (!iso) return "Never";
  const diffMins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (Number.isNaN(diffMins)) return iso;
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return new Date(iso).toLocaleString();
}

function BreakdownTable({ title, rows, nameKey, empty }) {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border bg-bg-subtle/50">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg-subtle/30 text-text-muted uppercase text-xs">
            <tr>
              <th className="px-4 py-3">{nameKey}</th>
              <th className="px-4 py-3 text-right">Requests</th>
              <th className="px-4 py-3 text-right">Input</th>
              <th className="px-4 py-3 text-right">Cached</th>
              <th className="px-4 py-3 text-right">Output</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Last used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">{empty}</td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-bg-subtle/30">
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3 text-right">{fmt(row.requests)}</td>
                <td className="px-4 py-3 text-right text-text-muted">{fmt(row.promptTokens)}</td>
                <td className="px-4 py-3 text-right text-text-muted">{row.cachedTokens ? fmt(row.cachedTokens) : "—"}</td>
                <td className="px-4 py-3 text-right text-text-muted">{fmt(row.completionTokens)}</td>
                <td className="px-4 py-3 text-right">{fmtCost(row.cost)}</td>
                <td className="px-4 py-3 text-right text-text-muted whitespace-nowrap">{fmtTime(row.lastUsed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function toRows(map, labelFn) {
  return Object.entries(map || {})
    .map(([key, data]) => ({
      key,
      label: labelFn(key, data),
      ...data,
    }))
    .sort((a, b) => (b.requests || 0) - (a.requests || 0));
}

export default function KeyUsageClient({ keyId }) {
  const [period, setPeriod] = useState("7d");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const res = await fetch(`/api/keys/${keyId}/usage?period=${period}&page=1&pageSize=${pageSize}`);
      if (res.status === 404) {
        setNotFound(true);
        setPayload(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to load key usage");
      setPayload(await res.json());
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [keyId, period, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [period, keyId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadHistory = useCallback(async (nextPage, nextSize) => {
    setHistoryLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/keys/${keyId}/usage?view=history&period=${period}&page=${nextPage}&pageSize=${nextSize}`
      );
      if (!res.ok) throw new Error("Failed to load history");
      const json = await res.json();
      setPayload((prev) => (prev ? { ...prev, history: json.history, recentRequests: json.history?.items || [] } : prev));
    } catch (e) {
      setError(e.message || "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, [keyId, period]);

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    loadHistory(nextPage, pageSize);
  };

  const handlePageSizeChange = (nextSize) => {
    setPage(1);
    setPageSize(nextSize);
  };

  const clearUsage = async () => {
    setClearing(true);
    try {
      const res = await fetch(`/api/keys/${keyId}/usage`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear usage");
      setClearOpen(false);
      await load();
    } catch (e) {
      setError(e.message || "Failed to clear");
    } finally {
      setClearing(false);
    }
  };

  if (notFound) {
    return (
      <div className="flex flex-col gap-3 px-1 sm:px-0">
        <p className="text-sm text-text-muted">API key not found.</p>
        <Link href="/dashboard/analytics/keys" className="text-sm text-primary hover:underline">Back to API key analytics</Link>
      </div>
    );
  }

  const key = payload?.key;
  const modelRows = toRows(payload?.byModel, (_, d) => d.rawModel || "Unknown");
  const providerRows = toRows(payload?.byProvider, (k, d) => d.provider || k);
  const endpointRows = toRows(payload?.byEndpoint, (_, d) => d.endpoint || "Unknown");

  return (
    <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard/analytics/keys" className="text-xs text-primary hover:underline">All API keys</Link>
          <h2 className="text-lg font-semibold mt-1">{key?.name || "API key"}</h2>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            {key?.apiKeyMasked || "—"}
            {key?.isActive === false && <span className="ml-2 text-orange-500 font-sans">Paused</span>}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} size="sm" className="w-full sm:w-auto" />
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            className="text-xs text-orange-500 hover:underline self-start sm:self-end"
          >
            Clear usage
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-error" role="alert">{error}</p>}

      {loading && !payload ? (
        <CardSkeleton />
      ) : (
        <>
          <OverviewCards stats={payload || {}} />
          <UsageChart period={period} data={payload?.chart || []} />
          <BreakdownTable title="By model" nameKey="Model" rows={modelRows} empty="No usage for this period" />
          <BreakdownTable title="By provider" nameKey="Provider" rows={providerRows} empty="No usage for this period" />
          <BreakdownTable title="By endpoint" nameKey="Endpoint" rows={endpointRows} empty="No usage for this period" />

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-bg-subtle/50 flex items-center justify-between gap-2">
              <h3 className="font-semibold">Request history</h3>
              {historyLoading && <span className="text-xs text-text-muted">Loading…</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-subtle/30 text-text-muted uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">When</th>
                    <th className="px-4 py-3 text-left">Model</th>
                    <th className="px-4 py-3 text-left">Provider</th>
                    <th className="px-4 py-3 text-left">Endpoint</th>
                    <th className="px-4 py-3 text-right">In / Out</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!(payload?.history?.items || payload?.recentRequests || []).length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-text-muted">No requests in this period</td>
                    </tr>
                  )}
                  {(payload?.history?.items || payload?.recentRequests || []).map((r, i) => (
                    <tr key={`${r.timestamp}-${i}`}>
                      <td className="px-4 py-2 text-text-muted whitespace-nowrap">{fmtTime(r.timestamp)}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.model}</td>
                      <td className="px-4 py-2 text-text-muted">{r.provider || "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs text-text-muted">{r.endpoint || "—"}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="text-primary">{fmt(r.promptTokens)}↑</span>
                        {" "}
                        <span className="text-success">{fmt(r.completionTokens)}↓</span>
                      </td>
                      <td className="px-4 py-2 text-right">{fmtCost(r.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(payload?.history?.totalItems || 0) > 0 && (
              <Pagination
                currentPage={payload.history.page || page}
                pageSize={payload.history.pageSize || pageSize}
                totalItems={payload.history.totalItems}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </Card>
        </>
      )}

      <ConfirmModal
        isOpen={clearOpen}
        title="Clear usage"
        message={`Permanently delete token usage logs and counters for "${key?.name || "this key"}"? This cannot be undone.`}
        confirmText="Clear"
        loading={clearing}
        onClose={() => setClearOpen(false)}
        onConfirm={clearUsage}
      />
    </div>
  );
}
