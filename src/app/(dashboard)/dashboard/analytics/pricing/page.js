"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button } from "@/shared/components";
import PricingModal from "@/shared/components/PricingModal";

function fmtWhen(ts) {
  if (!ts) return "never";
  return new Date(ts).toLocaleString();
}

export default function PricingSettingsPage() {
  const [showModal, setShowModal] = useState(false);
  const [currentPricing, setCurrentPricing] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const loadPricing = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [priceRes, syncRes] = await Promise.all([
        fetch("/api/pricing"),
        fetch("/api/pricing/sync"),
      ]);
      if (!priceRes.ok) throw new Error("Failed to load pricing");
      setCurrentPricing(await priceRes.json());
      if (syncRes.ok) setCatalog(await syncRes.json());
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncOfficial = useCallback(async () => {
    setSyncing(true);
    setError("");
    try {
      const res = await fetch("/api/pricing/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setCatalog(data);
      const priceRes = await fetch("/api/pricing");
      if (priceRes.ok) setCurrentPricing(await priceRes.json());
    } catch (e) {
      setError(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => { loadPricing(); }, [loadPricing]);

  useEffect(() => {
    if (!catalog?.stale || syncing || loading) return;
    syncOfficial();
  }, [catalog?.stale, syncing, loading, syncOfficial]);

  const canonical = currentPricing?._canonical || {};
  const rows = Object.entries(canonical)
    .map(([id, rates]) => ({ id, ...rates }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((r) => !q || r.id.includes(q.toLowerCase()));
  const modelCount = Object.keys(canonical).length;

  return (
    <div className="flex w-full flex-col gap-4 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          Same model, one id across providers. Prefixes, 3.5 vs 3-5, and dated snapshots collapse.
        </p>
        <div className="flex items-center gap-2">
          <a href="/dashboard/analytics/token-save" className="text-xs text-primary underline">
            Token Save
          </a>
          <Button size="sm" variant="ghost" onClick={loadPricing} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button size="sm" variant="secondary" icon="sync" onClick={syncOfficial} loading={syncing}>
            {syncing ? "Syncing…" : "Sync official"}
          </Button>
          <Button size="sm" icon="edit" onClick={() => setShowModal(true)}>
            Edit rates
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Canonical models</p>
          <p className="text-xl font-semibold mt-1 tabular-nums">{loading ? "—" : modelCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Shown</p>
          <p className="text-xl font-semibold mt-1 tabular-nums">{loading ? "—" : rows.length}</p>
        </Card>
        <Card className="p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-text-muted uppercase tracking-wide">Official catalog</p>
          <p className="text-sm font-semibold mt-1">
            {catalog?.syncedAt ? `${catalog.matched || 0} models synced` : "Not synced yet"}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {catalog?.syncedAt ? `Last ${fmtWhen(catalog.syncedAt)}` : "Will fetch LiteLLM rates"}
            {catalog?.missed ? ` · ${catalog.missed} unmatched` : ""}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-medium">Rates ($/1M)</h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.trim().toLowerCase())}
            placeholder="Filter id — grok-4-6, claude-sonnet-4-5"
            className="h-8 w-full sm:w-72 px-3 text-sm bg-surface border border-border rounded-[8px] focus:outline-none focus:border-primary"
          />
        </div>
        {loading ? (
          <p className="text-sm text-text-muted py-6 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">No rows.</p>
        ) : (
          <div className="overflow-x-auto max-h-[28rem]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border">
                  <th className="py-2 pr-3">Canonical id</th>
                  <th className="py-2 pr-3 text-right">Input</th>
                  <th className="py-2 pr-3 text-right">Output</th>
                  <th className="py-2 pr-3 text-right">Cached</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{r.id}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.input ?? "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.output ?? "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.cached ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-text-muted mt-3">
          Request model is folded to this id before price lookup. Real rename (new string, same model) → one row in MODEL_ALIASES.
        </p>
      </Card>

      <PricingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={loadPricing}
      />
    </div>
  );
}
