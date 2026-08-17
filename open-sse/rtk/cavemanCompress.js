// Caveman input rewrite. Fail-open. User/assistant prose only.
// Skips tool messages, tool_result blocks, code fences, URLs, paths.

import { getRulesForContext, applyRulesToText, mapCavemanIntensity } from "./cavemanRules.js";

const MIN_LEN = 50;
const PROTECT_RE = /```[\s\S]*?```|`[^`\n]+`|https?:\/\/\S+|(?:^|\s)(?:\.{0,2}\/[\w./\-]+)|^[ \t]*(?:Error|TypeError|RangeError|SyntaxError|ReferenceError):/gm;

function walkItems(body) {
  if (Array.isArray(body?.messages)) return body.messages;
  if (Array.isArray(body?.input)) return body.input;
  return null;
}

function extractProtected(text) {
  const blocks = [];
  const stripped = text.replace(PROTECT_RE, (m) => {
    const i = blocks.length;
    blocks.push(m);
    return `\u0000P${i}\u0000`;
  });
  return { stripped, blocks };
}

function restoreProtected(text, blocks) {
  return text.replace(/\u0000P(\d+)\u0000/g, (_, n) => blocks[Number(n)] ?? "");
}

function rewriteText(text, role, intensity, stats) {
  if (!text || text.length < MIN_LEN) return text;
  const { stripped, blocks } = extractProtected(text);
  const rules = getRulesForContext(role, intensity);
  const { text: next, applied } = applyRulesToText(stripped, rules);
  const restored = restoreProtected(next, blocks);
  if (!restored || restored.length === 0 || restored.length >= text.length) return text;
  stats.bytesBefore += text.length;
  stats.bytesAfter += restored.length;
  stats.hits.push(...applied);
  return restored;
}

export function cavemanCompress(body, enabled, level) {
  if (!enabled || !body) return null;
  const intensity = mapCavemanIntensity(level);
  const items = walkItems(body);
  if (!items) return null;

  const stats = { bytesBefore: 0, bytesAfter: 0, hits: [] };
  try {
    for (const msg of items) {
      if (!msg) continue;
      if (msg.role === "tool" || msg.role === "function" || msg.type === "function_call_output") continue;
      if (msg.role !== "user" && msg.role !== "assistant") continue;

      if (typeof msg.content === "string") {
        msg.content = rewriteText(msg.content, msg.role, intensity, stats);
        continue;
      }
      if (!Array.isArray(msg.content)) continue;
      for (const part of msg.content) {
        if (!part || typeof part.text !== "string") continue;
        if (part.type === "tool_result" || part.type === "tool_use") continue;
        part.text = rewriteText(part.text, msg.role, intensity, stats);
      }
    }
  } catch (e) {
    console.warn("[CAVEMAN] cavemanCompress error:", e.message);
    return null;
  }
  if (stats.hits.length === 0) return null;
  return stats;
}

export function formatCavemanLog(stats) {
  if (!stats || !stats.hits?.length) return null;
  const saved = stats.bytesBefore - stats.bytesAfter;
  const pct = stats.bytesBefore > 0 ? ((saved / stats.bytesBefore) * 100).toFixed(1) : "0";
  return `[CAVEMAN] saved ${saved}B / ${stats.bytesBefore}B (${pct}%) rules=${[...new Set(stats.hits)].length}`;
}
