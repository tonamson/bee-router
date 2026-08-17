// Lossless request cleanup. Fail-open. Does not touch grok-cli / session.

import { hasCacheControl } from "./cacheGuard.js";

const MAX_TOOL_LENGTH = 2000;

function walkItems(body) {
  if (Array.isArray(body?.messages)) return body.messages;
  if (Array.isArray(body?.input)) return body.input;
  return null;
}

function collapseWhitespace(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function capTool(text) {
  if (text.length <= MAX_TOOL_LENGTH) return text;
  let cut = MAX_TOOL_LENGTH;
  const windowStart = Math.max(0, cut - 80);
  for (let i = cut; i > windowStart; i--) {
    if (/\s/.test(text[i - 1])) { cut = i - 1; break; }
  }
  return `${text.slice(0, cut)}\n...[truncated]`;
}

export function applyLiteCompression(body) {
  if (!body) return null;
  const items = walkItems(body);
  if (!items) return null;

  const stats = { bytesBefore: 0, bytesAfter: 0, hits: [] };
  try {
    for (let i = 0; i < items.length; i++) {
      const msg = items[i];
      if (!msg) continue;

      if (hasCacheControl(msg)) continue;

      if (msg.role === "tool" && typeof msg.content === "string") {
        stats.bytesBefore += msg.content.length;
        const next = collapseWhitespace(capTool(msg.content));
        if (next.length < msg.content.length) stats.hits.push("tool-cap");
        msg.content = next;
        stats.bytesAfter += next.length;
        continue;
      }

      if (typeof msg.content === "string") {
        stats.bytesBefore += msg.content.length;
        const next = collapseWhitespace(msg.content);
        if (next !== msg.content) stats.hits.push("whitespace");
        msg.content = next;
        stats.bytesAfter += next.length;
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (!part || typeof part.text !== "string") continue;
          if (hasCacheControl(part)) continue;
          stats.bytesBefore += part.text.length;
          const next = collapseWhitespace(part.text);
          if (next !== part.text) stats.hits.push("whitespace");
          part.text = next;
          stats.bytesAfter += next.length;
        }
      }

      if (msg.type === "function_call_output") {
        if (typeof msg.output === "string") {
          stats.bytesBefore += msg.output.length;
          msg.output = collapseWhitespace(capTool(msg.output));
          stats.bytesAfter += msg.output.length;
          stats.hits.push("tool-cap");
        }
      }
    }

    // Drop consecutive duplicate string messages (same role + same content).
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
