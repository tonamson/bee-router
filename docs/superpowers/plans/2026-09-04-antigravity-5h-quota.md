# Antigravity 5h Quota Tracker Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Antigravity's 5h/weekly quota readings usable again by the routing layer, so an exhausted account is skipped before the upstream call and the real reset time (not a flat 15-minute strike block) drives fallback.

**Architecture:** Antigravity quota is *pooled* (Gemini pool vs Claude+GPT pool), but every consumer indexes the quota map by model id. Rather than forcing the producer back to per-model keys, teach the consumers to resolve a model to its pool via one shared helper, and stop `getAntigravityUsage()` from throwing away the per-model map when the pool summary succeeds. A new producer→consumer contract test closes the gap that let this regression ship.

**Tech Stack:** Plain ESM JavaScript, Next.js 15 app + `open-sse` engine, vitest (`tests/`), no TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-04-antigravity-5h-quota-design.md`

## Global Constraints

- Plain JavaScript (ESM). No TypeScript. `@/*` → `src/*` (`jsconfig.json`).
- `open-sse/` is the provider-agnostic engine; `src/sse/` is the app glue. Imports may go `src/sse → open-sse`, never the reverse. The shared helper therefore lives in `open-sse/`.
- Never hardcode role/block/model strings where a constant exists — use `open-sse/config/` (`getModelsByProviderId`) and the registry.
- Tests run from `tests/`, which is an **independent ESM package**: `cd tests && npx vitest run unit/<file>` (do NOT use `tests/package.json`'s `test` script — it hardcodes `/tmp` paths).
- Root `npm install` must have been run before tests (`tests/` imports from `src/` which needs `open`, `undici`).
- The suite is **not** all-green on a plain checkout (~938 pass / ~64 fail). Judge regressions with `node tests/__baseline__/verify-no-regression.mjs`, never a raw pass/fail count.
- Commit style: Conventional Commits (`fix(usage): …`). Every user-visible change gets a `CHANGELOG.md` entry.
- Fail-open rule for quota code: a quota lookup that cannot resolve must return `null`/`undefined` and let the request proceed. Never throw out of the quota path.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `open-sse/services/usage/google.js` | Producer. Fetches Antigravity quota, exports pool-mapping helpers. | Modify |
| `src/sse/services/antigravityQuota.js` | RAM quota cache + 409/429 handler. Resolves model → pool. | Modify |
| `src/sse/services/auth.js` | Account pre-filter. Resolves model → pool. | Modify |
| `tests/unit/antigravity-quota-contract.test.js` | **New.** Producer→consumer contract test (the missing integration test). | Create |
| `tests/unit/antigravity-quota-weekly.test.js` | Producer test. Assertion flipped: per-model bars now survive alongside pools. | Modify |
| `tests/unit/antigravity-quota-routing.test.js` | Consumer test. Gains pool-keyed cases. | Modify |
| `tests/fixtures/antigravity-quota-summary.json` | **New.** Captured real `:retrieveUserQuotaSummary` payload. | Create (Task 1) |
| `CHANGELOG.md` | Release notes. | Modify |

`readModelQuota` and `antigravityPoolIdsForModel` both live in `open-sse/services/usage/google.js` next to the parser that produces the keys they resolve — the mapping and its producer change together.

---

### Task 1: Capture the real quota payload (evidence gate)

The bucket ids `gemini-5h` / `3p-5h` / `gemini-weekly` / `3p-weekly` and the `groups[].buckets[]` envelope exist in this repo **only in a mock written by the same commit as the parser** (`0115361c`). Nothing verifies them against Google. Tasks 2 and 6 hardcode assumptions that this task confirms or corrects.

**Files:**
- Create: `tests/fixtures/antigravity-quota-summary.json`
- Create (throwaway, not committed): `scripts/tmp/probe-antigravity-quota.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `tests/fixtures/antigravity-quota-summary.json` — the verbatim `:retrieveUserQuotaSummary` response body, used as the mock payload by Tasks 2–5.

- [ ] **Step 1: Write the probe script**

Create `scripts/tmp/probe-antigravity-quota.mjs`:

```js
// Read-only probe. Reads the operator's own stored Antigravity OAuth token and
// dumps the three discovery endpoints. Not committed — delete after Step 4.
import { execFileSync } from "node:child_process";

const raw = execFileSync("python3", ["-c", `
import sqlite3, json, os
p = os.path.expanduser('~/.bee-router/db/data.sqlite')
c = sqlite3.connect('file:' + p + '?mode=ro', uri=True)
cur = c.execute("select id,name,data from providerConnections where provider='antigravity'")
cols = [d[0] for d in cur.description]
print(json.dumps([dict(zip(cols, r)) for r in cur.fetchall()]))
`]).toString();

const conns = JSON.parse(raw).map((r) => ({ ...r, data: JSON.parse(r.data) }));
if (conns.length === 0) throw new Error("no antigravity connection in ~/.bee-router/db/data.sqlite");

const UA = "antigravity/ide/2.1.1 darwin/arm64";
const CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const CLIENT_SECRET = "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";

async function refresh(d) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: d.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return (await res.json()).access_token || null;
}

async function post(url, token, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": UA,
      "Content-Type": "application/json",
      "X-Client-Name": "antigravity",
      "X-Client-Version": "2.1.1",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; }
  catch { return { status: res.status, body: text.slice(0, 500) }; }
}

const c = conns[0];
let token = c.data.accessToken;
const meta = { metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" }, mode: 1 };
let sub = await post("https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist", token, meta);
if (sub.status === 401 && c.data.refreshToken) {
  token = await refresh(c.data);
  sub = await post("https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist", token, meta);
}
console.log("=== loadCodeAssist", sub.status, JSON.stringify(sub.body).slice(0, 800));

const project = sub.body?.cloudaicompanionProject;
const payload = project ? { project } : {};
const summary = await post("https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary", token, payload);
console.log("=== retrieveUserQuotaSummary", summary.status);
console.log(JSON.stringify(summary.body, null, 2));

const models = await post("https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels", token, payload);
console.log("=== fetchAvailableModels", models.status);
console.log(JSON.stringify(Object.keys(models.body?.models || {}), null, 2));
```

- [ ] **Step 2: Run it**

Run: `node scripts/tmp/probe-antigravity-quota.mjs`
Expected: three `===` blocks. The `retrieveUserQuotaSummary` block is the payload this task exists to capture.

If the sandbox blocks the network call or the DB read, ask the operator to run the command themselves (in Claude Code: `! node scripts/tmp/probe-antigravity-quota.mjs`) and paste the output. **Do not proceed to Task 2 on assumed values.**

- [ ] **Step 3: Record the four answers in the spec**

Append a `## 7. Live payload — verified <date>` section to `docs/superpowers/specs/2026-09-04-antigravity-5h-quota-design.md` answering, with the literal values observed:

1. Envelope shape — is it `{ groups: [{ buckets: [...] }] }`, `{ response: { groups } }`, or something else?
2. The exact `bucketId` strings.
3. Is `resetTime` an RFC3339 timestamp (`"2026-09-04T12:00:00Z"`) or a protobuf Duration (`"14400s"`)? **A Duration makes `parseResetTime` (`open-sse/services/usage/shared.js:35`) return `null`, which alone breaks the 5h countdown — if so, add a Duration branch there as part of Task 3 and note it here.**
4. Is the 5h bucket present, and does `bucket.window` carry a machine-readable value?

- [ ] **Step 4: Save the fixture and delete the probe**

Write the verbatim `retrieveUserQuotaSummary` body to `tests/fixtures/antigravity-quota-summary.json`. Redact nothing except any field containing an email, project number, or token — replace those values with `"redacted"`.

```bash
rm -rf scripts/tmp
```

- [ ] **Step 5: Reconcile the plan with reality**

If the observed `bucketId` strings differ from `gemini-5h` / `gemini-weekly` / `3p-5h` / `3p-weekly`, update **all** of the following before starting Task 2, and say so in the task report:
- `ANTIGRAVITY_POOL_LABELS` (`open-sse/services/usage/google.js:116`)
- `POOL_ORDER` in `parseQuotaData` (`src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js:622`)
- The id literals in Tasks 2–5 of this plan.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/antigravity-quota-summary.json docs/superpowers/specs/2026-09-04-antigravity-5h-quota-design.md
git commit -m "test(antigravity): capture real retrieveUserQuotaSummary payload"
```

---

### Task 2: `antigravityPoolIdsForModel` — model id → pool ids

**Files:**
- Modify: `open-sse/services/usage/google.js` (add exports near `ANTIGRAVITY_POOL_LABELS`, line 116)
- Test: `tests/unit/antigravity-quota-pools.test.js` (create)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export function antigravityPoolIdsForModel(modelId: string): string[]` — returns `["gemini-5h", "gemini-weekly"]` for a Gemini model id, `["3p-5h", "3p-weekly"]` otherwise. Always returns two ids; never throws.
  - `export function readModelQuota(quotas: object | null, model: string): object | null` — resolves a quota entry for `model`. Exact-key hit wins; otherwise returns the most constrained of the model's pools (lowest `remainingPercentage`, ties broken by the **latest** `resetAt`). Returns `null` when nothing resolves.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/antigravity-quota-pools.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  antigravityPoolIdsForModel,
  readModelQuota,
} from "../../open-sse/services/usage/google.js";

describe("antigravityPoolIdsForModel", () => {
  it("maps Gemini model ids to the Gemini pools", () => {
    expect(antigravityPoolIdsForModel("gemini-3.7-flash-high")).toEqual([
      "gemini-5h",
      "gemini-weekly",
    ]);
    expect(antigravityPoolIdsForModel("gemini-3.1-flash-image")).toEqual([
      "gemini-5h",
      "gemini-weekly",
    ]);
  });

  it("maps Claude and GPT model ids to the third-party pools", () => {
    expect(antigravityPoolIdsForModel("claude-opus-4-6-thinking")).toEqual([
      "3p-5h",
      "3p-weekly",
    ]);
    expect(antigravityPoolIdsForModel("gpt-oss-120b-medium")).toEqual([
      "3p-5h",
      "3p-weekly",
    ]);
  });

  it("never throws on junk input", () => {
    expect(antigravityPoolIdsForModel(undefined)).toEqual(["3p-5h", "3p-weekly"]);
    expect(antigravityPoolIdsForModel("")).toEqual(["3p-5h", "3p-weekly"]);
  });
});

describe("readModelQuota", () => {
  const POOLS = {
    "gemini-5h": { remainingPercentage: 40, resetAt: "2026-09-04T12:00:00.000Z" },
    "gemini-weekly": { remainingPercentage: 90, resetAt: "2026-09-08T00:00:00.000Z" },
    "3p-5h": { remainingPercentage: 0, resetAt: "2026-09-04T12:00:00.000Z" },
    "3p-weekly": { remainingPercentage: 0, resetAt: "2026-09-08T00:00:00.000Z" },
  };

  it("returns the most constrained pool for the model", () => {
    expect(readModelQuota(POOLS, "gemini-3.7-flash-high")).toBe(POOLS["gemini-5h"]);
  });

  it("breaks a tie on the latest reset so an account is not unblocked early", () => {
    expect(readModelQuota(POOLS, "claude-opus-4-6-thinking")).toBe(POOLS["3p-weekly"]);
  });

  it("prefers an exact per-model key over the pool", () => {
    const withStrike = {
      ...POOLS,
      "claude-opus-4-6-thinking": { remainingPercentage: 0, resetAt: "2026-09-04T09:15:00.000Z" },
    };
    expect(readModelQuota(withStrike, "claude-opus-4-6-thinking"))
      .toBe(withStrike["claude-opus-4-6-thinking"]);
  });

  it("returns null when nothing resolves", () => {
    expect(readModelQuota(null, "gemini-3.7-flash-high")).toBeNull();
    expect(readModelQuota({}, "gemini-3.7-flash-high")).toBeNull();
    expect(readModelQuota(POOLS, "")).toBeNull();
  });

  it("tolerates a pool with no resetAt", () => {
    const partial = {
      "gemini-5h": { remainingPercentage: 0 },
      "gemini-weekly": { remainingPercentage: 0, resetAt: "2026-09-08T00:00:00.000Z" },
    };
    expect(readModelQuota(partial, "gemini-3.7-flash-high")).toBe(partial["gemini-weekly"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tests && npx vitest run unit/antigravity-quota-pools.test.js`
Expected: FAIL — `antigravityPoolIdsForModel is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `open-sse/services/usage/google.js`, directly after the `ANTIGRAVITY_POOL_LABELS` constant (line 121):

```js
/**
 * Antigravity quota is pooled, not per-model: every Gemini model draws from the
 * Gemini 5h/weekly buckets, every Claude/GPT model from the third-party ones.
 * The registry only ships gemini-* / claude-* / gpt-* ids
 * (open-sse/providers/registry/antigravity.js), matching Google's own
 * "Gemini models" vs "Claude and GPT models" bucket groups.
 */
export function antigravityPoolIdsForModel(modelId) {
  return /^gemini/i.test(String(modelId || ""))
    ? ["gemini-5h", "gemini-weekly"]
    : ["3p-5h", "3p-weekly"];
}

function quotaResetMs(quota) {
  const parsed = Date.parse(quota?.resetAt || "");
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

/**
 * Resolve one quota entry for a model out of a getAntigravityUsage() quotas map.
 * Exact key first — that is where the 409/429 strike breaker writes its
 * synthesized block, and where the per-model fallback map lands. Otherwise the
 * most constrained pool wins; a tie resolves to the LATEST reset, because when
 * both 5h and weekly are exhausted the account stays unusable until the later
 * one refills.
 */
export function readModelQuota(quotas, model) {
  if (!quotas || !model) return null;
  if (quotas[model]) return quotas[model];

  const pools = antigravityPoolIdsForModel(model)
    .map((id) => quotas[id])
    .filter(Boolean);
  if (pools.length === 0) return null;

  return pools.reduce((worst, quota) => {
    const delta = (Number(quota.remainingPercentage) || 0)
      - (Number(worst.remainingPercentage) || 0);
    if (delta !== 0) return delta < 0 ? quota : worst;
    return quotaResetMs(quota) > quotaResetMs(worst) ? quota : worst;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tests && npx vitest run unit/antigravity-quota-pools.test.js`
Expected: PASS (11 assertions across 9 tests).

- [ ] **Step 5: Commit**

```bash
git add open-sse/services/usage/google.js tests/unit/antigravity-quota-pools.test.js
git commit -m "feat(usage): add Antigravity model-to-quota-pool resolution"
```

---

### Task 3: `getAntigravityUsage` returns per-model bars *and* pools

Today the pool summary short-circuits the per-model fetch (`google.js:221`), so the quota map contains no model-id keys at all. Merge instead of replace.

**Files:**
- Modify: `open-sse/services/usage/google.js:214-276`
- Test: `tests/unit/antigravity-quota-weekly.test.js:126` (flip the assertion)

**Interfaces:**
- Consumes: `antigravityPoolIdsForModel` / `readModelQuota` from Task 2 (not called here — same module).
- Produces: `getAntigravityUsage()` resolves to `{ plan, quotas, subscriptionInfo }` where `quotas` contains **both** per-model keys (from `:fetchAvailableModels`) and pool keys (from `:retrieveUserQuotaSummary`). Pool keys win on collision. When one endpoint fails, whatever the other returned still ships.

- [ ] **Step 1: Write the failing test**

In `tests/unit/antigravity-quota-weekly.test.js`, replace line 126:

```js
      expect(usage.quotas["gemini-3.7-flash-high"]).toBeUndefined();
```

with:

```js
      // Pools and per-model bars coexist: the dashboard renders both, and the
      // routing layer needs a per-model fallback when a pool is missing.
      expect(usage.quotas["gemini-3.7-flash-high"]).toMatchObject({
        remainingPercentage: 85,
        displayName: "Gemini 3.7 Flash (High)",
      });
      expect(usage.quotas["tab_flash_lite_preview"]).toBeUndefined();
      expect(usage.quotas["chat_20706"]).toBeUndefined();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tests && npx vitest run unit/antigravity-quota-weekly.test.js`
Expected: FAIL — first test only: `expected undefined to match object { remainingPercentage: 85, … }`. The other three tests in the file must still pass.

- [ ] **Step 3: Write minimal implementation**

In `open-sse/services/usage/google.js`, replace the block at lines 218-276 (from `const pools = …` through the final `return`) with:

```js
    const pools = await poolQuotasFromSummary(summaryResponse);
    const plan = subscriptionInfo?.currentTier?.name || "Unknown";
    const hasPools = Object.keys(pools).length > 0;

    const response = await fetchWithTimeout(
      ANTIGRAVITY_CONFIG.quotaApiUrl,
      cloneQuotaRequest(quotaRequest),
      10000,
      proxyOptions,
    ).catch(() => null);

    if (!response || !response.ok) {
      // A working pool summary is a complete answer on its own — do not
      // downgrade it to an error just because the per-model call failed.
      if (hasPools) return { plan, quotas: pools, subscriptionInfo };
      if (response?.status === 403) {
        return {
          message: "Antigravity quota API access forbidden. Chat may still work.",
          quotas: {},
        };
      }
      if (response?.status === 401) {
        return {
          message: "Antigravity quota API authentication expired. Chat may still work.",
          quotas: {},
        };
      }
      throw new Error(`Antigravity API error: ${response?.status || "network"}`);
    }

    const data = await response.json().catch(() => ({}));
    const quotas = {};

    if (data.models && typeof data.models === "object" && !Array.isArray(data.models)) {
      for (const [modelKey, info] of Object.entries(data.models)) {
        if (!info?.quotaInfo || skipAntigravityModel(modelKey, info)) continue;
        if (quotas[modelKey]) continue;

        const remainingFraction = Number(info.quotaInfo.remainingFraction) || 0;
        const remainingPercentage = remainingFraction * 100;
        const total = 1000;
        const remaining = Math.round(total * remainingFraction);

        quotas[modelKey] = {
          used: total - remaining,
          total,
          resetAt: parseResetTime(info.quotaInfo.resetTime),
          remainingPercentage,
          unlimited: false,
          displayName: info.displayName || modelKey,
        };
      }
    }

    // Pools last: a pool id and a model id never collide today, and if that
    // ever changes the aggregate reading is the authoritative one.
    return {
      plan,
      quotas: { ...quotas, ...pools },
      subscriptionInfo,
    };
```

Note the cost: the per-model call is now always made, where before a successful summary skipped it. That is one extra ~200ms request per quota refresh, throttled to one per account per 30s by `MIN_REFRESH_INTERVAL_MS` (`src/sse/services/antigravityQuota.js:18`). Accepted — the routing layer needs the per-model fallback.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tests && npx vitest run unit/antigravity-quota-weekly.test.js unit/antigravity-usage-headers.test.js unit/provider-quota-visibility.test.js`
Expected: PASS, all files. Specifically the weekly file's four tests all pass, including "keeps weekly pools when fetchAvailableModels is forbidden" (exercises the new `hasPools` branch) and "keeps per-model 5h bars when the weekly summary endpoint fails".

- [ ] **Step 5: Commit**

```bash
git add open-sse/services/usage/google.js tests/unit/antigravity-quota-weekly.test.js
git commit -m "fix(usage): keep Antigravity per-model quota bars alongside pool summary"
```

---

### Task 4: Pool-aware 409/429 handling — the regression test

This is the task that fixes the reported symptom. `handleAntigravityQuotaError` looks up `quotas[model]`, which after `0115361c` is always `undefined`, so it always takes the strike path (3× 429 in 60s → flat 15m block) and never uses the upstream 5h `resetAt`.

**Files:**
- Modify: `src/sse/services/antigravityQuota.js:8` (import), `:143` (lookup)
- Test: `tests/unit/antigravity-quota-contract.test.js` (create)

**Interfaces:**
- Consumes: `readModelQuota(quotas, model)` from Task 2; the merged quota map from Task 3.
- Produces: `handleAntigravityQuotaError(connectionId, status, model, accessToken, providerSpecificData)` returns the pool's `resetAt` in ms when that pool is exhausted, instead of `null`. Cache shape published by `getAntigravityQuotaCache()` is unchanged (pool-keyed entries plus any synthesized per-model strike blocks).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/antigravity-quota-contract.test.js`. This wires the **real** producer to the **real** consumer — the integration neither existing test file covers.

```js
/**
 * Producer→consumer contract. tests/unit/antigravity-quota-weekly.test.js
 * exercises the real getAntigravityUsage but stops at its return value;
 * tests/unit/antigravity-quota-routing.test.js mocks getAntigravityUsage
 * entirely. Neither notices when the producer's key space stops matching what
 * the router looks up. This file mocks only the network.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProviderConnections: vi.fn(),
  getSettings: vi.fn(),
  resolveConnectionProxyConfig: vi.fn(),
  proxyAwareFetch: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  getProviderConnections: mocks.getProviderConnections,
  getSettings: mocks.getSettings,
  getProxyPools: vi.fn(),
  validateApiKey: vi.fn(),
  updateProviderConnection: vi.fn(),
}));
vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: mocks.resolveConnectionProxyConfig,
  pickProxyPoolId: vi.fn(),
}));
vi.mock("@/shared/constants/providers.js", () => ({
  FREE_PROVIDERS: {},
  resolveProviderId: (provider) => provider,
}));
vi.mock("@/sse/utils/logger.js", () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn() }));
vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: mocks.proxyAwareFetch,
}));

const { getAntigravityQuotaCache, handleAntigravityQuotaError } =
  await import("@/sse/services/antigravityQuota.js");
const { getProviderCredentials } = await import("@/sse/services/auth.js");

const FIVE_H_RESET = "2026-09-04T14:00:00.000Z";
const WEEKLY_RESET = "2026-09-08T00:00:00.000Z";

// Shaped after tests/fixtures/antigravity-quota-summary.json (Task 1).
const SUMMARY = {
  groups: [
    {
      displayName: "Gemini models",
      buckets: [
        { bucketId: "gemini-5h", window: "five_hour", remainingFraction: 0.4, resetTime: FIVE_H_RESET },
        { bucketId: "gemini-weekly", window: "weekly", remainingFraction: 0.9, resetTime: WEEKLY_RESET },
      ],
    },
    {
      displayName: "Claude and GPT models",
      buckets: [
        { bucketId: "3p-5h", window: "five_hour", remainingFraction: 0, resetTime: FIVE_H_RESET },
        { bucketId: "3p-weekly", window: "weekly", remainingFraction: 0.7, resetTime: WEEKLY_RESET },
      ],
    },
  ],
};

const MODELS = {
  models: {
    "gemini-3.7-flash-high": {
      displayName: "Gemini 3.7 Flash (High)",
      quotaInfo: { remainingFraction: 0.85, resetTime: FIVE_H_RESET },
    },
  },
};

function respond(body) {
  return { ok: true, status: 200, json: async () => body, text: async () => "{}" };
}

beforeEach(() => {
  vi.clearAllMocks();
  getAntigravityQuotaCache().clear();
  mocks.resolveConnectionProxyConfig.mockResolvedValue({});
  mocks.getSettings.mockResolvedValue({});
  mocks.proxyAwareFetch.mockImplementation(async (url) => {
    const href = String(url || "");
    if (href.includes(":loadCodeAssist")) {
      return respond({ cloudaicompanionProject: "project-1", currentTier: { name: "Pro" } });
    }
    if (href.includes(":retrieveUserQuotaSummary")) return respond(SUMMARY);
    return respond(MODELS);
  });
});

describe("Antigravity quota producer→consumer contract", () => {
  it("uses the exhausted 3p 5h pool's reset time on the first 429", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    try {
      const result = await handleAntigravityQuotaError(
        "ag-a", 429, "claude-opus-4-6-thinking", "token", {},
      );
      expect(result).toBe(Date.parse(FIVE_H_RESET));
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not block a Gemini model whose pool still has quota", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    try {
      const result = await handleAntigravityQuotaError(
        "ag-b", 429, "gemini-3.7-flash-high", "token", {},
      );
      // 40% remaining → optimistic reading → strike path, no immediate block.
      expect(result).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("skips the account whose pool is exhausted and picks the next one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    mocks.getProviderConnections.mockResolvedValue([
      { id: "ag-a", email: "a@example.com", isActive: true, accessToken: "t-a" },
      { id: "ag-b", email: "b@example.com", isActive: true, accessToken: "t-b" },
    ]);
    try {
      await handleAntigravityQuotaError("ag-a", 429, "claude-opus-4-6-thinking", "token", {});
      const creds = await getProviderCredentials("antigravity", {
        model: "claude-opus-4-6-thinking",
      });
      expect(creds?.connectionId).toBe("ag-b");
    } finally {
      vi.useRealTimers();
    }
  });
});
```

Check `getProviderCredentials`'s real signature at `src/sse/services/auth.js` before running — mirror the call shape used in `tests/unit/antigravity-quota-routing.test.js` (which already calls it successfully) rather than the shape guessed above, if they differ.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tests && npx vitest run unit/antigravity-quota-contract.test.js`
Expected: FAIL on test 1 — `expected null to be 1788516000000`. That `null` is the reported bug: the 5h reset is discarded and the account falls into a flat 15-minute strike block instead. Test 3 also fails (`ag-a` is still selected).

- [ ] **Step 3: Write minimal implementation**

In `src/sse/services/antigravityQuota.js`, extend the import on line 8:

```js
import { getAntigravityUsage, readModelQuota } from "open-sse/services/usage/google.js";
```

Replace line 143:

```js
  const quota = (await refreshAntigravityQuota(connectionId, accessToken, providerSpecificData))?.[model];
```

with:

```js
  // Antigravity quota is pooled: resolve the model to its 5h/weekly pool.
  // A direct per-model key (strike block, or the fetchAvailableModels
  // fallback map) still wins — see readModelQuota.
  const quota = readModelQuota(
    await refreshAntigravityQuota(connectionId, accessToken, providerSpecificData),
    model,
  );
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tests && npx vitest run unit/antigravity-quota-contract.test.js unit/antigravity-quota-routing.test.js`
Expected: PASS, both files. `antigravity-quota-routing.test.js` must stay green untouched — its model-keyed mock still resolves through `readModelQuota`'s exact-key branch.

- [ ] **Step 5: Commit**

```bash
git add src/sse/services/antigravityQuota.js tests/unit/antigravity-quota-contract.test.js
git commit -m "fix(antigravity): resolve 409/429 quota by pool so the real 5h reset is used"
```

---

### Task 5: Pool-aware account pre-filter

`auth.js` reads the same cache by model id in two places, so exhausted accounts are never skipped ahead of the upstream call and the retry-timing hint is never found.

**Files:**
- Modify: `src/sse/services/auth.js:6` (import), `:90` (pre-filter), `:115-117` (reset collection)
- Test: `tests/unit/antigravity-quota-contract.test.js` (extend)

**Interfaces:**
- Consumes: `readModelQuota` from Task 2.
- Produces: no signature change. `getProviderCredentials("antigravity", { model })` now skips a connection whose resolved pool is at `remainingPercentage <= 0` with a future `resetAt`.

- [ ] **Step 1: Write the failing test**

Append to the `describe` block in `tests/unit/antigravity-quota-contract.test.js`:

```js
  it("reports the pool reset time when every account is exhausted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    mocks.getProviderConnections.mockResolvedValue([
      { id: "ag-a", email: "a@example.com", isActive: true, accessToken: "t-a" },
    ]);
    try {
      await handleAntigravityQuotaError("ag-a", 429, "claude-opus-4-6-thinking", "token", {});
      const creds = await getProviderCredentials("antigravity", {
        model: "claude-opus-4-6-thinking",
      });
      expect(creds).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tests && npx vitest run unit/antigravity-quota-contract.test.js`
Expected: FAIL — the new test returns credentials for `ag-a` instead of `null`, because the pre-filter's `cache.get(c.id)?.[model]` misses the pool-keyed entry. (Task 4's test 3 also regresses to fragile if not yet fixed here — both read sites need the change.)

- [ ] **Step 3: Write minimal implementation**

In `src/sse/services/auth.js`, extend the import on line 6:

```js
import { getAntigravityQuotaCache } from "./antigravityQuota.js";
import { readModelQuota } from "open-sse/services/usage/google.js";
```

Replace line 90:

```js
        const quota = antigravityQuotaCache.get(c.id)?.[model];
```

with:

```js
        const quota = readModelQuota(antigravityQuotaCache.get(c.id), model);
```

Replace lines 115-117:

```js
        connections.forEach((c) => {
          const resetAt = antigravityQuotaCache.get(c.id)?.[model]?.resetAt;
          if (resetAt && new Date(resetAt).getTime() > Date.now()) expiries.push(resetAt);
        });
```

with:

```js
        connections.forEach((c) => {
          const resetAt = readModelQuota(antigravityQuotaCache.get(c.id), model)?.resetAt;
          if (resetAt && new Date(resetAt).getTime() > Date.now()) expiries.push(resetAt);
        });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tests && npx vitest run unit/antigravity-quota-contract.test.js unit/antigravity-quota-routing.test.js unit/antigravity-quota-pools.test.js`
Expected: PASS, all three files.

- [ ] **Step 5: Commit**

```bash
git add src/sse/services/auth.js tests/unit/antigravity-quota-contract.test.js
git commit -m "fix(antigravity): skip pool-exhausted accounts in the auth pre-filter"
```

---

### Task 6: Normalize per-model fallback keys to registry model ids

Secondary, pre-existing: the fallback map is keyed by upstream ids (`gemini-3.7-flash-tiered`) while callers pass registry ids (`gemini-3.7-flash-high`, per `open-sse/providers/registry/antigravity.js:51`). The pool path now covers the common case, but the fallback should resolve too.

**Files:**
- Modify: `open-sse/services/usage/google.js` (import + per-model loop)
- Test: `tests/unit/antigravity-quota-weekly.test.js` (extend)

**Interfaces:**
- Consumes: `getModelsByProviderId` from `open-sse/config/providerModels.js` (`export function getModelsByProviderId(providerId): Array<{id, name, upstreamModelId?}>`).
- Produces: no signature change. Each per-model quota is additionally indexed under any registry model id that resolves to the same upstream base id, without overwriting an existing exact-key entry.

- [ ] **Step 1: Write the failing test**

In `tests/unit/antigravity-quota-weekly.test.js`, add to the `MODEL_QUOTAS` mock (after the `gemini-3.7-flash-tiered` entry, line 62):

```js
    "gemini-3.6-flash-tiered": {
      displayName: "Gemini 3.6 Flash",
      quotaInfo: { remainingFraction: 0.5, resetTime: "2026-08-21T12:00:00Z" },
    },
```

and add a test to the `describe` block:

```js
  it("indexes upstream-keyed quotas under their registry model ids", async () => {
    proxyAwareFetch.mockImplementation(async (url) => {
      const href = String(url || "");
      if (href.includes(":loadCodeAssist")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ cloudaicompanionProject: "project-1", currentTier: { name: "Pro" } }),
          text: async () => "{}",
        };
      }
      if (href.includes(":retrieveUserQuotaSummary")) {
        return { ok: false, status: 404, json: async () => ({}), text: async () => "{}" };
      }
      return { ok: true, status: 200, json: async () => MODEL_QUOTAS, text: async () => "{}" };
    });

    const { getAntigravityUsage } = await import("../../open-sse/services/usage/google.js");
    const usage = await getAntigravityUsage("access-token", {});

    // gemini-3.6-flash-tiered is the upstream base for the high/medium/low
    // registry ids, so all three resolve to the same bucket.
    expect(usage.quotas["gemini-3.6-flash-high"]).toMatchObject({ remainingPercentage: 50 });
    expect(usage.quotas["gemini-3.6-flash-low"]).toMatchObject({ remainingPercentage: 50 });
    // An exact upstream match must not be clobbered by an alias.
    expect(usage.quotas["gemini-3.7-flash-high"]).toMatchObject({ remainingPercentage: 85 });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tests && npx vitest run unit/antigravity-quota-weekly.test.js -t "registry model ids"`
Expected: FAIL — `expected undefined to match object { remainingPercentage: 50 }`.

- [ ] **Step 3: Write minimal implementation**

In `open-sse/services/usage/google.js`, add to the imports at the top:

```js
import { getModelsByProviderId } from "../../config/providerModels.js";
```

Add next to `skipAntigravityModel` (line 183):

```js
const stripTierSuffix = (id) => String(id || "").replace(/\(.*\)$/, "");

/**
 * fetchAvailableModels keys quotas by upstream id ("gemini-3.6-flash-tiered")
 * while callers pass registry ids ("gemini-3.6-flash-high"). Return every
 * registry id that maps onto the same upstream base so the lookup resolves.
 */
function antigravityModelAliases(modelKey) {
  const base = stripTierSuffix(modelKey);
  const aliases = [];
  for (const model of getModelsByProviderId("antigravity")) {
    if (model.id === modelKey) continue;
    if (stripTierSuffix(model.upstreamModelId || model.id) === base) aliases.push(model.id);
  }
  return aliases;
}
```

In the per-model loop, after `quotas[modelKey] = { … };` (currently `google.js:268`), add:

```js
        for (const alias of antigravityModelAliases(modelKey)) {
          if (!quotas[alias]) quotas[alias] = quotas[modelKey];
        }
```

Because the loop assigns `quotas[modelKey]` before aliasing and the alias write is guarded by `if (!quotas[alias])`, an exact upstream key always beats an alias regardless of `Object.entries` order — except when an alias is written before its own exact key is reached. Guard that by running the alias pass in a second loop, after the exact pass:

```js
    // Second pass: aliases never overwrite an exact key, whatever the order.
    for (const modelKey of Object.keys(quotas)) {
      for (const alias of antigravityModelAliases(modelKey)) {
        if (!quotas[alias]) quotas[alias] = quotas[modelKey];
      }
    }
```

Use the second-pass form; drop the inline version. Place it immediately after the `if (data.models && …) { … }` block and before the final `return`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tests && npx vitest run unit/antigravity-quota-weekly.test.js unit/antigravity-quota-contract.test.js unit/provider-quota-visibility.test.js`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add open-sse/services/usage/google.js tests/unit/antigravity-quota-weekly.test.js
git commit -m "fix(usage): alias Antigravity upstream quota keys to registry model ids"
```

---

### Task 7: Regression sweep and changelog

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: everything from Tasks 2-6.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Run the baseline regression check**

Run: `node tests/__baseline__/verify-no-regression.mjs`
Expected: no *new* failures. A raw `npx vitest run` is ~938 pass / ~64 fail on a clean checkout (26 catalogued in `tests/__baseline__/known-fails.txt`, plus `unit/embeddings.cloud.test.js` which imports the absent `cloud/` dir, `unit/xai-oauth-service.test.js` which times out without network, and `real/*.real.test.js` which need live credentials). Judge by the baseline script, never the raw count.

- [ ] **Step 2: Run the provider registry baselines**

Run: `node tests/__baseline__/verify-providers.mjs`
Expected: PASS. No registry field changed in this plan, so any diff here is an accident to investigate before committing.

- [ ] **Step 3: Lint**

Run: `npx eslint open-sse/services/usage/google.js src/sse/services/antigravityQuota.js src/sse/services/auth.js`
Expected: no errors.

- [ ] **Step 4: Write the changelog entry**

Add under a new `## Fixes` heading at the top of `CHANGELOG.md` (above the current top release section, following the existing bullet style):

```markdown
# Unreleased

## Fixes
- **Antigravity**: 5h/weekly quota is pooled upstream, but the router looked it
  up by model id and always missed — exhausted accounts were never skipped
  before the upstream call, and a 409/429 fell back to a flat 15-minute strike
  block instead of the real reset time. Model ids now resolve to their
  Gemini / Claude+GPT pool, and `getAntigravityUsage` returns per-model bars
  alongside the pool summary instead of replacing them.

---
```

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): note Antigravity 5h quota pool-resolution fix"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §2 root cause — pool-keyed producer vs model-keyed consumers | 4, 5 |
| §2 consequence 1 — routing pre-filter dead | 5 |
| §2 consequence 2 — exact reset never used | 4 |
| §2 consequence 3 — upstream vs registry key mismatch | 6 |
| §2 "why tests stayed green" — contract gap | 4 (`antigravity-quota-contract.test.js`) |
| §3.1 `antigravityPoolIdsForModel` | 2 |
| §3.2 pool-aware lookup at both read sites | 4, 5 |
| §3.3 keep per-model bars alongside pools | 3 |
| §3.4 fallback key normalization | 6 |
| §4 tests 1-6 | 2 (5, 6), 3 (4), 4 (1, 2), 5 (3) |
| §5 open item — live payload verification | 1 |
| §6 out of scope — `total = 1000` fake unit | not planned, by design |

**Type consistency** — `antigravityPoolIdsForModel(modelId) → string[]` and `readModelQuota(quotas, model) → object | null` are defined in Task 2 and used under exactly those names in Tasks 4 and 5. `getModelsByProviderId(providerId)` matches `open-sse/config/providerModels.js:109`. Cache entry shape `{ remainingPercentage, resetAt }` is unchanged from `src/sse/services/antigravityQuota.js:46`.

**Known soft spot** — Task 1 is a hard gate. Every pool id literal in Tasks 2-5 is unverified against the live API until it runs. Task 1 Step 5 lists every location to update if the real ids differ.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-04-antigravity-5h-quota.md`. Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
