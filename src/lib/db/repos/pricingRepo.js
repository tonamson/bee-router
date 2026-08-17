import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { makeKv } from "../helpers/kvStore.js";

const pricingKv = makeKv("pricing");
const catalogKv = makeKv("pricing-catalog");
const CACHE_TTL_MS = 5000;

let cache = { value: null, expiresAt: 0 };

function invalidate() {
  cache = { value: null, expiresAt: 0 };
}

async function getUserPricing() {
  return await pricingKv.getAll();
}

function stripMeta(all) {
  const out = { ...all };
  delete out._meta;
  return out;
}

export async function getCatalogPricing() {
  return stripMeta(await catalogKv.getAll());
}

export async function getCatalogMeta() {
  return (await catalogKv.get("_meta")) || null;
}

function overlay(base, extra) {
  if (!extra) return;
  for (const [provider, models] of Object.entries(extra)) {
    if (!base[provider]) base[provider] = { ...models };
    else {
      for (const [model, pricing] of Object.entries(models || {})) {
        base[provider][model] = base[provider][model]
          ? { ...base[provider][model], ...pricing }
          : pricing;
      }
    }
  }
}

function flattenCanonical(layer, rekeyByCanonical) {
  const out = { ...(layer?._canonical || {}) };
  for (const [p, models] of Object.entries(layer || {})) {
    if (p === "_canonical" || p === "_meta") continue;
    Object.assign(out, rekeyByCanonical(models));
  }
  return rekeyByCanonical(out);
}

function pickCanonical(layer, id, rekeyByCanonical) {
  if (!layer || !id) return null;
  return flattenCanonical(layer, rekeyByCanonical)[id] || null;
}

export async function getPricing() {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) return cache.value;

  const userPricing = await getUserPricing();
  const catalogPricing = await getCatalogPricing();
  const { MODEL_PRICING, rekeyByCanonical } = await import("open-sse/providers/pricing.js");
  const merged = { _canonical: rekeyByCanonical(MODEL_PRICING) };
  overlay(merged, { _canonical: flattenCanonical(catalogPricing, rekeyByCanonical) });
  overlay(merged, { _canonical: flattenCanonical(userPricing, rekeyByCanonical) });

  cache = { value: merged, expiresAt: now + CACHE_TTL_MS };
  return merged;
}

export async function getPricingForModel(provider, model) {
  const { getPricingForModel: resolveConst, canonicalModelId, rekeyByCanonical } = await import("open-sse/providers/pricing.js");
  const id = canonicalModelId(model);
  if (!id) return null;
  const fromUser = pickCanonical(await getUserPricing(), id, rekeyByCanonical);
  const fromCatalog = pickCanonical(await getCatalogPricing(), id, rekeyByCanonical);
  const builtin = resolveConst(provider, model);
  if (!builtin && !fromCatalog && !fromUser) return null;
  return { ...builtin, ...fromCatalog, ...fromUser };
}

export async function saveCatalogPricing(catalog, meta) {
  await catalogKv.clear();
  const payload = { ...catalog };
  if (meta) payload._meta = meta;
  await catalogKv.setMany(payload);
  invalidate();
  return meta;
}

// Atomic merge inside transaction (per-provider read-modify-write)
export async function updatePricing(pricingData) {
  const db = await getAdapter();
  db.transaction(() => {
    for (const [provider, models] of Object.entries(pricingData)) {
      const row = db.get(`SELECT value FROM kv WHERE scope = 'pricing' AND key = ?`, [provider]);
      const current = row ? (parseJson(row.value, {}) || {}) : {};
      const merged = { ...current };
      for (const [model, pricing] of Object.entries(models)) {
        merged[model] = pricing;
      }
      db.run(
        `INSERT INTO kv(scope, key, value) VALUES('pricing', ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
        [provider, stringifyJson(merged)]
      );
    }
  });
  invalidate();
  return await getUserPricing();
}

export async function resetPricing(provider, model) {
  if (!provider) return await getUserPricing();
  const db = await getAdapter();
  db.transaction(() => {
    if (!model) {
      db.run(`DELETE FROM kv WHERE scope = 'pricing' AND key = ?`, [provider]);
      return;
    }
    const row = db.get(`SELECT value FROM kv WHERE scope = 'pricing' AND key = ?`, [provider]);
    const current = row ? (parseJson(row.value, {}) || {}) : {};
    delete current[model];
    if (Object.keys(current).length === 0) {
      db.run(`DELETE FROM kv WHERE scope = 'pricing' AND key = ?`, [provider]);
    } else {
      db.run(
        `INSERT INTO kv(scope, key, value) VALUES('pricing', ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
        [provider, stringifyJson(current)]
      );
    }
  });
  invalidate();
  return await getUserPricing();
}

export async function resetAllPricing() {
  await pricingKv.clear();
  invalidate();
  return {};
}
