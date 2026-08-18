"use client";

import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Button, Input } from "@/shared/components";
import Modal from "@/shared/components/Modal";

const FIELDS = [
  { key: "concurrency", label: "Max concurrent", hint: "In-flight requests. 0 = unlimited." },
  { key: "dailyRequests", label: "Daily requests", hint: "Resets at local midnight." },
  { key: "weeklyRequests", label: "Weekly requests", hint: "Resets Monday 00:00 local." },
  { key: "dailyTokens", label: "Daily tokens", hint: "Input + output. Resets midnight." },
  { key: "weeklyTokens", label: "Weekly tokens", hint: "Input + output. Resets Monday." },
];

function toInput(n) {
  return n ? String(n) : "";
}

function fmt(n) {
  return new Intl.NumberFormat().format(n || 0);
}

function usedLabel(used, cap) {
  if (!cap) return `${fmt(used)} used · unlimited`;
  return `${fmt(used)} / ${fmt(cap)}`;
}

export default function KeyLimitsModal({ keyRow, onClose, onSaved }) {
  const [form, setForm] = useState({
    concurrency: "",
    dailyRequests: "",
    weeklyRequests: "",
    dailyTokens: "",
    weeklyTokens: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!keyRow) return;
    setForm({
      concurrency: toInput(keyRow.concurrency),
      dailyRequests: toInput(keyRow.dailyRequests),
      weeklyRequests: toInput(keyRow.weeklyRequests),
      dailyTokens: toInput(keyRow.dailyTokens),
      weeklyTokens: toInput(keyRow.weeklyTokens),
    });
    setError("");
  }, [keyRow]);

  if (!keyRow) return null;

  const usage = keyRow.usage || {};

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = {};
      for (const { key } of FIELDS) {
        const raw = form[key];
        body[key] = raw === "" || raw == null ? 0 : Number(raw);
      }
      const res = await fetch(`/api/keys/${keyRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      onSaved(data.key);
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!keyRow} title="API Key Limits" onClose={onClose} size="md">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-text-muted">Leave a field empty for no cap. 0 is the same as empty.</p>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Input
              label={f.label}
              type="number"
              min="0"
              step="1"
              value={form[f.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder="Unlimited"
            />
            <p className="text-[11px] text-text-muted mt-1">
              {f.hint}
              {f.key === "concurrency" && ` Now ${usage.inflight || 0} in flight.`}
              {f.key === "dailyRequests" && ` Today ${usedLabel(usage.dayRequests || 0, keyRow.dailyRequests)}.`}
              {f.key === "weeklyRequests" && ` This week ${usedLabel(usage.weekRequests || 0, keyRow.weeklyRequests)}.`}
              {f.key === "dailyTokens" && ` Today ${usedLabel(usage.dayTokens || 0, keyRow.dailyTokens)}.`}
              {f.key === "weeklyTokens" && ` This week ${usedLabel(usage.weekTokens || 0, keyRow.weeklyTokens)}.`}
            </p>
          </div>
        ))}
        {error && <p className="text-sm text-error" role="alert">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={save} fullWidth disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button onClick={onClose} variant="ghost" fullWidth>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

KeyLimitsModal.propTypes = {
  keyRow: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};
