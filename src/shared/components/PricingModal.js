"use client";

import { useState, useEffect } from "react";
import { getDefaultPricing } from "open-sse/providers/pricing.js";
import { Modal, Button } from "@/shared/components";

const FIELDS = ["input", "output", "cached", "reasoning", "cache_creation"];

export default function PricingModal({ isOpen, onClose, onSave }) {
  const [pricingData, setPricingData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/pricing");
        const data = response.ok ? await response.json() : getDefaultPricing();
        if (!cancelled) setPricingData(data);
      } catch {
        if (!cancelled) setPricingData(getDefaultPricing());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  const handlePricingChange = (provider, model, field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    setPricingData((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [model]: { ...prev[provider]?.[model], [field]: numValue },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricingData),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      onSave?.();
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all manual overrides? Official catalog stays.")) return;
    try {
      const response = await fetch("/api/pricing", { method: "DELETE" });
      if (response.ok) setPricingData(await response.json());
    } catch {
      setError("Failed to reset");
    }
  };

  const allProviders = pricingData._canonical ? ["_canonical"] : Object.keys(pricingData).sort();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit rates"
      size="full"
      className="max-w-5xl"
      footer={
        <>
          <Button variant="ghost" className="mr-auto text-error" onClick={handleReset} disabled={saving}>
            Reset overrides
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{saving ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <p className="text-sm text-text-muted mb-4">
        $/1M tokens. Edits override the official catalog for that model.
      </p>
      {error && <p className="text-sm text-error mb-3">{error}</p>}
      {loading ? (
        <p className="text-sm text-text-muted py-8 text-center">Loading…</p>
      ) : allProviders.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">No pricing data.</p>
      ) : (
        <div className="space-y-4">
          {allProviders.map((provider) => {
            const models = Object.keys(pricingData[provider] || {}).sort();
            return (
              <div key={provider} className="border border-border rounded-[10px] overflow-hidden">
                <div className="bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                  {provider === "_canonical" ? "Canonical ids" : provider}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-text-muted border-b border-border">
                        <th className="px-3 py-2">Model</th>
                        {FIELDS.map((f) => (
                          <th key={f} className="px-3 py-2 text-right">{f.replace("_", " ")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {models.map((model) => (
                        <tr key={model} className="border-b border-border/60">
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{model}</td>
                          {FIELDS.map((field) => (
                            <td key={field} className="px-3 py-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={pricingData[provider][model][field] ?? ""}
                                onChange={(e) => handlePricingChange(provider, model, field, e.target.value)}
                                className="w-20 px-2 py-1 text-right tabular-nums bg-surface border border-border rounded-[8px] focus:outline-none focus:border-primary"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
