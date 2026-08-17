import { canonicalModelId } from "../../../open-sse/providers/pricing.js";

/** LiteLLM community table — machine-readable, not vendor HTML. */
export const OFFICIAL_CATALOG_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

export const CATALOG_STALE_MS = 24 * 60 * 60 * 1000;

export function perTokenToPerMillion(n) {
  if (n == null || n === "") return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 1_000_000 * 1e6) / 1e6;
}

export function litellmRowToRates(row) {
  if (!row || typeof row !== "object") return null;
  const input = perTokenToPerMillion(row.input_cost_per_token);
  const output = perTokenToPerMillion(row.output_cost_per_token);
  if (input == null && output == null) return null;
  const rates = {};
  if (input != null) rates.input = input;
  if (output != null) rates.output = output;
  const cached = perTokenToPerMillion(row.cache_read_input_token_cost);
  if (cached != null) rates.cached = cached;
  const cacheCreation = perTokenToPerMillion(row.cache_creation_input_token_cost);
  if (cacheCreation != null) rates.cache_creation = cacheCreation;
  const reasoning = perTokenToPerMillion(row.output_cost_per_reasoning_token);
  if (reasoning != null) rates.reasoning = reasoning;
  return rates;
}

export function indexLiteLLM(catalog) {
  const byCanonical = new Map();
  for (const [key, row] of Object.entries(catalog || {})) {
    if (key === "sample_spec") continue;
    const rates = litellmRowToRates(row);
    if (!rates) continue;
    const id = canonicalModelId(key);
    if (id && !byCanonical.has(id)) byCanonical.set(id, rates);
  }
  return { byCanonical };
}

export function matchRates(index, _provider, model) {
  const id = canonicalModelId(model);
  return (id && index.byCanonical.get(id)) || null;
}

export function applyCatalogToKnownModels(catalog, knownPricing) {
  const index = indexLiteLLM(catalog);
  const out = { _canonical: {} };
  let matched = 0;
  let missed = 0;
  const seen = new Set();
  for (const models of Object.values(knownPricing || {})) {
    for (const model of Object.keys(models || {})) {
      const id = canonicalModelId(model);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const rates = matchRates(index, null, model);
      if (!rates) {
        missed++;
        continue;
      }
      out._canonical[id] = rates;
      matched++;
    }
  }
  return { catalog: out, matched, missed };
}

export async function fetchOfficialCatalog(url = OFFICIAL_CATALOG_URL) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Catalog fetch ${res.status}`);
  const json = await res.json();
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("Catalog is not a JSON object");
  }
  return json;
}
