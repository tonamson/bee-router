// In-process SmartCrusher: lossless columnar compaction of homogeneous JSON arrays.
// Never touches system / cache_control. Fail-open.

import { forEachTextSlot } from "./walk.js";

export const MIN_ROWS = 8;

function encodeCell(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return /[\t\n"]/.test(text) ? JSON.stringify(text) : text;
}

function detectHomogeneous(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  for (const item of arr) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return null;
  }
  const keys = Object.keys(arr[0]).sort();
  for (let i = 1; i < arr.length; i++) {
    const next = Object.keys(arr[i]).sort();
    if (next.length !== keys.length) return null;
    for (let k = 0; k < keys.length; k++) {
      if (next[k] !== keys[k]) return null;
    }
  }
  return keys;
}

export function encodeTabular(arr, keys) {
  const header = keys.join("\t");
  const rows = arr.map((obj) => keys.map((key) => encodeCell(obj[key])).join("\t"));
  return "```omni-tabular\n[" + arr.length + " rows]\n" + header + "\n" + rows.join("\n") + "\n```";
}

export function tryCompactJson(jsonStr, minRows = MIN_ROWS) {
  if (typeof jsonStr !== "string") return null;
  const trimmed = jsonStr.trim();
  if (!trimmed.startsWith("[")) return null;
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length < minRows) return null;
  const keys = detectHomogeneous(parsed);
  if (!keys) return null;
  const compact = encodeTabular(parsed, keys);
  if (compact.length >= trimmed.length) return null;
  return compact;
}

const JSON_FENCE_RE = /```json\n([\s\S]*?)\n```/g;

function crushText(text) {
  if (typeof text !== "string" || text.length === 0) return text;
  const whole = tryCompactJson(text);
  if (whole) return whole;
  return text.replace(JSON_FENCE_RE, (full, inner) => tryCompactJson(inner) || full);
}

export function crushMessages(body) {
  if (!body) return null;

  const stats = { bytesBefore: 0, bytesAfter: 0, hits: [] };
  try {
    forEachTextSlot(body, ({ kind, text, set }) => {
      if (kind !== "content" && kind !== "tool") return;
      const next = crushText(text);
      if (next === text) return;
      stats.bytesBefore += text.length;
      stats.bytesAfter += next.length;
      stats.hits.push("tabular");
      set(next);
    });
  } catch (err) {
    console.warn("[CRUSH] crushMessages error:", err?.message || err);
    return null;
  }

  if (stats.hits.length === 0) return null;
  return stats;
}

export function formatCrushLog(stats) {
  if (!stats || !stats.hits?.length) return null;
  const saved = stats.bytesBefore - stats.bytesAfter;
  const pct = stats.bytesBefore > 0 ? ((saved / stats.bytesBefore) * 100).toFixed(1) : "0";
  return `[CRUSH] saved ${saved}B / ${stats.bytesBefore}B (${pct}%)`;
}
