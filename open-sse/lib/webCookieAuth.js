/**
 * Cookie/token extract helpers for web-cookie providers (DeepSeek + Qwen).
 * Adapted from OmniRoute MIT (https://github.com/diegosouzapw/OmniRoute)
 */

/** Strip leading `Cookie:` / `bearer ` prefixes from pasted input. */
export function stripCookieInputPrefix(rawValue) {
  const trimmed = (rawValue || "").trim();
  if (!trimmed) return "";
  const withoutBearer = trimmed.replace(/^bearer\s+/i, "");
  return withoutBearer.replace(/^cookie:/i, "").trim();
}

/**
 * DeepSeek Local Storage userToken → raw JWT.
 * Accepts JSON `{"value":"..."}`, `userToken=...`, or bare JWT.
 */
export function extractDeepSeekUserToken(raw) {
  if (typeof raw !== "string" || raw.length === 0) return "";
  const trimmed = stripCookieInputPrefix(raw);
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed?.value === "string") return parsed.value;
  } catch {
    // not JSON
  }
  if (trimmed.startsWith("userToken=")) return trimmed.slice("userToken=".length);
  return trimmed;
}

/**
 * Qwen Cookie header: forward full jar verbatim (minus Cookie:/bearer prefix).
 * Bare token (no `=`) → "" — WAF needs the full jar.
 */
export function buildQwenCookieHeader(rawValue) {
  const trimmed = stripCookieInputPrefix(rawValue);
  if (!trimmed || !trimmed.includes("=")) return "";
  return trimmed;
}

/**
 * Qwen bearer token from paste: bare value, or `token=` pair in cookie blob.
 * Blob without `token=` → "".
 */
export function extractQwenToken(rawValue) {
  const trimmed = stripCookieInputPrefix(rawValue);
  if (!trimmed) return "";
  if (!trimmed.includes("=")) return trimmed;
  const match = trimmed.match(/(?:^|;\s*)token=([^;\s]+)/);
  return match ? match[1] : "";
}
