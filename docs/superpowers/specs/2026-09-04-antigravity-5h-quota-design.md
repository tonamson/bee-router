# Spec / Plan — Antigravity 5h quota tracker is wrong

Status: proposed. No code changed.

## 1. Symptom

Antigravity's 5h-window quota in the dashboard (and the quota-aware routing that
depends on it) does not match reality.

## 2. Root cause

Commit `0115361c` ("fix(usage): show Antigravity 5h/weekly pools") made
`getAntigravityUsage()` prefer `:retrieveUserQuotaSummary`. When that endpoint
answers, the function **returns early** with a pool-keyed map and never falls
through to the per-model `:fetchAvailableModels` map:

`open-sse/services/usage/google.js:221`
```js
if (Object.keys(pools).length > 0) {
  return { plan, quotas: pools, subscriptionInfo };   // keys: gemini-5h, gemini-weekly, 3p-5h, 3p-weekly
}
```

The repo's own test asserts this: `tests/unit/antigravity-quota-weekly.test.js:126`
`expect(usage.quotas["gemini-3.7-flash-high"]).toBeUndefined()`.

Every consumer downstream still indexes that map **by model id**:

- `src/sse/services/antigravityQuota.js:143` — `(await refreshAntigravityQuota(...))?.[model]`
- `src/sse/services/auth.js:89` — `antigravityQuotaCache.get(c.id)?.[model]`
- `src/sse/services/antigravityQuota.js:170` / `:44` — writes/re-asserts strike
  blocks under `cached[model]`

`model` is the client-requested id (`claude-opus-4-6-thinking`,
`gemini-3.7-flash-high`, …). It never equals `gemini-5h` / `3p-5h`, so the
lookup is permanently `undefined`.

### Consequences

1. **Quota-aware routing is dead.** The `auth.js` pre-filter never skips an
   account whose 5h pool is exhausted — every request is sent upstream and
   fails with 409/429 first.
2. **Exact reset time is never used.** In `handleAntigravityQuotaError` the
   `!quota` branch always wins, so the code takes the strike path: 3× 429
   within 60s, then a flat 15-minute `STRIKE_BLOCK_MS` block. The real 5h reset
   (which can be up to 5h away) is discarded — that is the "5h window is wrong"
   the user sees. The "healthy-but-exhausted → use upstream `resetAt`" branch
   (`antigravityQuota.js:178-186`) is unreachable in production.
3. **Secondary (pre-existing):** even on the fallback path, the per-model map is
   keyed by upstream `fetchAvailableModels` keys
   (`gemini-3.7-flash-tiered`), not registry model ids
   (`gemini-3.7-flash-high`), so the same lookup mismatches there too.

### Why the tests stayed green

The two test files mock opposite sides and never meet:

- `tests/unit/antigravity-quota-weekly.test.js` calls the real
  `getAntigravityUsage` and asserts pool keys.
- `tests/unit/antigravity-quota-routing.test.js:25` mocks
  `open-sse/services/usage/google.js` and hands routing a **model-keyed** map
  (`{ [MODEL]: { remainingPercentage, resetAt } }`) that production never
  produces.

No test asserts that `getAntigravityUsage()`'s real output is usable by
`refreshAntigravityQuota` / `auth.js`. That contract gap is the reason the
regression shipped.

## 3. Design of the fix

Antigravity quota is genuinely **pooled**, not per-model. Make the consumers
speak pools instead of forcing the producer back to per-model keys.

### 3.1 New shared helper — model → pool ids

New export in `open-sse/services/usage/google.js` (single source of truth,
imported by both the router and the dashboard):

```js
export function antigravityPoolIdsForModel(modelId) {
  const gemini = /^gemini/i.test(String(modelId || ""));
  return gemini ? ["gemini-5h", "gemini-weekly"] : ["3p-5h", "3p-weekly"];
}
```

Rationale: the registry only contains `gemini-*`, `claude-*`, `gpt-*` ids
(`open-sse/providers/registry/antigravity.js:47-68`), and Google's own bucket
grouping is "Gemini models" vs "Claude and GPT models".

### 3.2 Quota lookup becomes pool-aware

`src/sse/services/antigravityQuota.js`, new internal:

```js
function readModelQuota(quotas, model) {
  if (!quotas) return null;
  if (quotas[model]) return quotas[model];                       // strike block / per-model fallback
  const pools = antigravityPoolIdsForModel(model)
    .map((id) => quotas[id]).filter(Boolean);
  if (pools.length === 0) return null;
  // Most constrained pool wins; on a tie prefer the earliest reset.
  return pools.sort((a, b) =>
    a.remainingPercentage - b.remainingPercentage
    || Date.parse(a.resetAt || 0) - Date.parse(b.resetAt || 0))[0];
}
```

Apply at both read sites:
- `handleAntigravityQuotaError` → `readModelQuota(await refreshAntigravityQuota(...), model)`
- `auth.js` pre-filter and its `resetAt` collection → `readModelQuota(cache.get(c.id), model)`

Keep the per-model direct hit first so synthesized strike-block entries
(written under `cached[model]`) still take precedence — no change to the
circuit-breaker semantics.

### 3.3 Keep per-model bars alongside pools

Change `google.js:221` from early-return to merge: always attempt
`fetchAvailableModels`, and return `{ ...perModel, ...pools }`. Pools keep
priority on key collisions (there are none today).

Effect: the dashboard shows the 5h/weekly pools **and** the per-model detail
bars; the routing layer gets a usable fallback if a future summary payload
drops a pool. Dashboard ordering already handles the mixed set
(`ProviderLimits/utils.js:621-631`).

If preserving the current UI exactly matters more, gate the per-model rows
behind the existing quota-visibility mechanism rather than dropping them from
the API response — routing needs them either way.

### 3.4 Fallback-path key normalization (secondary)

In the `fetchAvailableModels` branch, also index each quota under the registry
model id whose `upstreamModelId` (base, tier suffix stripped) matches the
upstream key, so `quotas["gemini-3.7-flash-high"]` resolves on the fallback
path too.

## 4. Tests to add (write these first — they must fail before the fix)

1. `tests/unit/antigravity-quota-contract.test.js` — **the missing integration
   test.** Mock only `proxyAwareFetch` (as the weekly test does), call the real
   `getAntigravityUsage`, feed its output into the real
   `refreshAntigravityQuota`, then assert
   `handleAntigravityQuotaError(id, 429, "claude-opus-4-6-thinking", …)`
   returns the `3p-5h` bucket's `resetAt` — not `null`.
   Currently: returns `null` (strike path). This is the regression test.
2. Same file: `gemini-3.7-flash-high` resolves to the `gemini-5h` bucket.
3. Same file: when the 5h pool is at 0% with a future `resetAt`, `auth.js`
   pre-filter skips that connection and picks the next account.
4. `antigravity-quota-weekly.test.js`: flip the `gemini-3.7-flash-high`
   assertion — per-model bars must now survive alongside pools; keep asserting
   pool rows and their order.
5. Unit test for `antigravityPoolIdsForModel` mapping (gemini vs claude vs gpt).
6. Unit test: `readModelQuota` picks the more constrained of 5h/weekly and
   still prefers an explicit per-model strike-block entry.

## 5. Open item — needs live verification before implementing 3.1/3.3

The bucket ids (`gemini-5h`, `3p-5h`, `gemini-weekly`, `3p-weekly`) and the
`groups[].buckets[]` envelope exist in this repo **only inside the mock written
by the same commit as the parser** — there is no captured real response. Before
implementing, capture one real `:retrieveUserQuotaSummary` payload from a live
Antigravity OAuth account and confirm:

- the envelope (`groups[].buckets[]` vs something else),
- the actual `bucketId` strings,
- whether `resetTime` is an RFC3339 timestamp or a protobuf Duration
  (`"14400s"` — `parseResetTime` would return `null` for that, which alone
  would break the 5h countdown),
- whether the 5h bucket is present for every plan tier.

If the real ids differ, §3.1's mapping and `ANTIGRAVITY_POOL_LABELS` must be
keyed off the real values (or off `bucket.window` + group, which is more
robust than hardcoded ids).

## 6. Out of scope

- The normalized `total = 1000` fake unit shown as "used/total" in the quota
  table. Cosmetic, pre-existing, unrelated to the 5h window.

## 7. Live payload — verified 2026-09-04

Captured via `scripts/tmp/probe-antigravity-quota.mjs` (throwaway, deleted)
against a live Antigravity OAuth account (`free-tier`), verbatim body saved at
`tests/fixtures/antigravity-quota-summary.json` (no email / project-number /
token fields present in the summary body, so no redaction was needed).

1. **Envelope shape** — top-level `{ groups: [{ buckets: [...] }], description }`.
   No `response` wrapper. Matches the existing mock/parser assumption.
2. **Exact `bucketId` strings** — `gemini-weekly`, `gemini-5h`, `3p-weekly`,
   `3p-5h`. Match the mock exactly; **no reconciliation needed** (plan Step 5
   is a no-op: `ANTIGRAVITY_POOL_LABELS`, `POOL_ORDER`, and Tasks 2–5 id
   literals stay as-is).
3. **`resetTime` format** — RFC3339 timestamps, e.g. `"2026-09-10T04:37:49Z"`.
   Not a protobuf Duration. `parseResetTime`
   (`open-sse/services/usage/shared.js:35`) handles this; no Duration branch
   needed.
4. **5h bucket** — present in both groups (`Gemini Models`, `Claude and GPT
   models`). `bucket.window` carries machine-readable values: `"5h"` and
   `"weekly"`. Buckets also carry `displayName`, `description`, and
   `remainingFraction` (0..1 float, e.g. `0.9699211`).

Observed group display names: `"Gemini Models"` ("Models within this group:
Gemini Flash, Gemini Pro") and `"Claude and GPT models"` ("Models within this
group: Claude Opus, Claude Sonnet, GPT-OSS").
