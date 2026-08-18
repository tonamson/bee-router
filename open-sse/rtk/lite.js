// Lossless request cleanup. Fail-open. Does not touch grok-cli / session.

import { forEachTextSlot, walkItems } from "./walk.js";

const ANSI_RE =
  /\u001b\[[\d;?]*[A-Za-z]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b[()][AB012]|\u001b[=>]/g;

function stripAnsi(text) {
  ANSI_RE.lastIndex = 0;
  return text.replace(ANSI_RE, "");
}

// Lone CR is a progress overwrite. CRLF stays a newline.
function collapseProgress(text) {
  if (!text.includes("\r")) return text;
  return text.replace(/[^\n\r]*\r(?!\n)/g, "");
}

function collapseWhitespace(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function tryMinifyJson(raw) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const compact = JSON.stringify(JSON.parse(trimmed));
    return compact.length < raw.length ? compact : null;
  } catch {
    return null;
  }
}

function minifyJsonText(text) {
  const whole = tryMinifyJson(text);
  if (whole) return whole;

  const fenceRe = /```json\r?\n([\s\S]*?)```/gi;
  let changed = false;
  const next = text.replace(fenceRe, (full, inner) => {
    const compact = tryMinifyJson(inner);
    if (!compact) return full;
    changed = true;
    return "```json\n" + compact + "\n```";
  });
  return changed ? next : null;
}

export function applyLosslessText(text) {
  if (typeof text !== "string" || text.length === 0) return { text, hits: [] };
  const hits = [];
  let next = stripAnsi(text);
  if (next !== text) hits.push("ansi");
  // `\r` overwrite only after ANSI — Mac `\r` file dumps must stay intact.
  if (hits.includes("ansi")) {
    const noCr = collapseProgress(next);
    if (noCr !== next) next = noCr;
  }
  const min = minifyJsonText(next);
  if (min) {
    hits.push("json");
    next = min;
  } else {
    const ws = collapseWhitespace(next);
    if (ws !== next) {
      hits.push("whitespace");
      next = ws;
    }
  }
  if (next.length > text.length) return { text, hits: [] };
  return { text: next, hits };
}

export function applyLiteCompression(body) {
  if (!body) return null;

  const stats = { bytesBefore: 0, bytesAfter: 0, hits: [] };
  try {
    forEachTextSlot(body, ({ kind, text, set }) => {
      // Tool-call args stay exact — minify/CR rewrite breaks Read paths.
      if (kind === "args") return;
      const { text: next, hits } = applyLosslessText(text);
      if (hits.length === 0 || next === text) return;
      stats.bytesBefore += text.length;
      stats.bytesAfter += next.length;
      stats.hits.push(...hits);
      set(next);
    });

    const items = walkItems(body);
    if (items) {
      let write = 1;
      for (let i = 1; i < items.length; i++) {
        const prev = items[write - 1];
        const cur = items[i];
        if (
          prev && cur &&
          prev.role === cur.role &&
          typeof prev.content === "string" &&
          prev.content === cur.content
        ) {
          stats.hits.push("dedup");
          continue;
        }
        items[write++] = cur;
      }
      if (write < items.length) items.length = write;
    }
  } catch (e) {
    console.warn("[LITE] applyLiteCompression error:", e.message);
    return null;
  }

  if (stats.hits.length === 0) return null;
  return stats;
}

export function formatLiteLog(stats) {
  if (!stats || !stats.hits?.length) return null;
  const saved = stats.bytesBefore - stats.bytesAfter;
  if (saved <= 0) return `[LITE] ${[...new Set(stats.hits)].join(",")}`;
  const pct = stats.bytesBefore > 0 ? ((saved / stats.bytesBefore) * 100).toFixed(1) : "0";
  return `[LITE] saved ${saved}B / ${stats.bytesBefore}B (${pct}%) via [${[...new Set(stats.hits)].join(",")}]`;
}
