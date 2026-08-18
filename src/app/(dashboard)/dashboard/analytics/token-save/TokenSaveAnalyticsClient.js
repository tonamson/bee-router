"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, Button } from "@/shared/components";
import Pagination from "@/shared/components/Pagination";

const WINDOWS = [
  { id: "today", label: "Today" },
  { id: "last7d", label: "7 days" },
  { id: "last30d", label: "30 days" },
  { id: "all", label: "All time" },
];

const LAYER_LABEL = {
  rtk: "RTK",
  lite: "Lite",
  caveman: "Caveman",
  headroom: "Headroom",
};

function fmt(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(Math.round(v));
}

function fmtTick(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(v));
}

function fmtUsd(n) {
  const v = Number(n) || 0;
  if (v <= 0) return "$0.00";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 10) return `$${v.toFixed(3).replace(/0$/, "")}`;
  return `$${v.toFixed(2)}`;
}

function Stat({ label, value, sub, tone }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${tone || ""}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </Card>
  );
}

function cacheHint(cache) {
  const cached = Number(cache.totalCachedTokens) || 0;
  const prompt = Number(cache.totalPromptTokens) || 0;
  const reqs = Number(cache.totalRequests) || 0;
  if (reqs === 0 && prompt === 0) {
    return "No usage in this window yet. Cache-read only appears after a provider reports it.";
  }
  if (cached > 0) {
    return "Provider reused this many input tokens. Discount is on the cached slice, not the Token Save estimate.";
  }
  return "Provider reported 0 cache-read. Token Save still cut the payload — that is a smaller send, not a cache miss penalty.";
}

const PAGE_SIZE = 15;

function slicePage(rows, page, size) {
  const start = (page - 1) * size;
  return rows.slice(start, start + size);
}

function SaveTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload || {};
  const isTok = payload[0].dataKey === "tokensSavedEst";
  return (
    <div className="rounded-[10px] border border-brand-500/30 bg-[#16181ff2] px-3 py-2 text-xs shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <p className="mb-1 font-medium text-text-muted">{label}</p>
      <p className="font-semibold text-brand-500">
        {isTok ? `${fmt(row.tokensSavedEst)} tokens not sent` : `${fmtUsd(row.costSavedEst)} est. saved`}
      </p>
      <p className="mt-0.5 text-text-muted">
        {fmt(row.compressed || 0)} compressed / {fmt(row.requests || 0)} req
      </p>
    </div>
  );
}

function SaveTimeline({ timeline }) {
  const [mode, setMode] = useState("tokens");
  const rows = timeline || [];
  const hasData = rows.some((d) => (d.tokensSavedEst || 0) > 0 || (d.costSavedEst || 0) > 0);
  const isTok = mode === "tokens";
  const dataKey = isTok ? "tokensSavedEst" : "costSavedEst";
  const format = isTok ? fmt : fmtUsd;
  const total = rows.reduce((n, d) => n + (Number(d[dataKey]) || 0), 0);

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">Last 30 days</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {hasData
              ? `${format(total)} ${isTok ? "tokens not sent" : "est. not billed"}`
              : "Daily estimate of payload cut before send"}
          </p>
        </div>
        <div className="grid grid-cols-2 items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1">
          <button
            type="button"
            onClick={() => setMode("tokens")}
            className={`rounded-md px-3 py-1 text-sm font-semibold transition-all ${
              isTok
                ? "bg-brand-500 text-black shadow-[0_2px_8px_rgba(255,199,0,0.3)]"
                : "text-text-muted hover:bg-surface-2 hover:text-text-main"
            }`}
          >
            Tokens
          </button>
          <button
            type="button"
            onClick={() => setMode("cost")}
            className={`rounded-md px-3 py-1 text-sm font-semibold transition-all ${
              !isTok
                ? "bg-brand-500 text-black shadow-[0_2px_8px_rgba(255,199,0,0.3)]"
                : "text-text-muted hover:bg-surface-2 hover:text-text-main"
            }`}
          >
            Cost
          </button>
        </div>
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTokenSave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFC700" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#F59E0B" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} stroke="#282B37" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={(d) => String(d).slice(5)}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={{ stroke: "rgba(40,43,55,0.6)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={isTok ? fmtTick : fmtUsd}
              width={52}
              tickLine={false}
              axisLine={{ stroke: "rgba(40,43,55,0.6)" }}
            />
            <Tooltip content={<SaveTip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="#FFC700"
              fill="url(#gradTokenSave)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#FFC700", stroke: "#0D0E12", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-48 items-center justify-center text-center text-sm text-text-muted">
          No compression recorded yet. Route a request with RTK or Caveman on.
        </div>
      )}
    </Card>
  );
}

export default function TokenSaveAnalyticsClient() {
  const [data, setData] = useState(null);
  const [windowId, setWindowId] = useState("last7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savePage, setSavePage] = useState(1);
  const [cachePage, setCachePage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const period = windowId === "today" ? "today" : windowId === "all" ? "all" : windowId === "last30d" ? "30d" : "7d";
      const res = await fetch(`/api/token-save/stats?period=${period}&limit=200`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load stats");
      setData(await res.json());
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [windowId]);

  useEffect(() => { refresh(); }, [refresh]);

  const w = data?.compression?.windows?.[windowId];
  const cache = data?.cache || {};
  const cached = Number(cache.totalCachedTokens) || 0;
  const prompt = Number(cache.totalPromptTokens) || 0;
  const cachePct = prompt > 0 ? ((cached / prompt) * 100).toFixed(1) : "0";
  const byProvider = Object.entries(cache.byProvider || {}).sort(
    (a, b) => (b[1].cachedTokens || 0) - (a[1].cachedTokens || 0)
  );
  const recentCache = cache.recent || [];
  const recentSave = data?.compression?.recent || [];
  const pagedSave = slicePage(recentSave, savePage, pageSize);
  const pagedCache = slicePage(recentCache, cachePage, pageSize);
  const anyCacheHit = cached > 0 || recentCache.some((r) => (r.cachedTokens || 0) > 0);

  function changePageSize(size) {
    setPageSize(size);
    setSavePage(1);
    setCachePage(1);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Token Save vs cache-read</h2>
          <p className="text-sm text-text-muted">
            Two meters. Token Save = bytes we cut before send. Cache-read = tokens the provider reused.
            Zero cache-read is not Token Save failing and is not extra spend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/dashboard/token-saver" className="text-xs text-primary underline">Settings</a>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1 w-fit">
        {WINDOWS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setWindowId(tab.id);
              setSavePage(1);
              setCachePage(1);
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium ${
              windowId === tab.id ? "bg-primary text-white" : "text-text-muted hover:bg-surface-2"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <Card className="p-5 border-success/40 bg-success/5">
        <p className="text-xs text-text-muted uppercase tracking-wide">Est. money saved</p>
        <p className="text-3xl font-semibold text-success mt-1 tabular-nums">
          {w ? fmtUsd(w.costSavedEst) : "—"}
        </p>
        <p className="text-sm text-text-muted mt-1">
          {w
            ? `${fmt(w.tokensSavedEst)} tokens not sent · ${fmt(w.bytesSaved)} bytes`
            : "Load a window to see savings"}
          {w?.unpricedTokens > 0 ? ` · ${fmt(w.unpricedTokens)} tok have no price` : ""}
        </p>
        <p className="text-xs text-text-muted mt-1">
          Input rate × tokens cut. Not actual invoice.{" "}
          <a href="/dashboard/analytics/pricing" className="text-primary underline">Pricing rates</a>
        </p>
      </Card>

      <section>
        <h3 className="text-sm font-semibold mb-2">1. Token Save — payload cut</h3>
        <p className="text-xs text-text-muted mb-3">
          RTK / Lite / Caveman / Headroom shrink the request. Estimate = bytes cut ÷ 4. This is not a provider cache hit.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Requests seen" value={w ? fmt(w.requests) : "—"} />
          <Stat label="Compressed" value={w ? fmt(w.compressed) : "—"} tone="text-success" />
          <Stat
            label="Est. tokens not sent"
            value={w ? fmt(w.tokensSavedEst) : "—"}
            sub={w ? `${fmt(w.bytesSaved)} bytes cut` : ""}
            tone="text-success"
          />
          <Stat
            label="Est. $ not billed"
            value={w ? fmtUsd(w.costSavedEst) : "—"}
            sub={w?.unpricedTokens ? `${fmt(w.unpricedTokens)} tok unpriced` : "input-rate × tokens not sent"}
            tone="text-success"
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">2. Cache-read — provider reuse</h3>
        <p className="text-xs text-text-muted mb-3">{cacheHint(cache)}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat
            label="Cache-read tokens"
            value={fmt(cached)}
            sub={anyCacheHit ? "Provider billed these cheaper" : "0 reported this window"}
            tone={anyCacheHit ? "text-info" : ""}
          />
          <Stat
            label="Of prompt tokens"
            value={`${cachePct}%`}
            sub={`${fmt(prompt)} prompt · ${data?.period || ""}`}
          />
          <Stat label="Usage requests" value={fmt(cache.totalRequests)} />
        </div>
      </section>

      <Card className="p-4">
        <h3 className="font-medium mb-3">Token Save by engine</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(LAYER_LABEL).map(([id, label]) => {
            const layer = w?.byLayer?.[id];
            return (
              <div key={id} className="rounded-md border border-border px-3 py-2">
                <p className="text-xs text-text-muted">{label}</p>
                <p className="text-sm font-semibold mt-1">{layer ? `${fmt(layer.hits)} hits` : "—"}</p>
                <p className="text-xs text-text-muted">
                  {layer ? `~${fmt(Math.round((layer.bytesSaved || 0) / 4))} tok · ${fmtUsd(layer.costSavedEst)}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-3">Cache-read by provider</h3>
        {byProvider.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No usage rows in this window.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border">
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 pr-3 text-right">Cache-read</th>
                  <th className="py-2 pr-3 text-right">Prompt</th>
                  <th className="py-2 pr-3 text-right">Hit %</th>
                  <th className="py-2 pr-3 text-right">Reqs</th>
                </tr>
              </thead>
              <tbody>
                {byProvider.map(([prov, p]) => {
                  const hit = p.promptTokens > 0
                    ? ((p.cachedTokens / p.promptTokens) * 100).toFixed(1)
                    : "0";
                  return (
                    <tr key={prov} className="border-b border-border/60">
                      <td className="py-2 pr-3">{prov || "—"}</td>
                      <td className="py-2 pr-3 text-right">{fmt(p.cachedTokens)}</td>
                      <td className="py-2 pr-3 text-right">{fmt(p.promptTokens)}</td>
                      <td className="py-2 pr-3 text-right">{hit}%</td>
                      <td className="py-2 pr-3 text-right">{fmt(p.requests)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-text-muted mt-3">
          Grok / xAI / Ollama often report 0 even when they cache internally. Claude / OpenAI / Gemini / Codex usually report a number.
        </p>
      </Card>

      <SaveTimeline timeline={data?.compression?.timeline} />

      <Card className="p-4">
        <h3 className="font-medium mb-3">Recent Token Save</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Model</th>
                <th className="py-2 pr-3">Layers</th>
                <th className="py-2 pr-3 text-right">Not sent</th>
                <th className="py-2 pr-3 text-right">$</th>
              </tr>
            </thead>
            <tbody>
              {recentSave.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-text-muted">No events</td></tr>
              )}
              {pagedSave.map((ev, i) => {
                const hits = Object.entries(ev.layers || {})
                  .filter(([, l]) => l.hit)
                  .map(([k]) => LAYER_LABEL[k] || k)
                  .join(", ") || "—";
                return (
                  <tr key={`${ev.ts}-${i}`} className="border-b border-border/60">
                    <td className="py-2 pr-3 text-xs whitespace-nowrap">{ev.ts ? new Date(ev.ts).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-3 text-xs truncate max-w-[12rem]">{ev.model || "—"}</td>
                    <td className="py-2 pr-3 text-xs">{hits}</td>
                    <td className="py-2 pr-3 text-xs text-right">{fmt(ev.tokensSavedEst)}</td>
                    <td className="py-2 pr-3 text-xs text-right text-success">{fmtUsd(ev.costSavedEst)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {recentSave.length > 0 && (
          <Pagination
            currentPage={savePage}
            pageSize={pageSize}
            totalItems={recentSave.length}
            onPageChange={setSavePage}
            onPageSizeChange={changePageSize}
          />
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-3">Recent cache-read</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Provider</th>
                <th className="py-2 pr-3">Model</th>
                <th className="py-2 pr-3 text-right">Cache-read</th>
                <th className="py-2 pr-3 text-right">Prompt</th>
              </tr>
            </thead>
            <tbody>
              {recentCache.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-text-muted">No usage rows</td></tr>
              )}
              {pagedCache.map((r, i) => (
                <tr key={`${r.ts}-${i}`} className="border-b border-border/60">
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">{r.ts ? new Date(r.ts).toLocaleString() : "—"}</td>
                  <td className="py-2 pr-3 text-xs">{r.provider || "—"}</td>
                  <td className="py-2 pr-3 text-xs truncate max-w-[12rem]">{r.model || "—"}</td>
                  <td className={`py-2 pr-3 text-xs text-right ${(r.cachedTokens || 0) > 0 ? "text-info font-medium" : "text-text-muted"}`}>
                    {fmt(r.cachedTokens)}
                  </td>
                  <td className="py-2 pr-3 text-xs text-right">{fmt(r.promptTokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentCache.length > 0 && (
          <Pagination
            currentPage={cachePage}
            pageSize={pageSize}
            totalItems={recentCache.length}
            onPageChange={setCachePage}
            onPageSizeChange={changePageSize}
          />
        )}
      </Card>
    </div>
  );
}
