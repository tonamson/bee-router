/**
 * Resolves the API key to write into a CLI tool config.
 *
 * CLI tool cards send an empty string when no key is explicitly selected
 * (e.g. the existing config already has a provider block but the frontend
 * can't read the stored Authorization header back). The routes previously
 * fell back to a literal placeholder, which causes 401
 * "Invalid API key" for any deployment with requireApiKey=true (#4399).
 *
 * Resolution order:
 *   1. The key supplied by the caller (non-empty string).
 *   2. The first active key in the dashboard's apiKeys table.
 *   3. Empty string — the route writes no Authorization header value,
 *      which is fine for requireApiKey=false deployments.
 *
 * Legacy placeholders are never written; they were never real keys.
 */

import { getApiKeys } from "@/lib/db";

/**
 * @param {string|null|undefined} callerKey  Key sent by the frontend.
 * @returns {Promise<string>}
 */
export async function resolveCliApiKey(callerKey) {
  if (typeof callerKey === "string" && callerKey.trim() && !["sk_9router", "sk_bee-router"].includes(callerKey.trim())) {
    return callerKey.trim();
  }
  try {
    const keys = await getApiKeys();
    const active = keys.find((k) => k.isActive);
    return active?.key || "";
  } catch {
    return "";
  }
}
