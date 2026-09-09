# Upstream Fixes Sync (9router v0.5.65 -> v0.5.69) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port upstream 9router bugfixes, security hardening, and model enhancements into BeeRouter on a clean integration branch while preserving BeeRouter's custom Obsidian Cyber CRM UI, TopBar navigation, and 5h pooled quota architecture.

**Architecture:** Two-stage integration on branch `feat/sync-upstream-fixes`. Stage 1 ports core engine, provider translators, usage tracking, and security guards with Vitest unit tests. Stage 2 ports selective UI enhancements (theme anti-flash, provider status filter, custom model capability toggles, connections card scroll, and CLI key presets) by adapting their logic into BeeRouter's existing design tokens and component structures without overwriting layout chrome.

**Tech Stack:** Next.js 16, React 19, Express/SSE (open-sse), Vitest 5, Tailwind CSS 4, SQLite/sql.js.

## Global Constraints

- **Preserve BeeRouter UI:** Do not overwrite TopBar navigation, Obsidian & Gold palette, Geist typography, or 2-locale restriction (`en`/`vi`).
- **Preserve Quota Architecture:** Maintain `resolveAntigravityPoolQuota`, chat host daily resolution, and pool-exhausted pre-filtering in `src/sse/services/antigravityQuota.js`.
- **Zero Placeholder Code:** Every step must contain exact code and commands.
- **TDD & Verification:** Run Vitest (`npx vitest run -c tests/vitest.config.js`) after every task.

---

### Task 1: Setup Integration Branch and Baseline Verification

**Files:**
- Create branch: `feat/sync-upstream-fixes` from `master`
- Test: `tests/vitest.config.js`

**Interfaces:**
- Consumes: Clean working tree on `master`
- Produces: Checked-out branch `feat/sync-upstream-fixes` with passing baseline tests

- [ ] **Step 1: Check git status and current branch**

```bash
git status
```
Expected: On branch `master`, working tree clean.

- [ ] **Step 2: Run baseline Vitest test**

```bash
npx vitest run -c tests/vitest.config.js tests/unit/antigravity-quota-routing.test.js
```
Expected: PASS (15 passed).

- [ ] **Step 3: Create and switch to integration branch**

```bash
git checkout -b feat/sync-upstream-fixes
```
Expected: Switched to a new branch 'feat/sync-upstream-fixes'.

- [ ] **Step 4: Verify upstream remote is fetched**

```bash
git rev-parse upstream/master
```
Expected: `eb712ca8...`

---

### Task 2: Security & Auth Hardening

**Files:**
- Modify: `src/shared/utils/ssrfGuard.js`
- Modify: `src/app/api/cli-tools/cowork-mcp-tools/route.js`
- Modify: `src/dashboardGuard.js`
- Modify: `src/sse/handlers/chat.js`
- Create: `tests/unit/ssrf-guard-hardening.test.js`
- Create: `tests/unit/cowork-mcp-ssrf-guard.test.js`
- Create: `tests/unit/dashboard-guard.test.js`

**Interfaces:**
- Consumes: `assertPublicUrl`, `assertPublicUrlResolved`, `fetchPublic` in `src/shared/utils/ssrfGuard.js`
- Produces: Hardened SSRF validation (IPv6 groups, trailing dot normalization, DNS resolved validation) and root `/responses` protection

- [ ] **Step 1: Port SSRF test suite and fail-check**

Create `tests/unit/ssrf-guard-hardening.test.js` and `tests/unit/cowork-mcp-ssrf-guard.test.js` from upstream:
```bash
git checkout upstream/master -- tests/unit/ssrf-guard-hardening.test.js tests/unit/cowork-mcp-ssrf-guard.test.js tests/unit/dashboard-guard.test.js
```

Run tests to verify failures on current codebase:
```bash
npx vitest run -c tests/vitest.config.js tests/unit/ssrf-guard-hardening.test.js tests/unit/cowork-mcp-ssrf-guard.test.js tests/unit/dashboard-guard.test.js
```
Expected: FAIL (missing `assertPublicUrlResolved`, missing `/responses` guard).

- [ ] **Step 2: Port SSRF guard implementation and route updates**

Checkout the hardened security files from upstream:
```bash
git checkout upstream/master -- src/shared/utils/ssrfGuard.js src/app/api/cli-tools/cowork-mcp-tools/route.js
```

Update `src/dashboardGuard.js` to protect root `/responses`:
In `src/dashboardGuard.js`, add `/responses` to `PUBLIC_PREFIXES`:
```javascript
const PUBLIC_PREFIXES = [
  "/api/v1",
  "/v1",
  "/responses",
  "/cli",
  "/health",
  "/favicon.ico",
  "/_next",
];
```

In `src/sse/handlers/chat.js`, ensure 503 is returned when all credentials are rate-limited:
Ensure status 503 is sent instead of 429 when no credential slots remain.

- [ ] **Step 3: Run security unit tests to verify they pass**

```bash
npx vitest run -c tests/vitest.config.js tests/unit/ssrf-guard-hardening.test.js tests/unit/cowork-mcp-ssrf-guard.test.js tests/unit/dashboard-guard.test.js
```
Expected: PASS for all 3 test files.

- [ ] **Step 4: Commit security hardening**

```bash
git add src/shared/utils/ssrfGuard.js src/app/api/cli-tools/cowork-mcp-tools/route.js src/dashboardGuard.js src/sse/handlers/chat.js tests/unit/ssrf-guard-hardening.test.js tests/unit/cowork-mcp-ssrf-guard.test.js tests/unit/dashboard-guard.test.js
git commit -m "fix(security): close SSRF bypasses and protect /responses route"
```

---

### Task 3: Antigravity & Gemini Core Enhancements

**Files:**
- Create: `open-sse/services/thoughtSignatureStore.js`
- Modify: `open-sse/executors/antigravity.js`
- Modify: `open-sse/handlers/chatCore.js`
- Modify: `open-sse/handlers/chatCore/streamingHandler.js`
- Modify: `open-sse/translator/formats/gemini.js`
- Modify: `open-sse/translator/request/openai-to-gemini.js`
- Modify: `open-sse/translator/response/gemini-to-openai.js`
- Modify: `open-sse/providers/registry/antigravity.js`
- Modify: `open-sse/providers/registry/gemini.js`
- Modify: `open-sse/services/projectId.js`
- Modify: `src/mitm/antigravityIdeVersion.js`
- Modify: `src/sse/services/antigravityQuota.js`
- Modify: `src/sse/services/backgroundTokenRefresh.js`
- Modify: `src/sse/services/tokenRefresh.js`
- Create/Port: `tests/unit/antigravity-quota-gemini-3.8.test.js`, `tests/unit/gemini-3.8-antigravity.test.js`, `tests/unit/gemini-38-integration.test.js`, `tests/unit/antigravity-ide-version.test.js`

**Interfaces:**
- Consumes: BeeRouter's `resolveAntigravityPoolQuota` and daily chat host logic
- Produces: Circuit breaker strike-block in `antigravityQuota.js`, Gemini 3.8 Flash catalog, `thoughtSignatureStore` replay

- [ ] **Step 1: Port Gemini 3.8 and Antigravity unit tests**

```bash
git checkout upstream/master -- tests/unit/antigravity-quota-gemini-3.8.test.js tests/unit/gemini-3.8-antigravity.test.js tests/unit/gemini-38-integration.test.js tests/unit/antigravity-ide-version.test.js
```

- [ ] **Step 2: Port thoughtSignatureStore and Gemini translator updates**

Port `open-sse/services/thoughtSignatureStore.js`:
```bash
git checkout upstream/master -- open-sse/services/thoughtSignatureStore.js open-sse/translator/formats/gemini.js
```

Port `open-sse/executors/antigravity.js`, `open-sse/translator/request/openai-to-gemini.js`, and `open-sse/translator/response/gemini-to-openai.js` using git cherry-pick or patch for commit `c08efdbe` and `f6c59d30`.

- [ ] **Step 3: Port Gemini 3.8 Flash model registry & MITM IDE fingerprint 2.11.0**

Update `open-sse/providers/registry/antigravity.js` and `open-sse/providers/registry/gemini.js` to declare `gemini-3.8-flash`.
Update `src/mitm/antigravityIdeVersion.js` to preserve client identity on model catalog requests (`f68d2f5e`) and use `2.11.0` fingerprint (`70f15aa5`).

- [ ] **Step 4: Integrate anti-abuse throttling and strike-break circuit breaker into `src/sse/services/antigravityQuota.js`**

Add strike tracking constants and functions to `src/sse/services/antigravityQuota.js`:
- `STRIKE_WINDOW_MS = 60_000`, `STRIKE_THRESHOLD = 3`, `STRIKE_BLOCK_MS = 15 * 60_000`
- `recordAntigravityQuotaStrike(connectionId, model)`
- `clearAntigravityQuotaStrikes(connectionId, model)`
- `applyActiveStrikeBlocks(connectionId, quotas)`
**Crucial:** Retain BeeRouter's `resolveAntigravityPoolQuota`, chat host daily resolution, and pool-exhausted pre-filtering untouched.

Port multi-account rate limit backoff in `open-sse/services/projectId.js`, `src/sse/services/backgroundTokenRefresh.js`, and `src/sse/services/tokenRefresh.js` (`1442cc73`, `f388b5e5`).

- [ ] **Step 5: Run Antigravity and Gemini unit tests**

```bash
npx vitest run -c tests/vitest.config.js tests/unit/antigravity-quota-routing.test.js tests/unit/antigravity-quota-gemini-3.8.test.js tests/unit/gemini-3.8-antigravity.test.js tests/unit/gemini-38-integration.test.js tests/unit/antigravity-ide-version.test.js
```
Expected: PASS for all tests.

- [ ] **Step 6: Commit Antigravity and Gemini updates**

```bash
git add open-sse/ src/mitm/ src/sse/ tests/unit/
git commit -m "feat(antigravity,gemini): add Gemini 3.8 Flash, strike breaker, and thoughtSignature persistence"
```

---

### Task 4: Claude & Anthropic Translator Improvements

**Files:**
- Create: `open-sse/utils/modelMarkers.js`
- Modify: `open-sse/providers/registry/claude.js`
- Modify: `open-sse/providers/shared.js`
- Modify: `open-sse/utils/claudeCloaking.js`
- Modify: `open-sse/translator/formats/claude.js`
- Modify: `open-sse/translator/concerns/thinkingUnified.js`
- Modify: `open-sse/executors/default.js`
- Modify: `src/sse/handlers/chat.js`
- Create/Port: `tests/unit/model-context-marker.test.js`, `tests/unit/claude-foreign-server-tool-use.test.js`, `tests/unit/defer-loading-cache-control.test.js`, `tests/unit/claude-header-forwarding.test.js`

**Interfaces:**
- Consumes: Claude model requests, prompt caching headers, tool calls
- Produces: `stripModelContextMarker`, sanitized `server_tool_use`, CC 2.1.258 fingerprint, Fable 5.1 support

- [ ] **Step 1: Port Claude tests**

```bash
git checkout upstream/master -- tests/unit/model-context-marker.test.js tests/unit/claude-foreign-server-tool-use.test.js tests/unit/defer-loading-cache-control.test.js tests/unit/claude-header-forwarding.test.js
```

- [ ] **Step 2: Add modelMarkers utility and integrate into chat handler**

Port `open-sse/utils/modelMarkers.js`:
```bash
git checkout upstream/master -- open-sse/utils/modelMarkers.js
```
In `src/sse/handlers/chat.js`, call `stripModelContextMarker` on `modelStr`:
```javascript
const { stripModelContextMarker } = await import("open-sse/utils/modelMarkers.js");
const { model: cleanModel } = stripModelContextMarker(requestedModel);
```

- [ ] **Step 3: Port Claude translator fixes and fingerprint bump**

- Bump Claude Code fingerprint to `2.1.258` in `open-sse/providers/registry/claude.js`, `open-sse/providers/shared.js`, and `open-sse/utils/claudeCloaking.js` (`009cac63`, `ac9120fd`).
- Port foreign `server_tool_use` filtering and `defer_loading` cache control fixes in `open-sse/translator/formats/claude.js` (`ed1bd0c5`, `6ab9ca9e`).
- Port adaptive auto effort normalization in `open-sse/translator/concerns/thinkingUnified.js` (`77e6a227`).
- Port Claude beta flags forwarding in `open-sse/executors/default.js` (`fb9fab02`).

- [ ] **Step 4: Run Claude unit tests**

```bash
npx vitest run -c tests/vitest.config.js tests/unit/model-context-marker.test.js tests/unit/claude-foreign-server-tool-use.test.js tests/unit/defer-loading-cache-control.test.js tests/unit/claude-header-forwarding.test.js
```
Expected: PASS for all tests.

- [ ] **Step 5: Commit Claude translator fixes**

```bash
git add open-sse/ src/sse/handlers/chat.js tests/unit/
git commit -m "fix(claude): bump CC fingerprint to 2.1.258, strip [1m] marker, drop foreign server_tool_use"
```

---

### Task 5: OpenCode Go, Codex, Qoder, Groq, Ollama & Usage Tracking

**Files:**
- Create: `open-sse/services/usage/groq.js`
- Create: `open-sse/services/usage/opencode-go.js`
- Modify: `open-sse/services/usage.js`
- Modify: `open-sse/services/usage/claude.js`
- Modify: `open-sse/providers/registry/groq.js`
- Modify: `open-sse/providers/registry/opencode-go.js`
- Modify: `open-sse/providers/registry/codex.js`
- Modify: `open-sse/providers/registry/qoder.js`
- Modify: `open-sse/providers/registry/ollama.js`
- Modify: `open-sse/handlers/fetch/index.js`
- Create: `src/app/api/v1/models/[...model]/route.js`
- Delete: `src/app/api/v1/models/[kind]/route.js`
- Create/Port: `tests/unit/groq-usage.test.js`, `tests/unit/opencode-go-usage.test.js`, `tests/unit/opencode-go-session.test.js`, `tests/unit/ollama-web-fetch-provider.test.js`, `tests/unit/v1-model-lookup-3588.test.js`

**Interfaces:**
- Consumes: Usage tracking APIs, model catalog requests
- Produces: Groq and OpenCode Go usage parsers, single model lookup route, Ollama web fetch

- [ ] **Step 1: Port usage and model lookup tests**

```bash
git checkout upstream/master -- tests/unit/groq-usage.test.js tests/unit/opencode-go-usage.test.js tests/unit/opencode-go-session.test.js tests/unit/ollama-web-fetch-provider.test.js tests/unit/v1-model-lookup-3588.test.js
```

- [ ] **Step 2: Port usage handlers and registries**

Port Groq usage tracking and registry:
```bash
git checkout upstream/master -- open-sse/services/usage/groq.js open-sse/providers/registry/groq.js
```
Port OpenCode Go usage tracking and registry:
```bash
git checkout upstream/master -- open-sse/services/usage/opencode-go.js open-sse/providers/registry/opencode-go.js
```
Register them in `open-sse/services/usage.js`.
Port Claude Fable weekly quota parsing in `open-sse/services/usage/claude.js` (`e214fb1c`).

- [ ] **Step 3: Port single model lookup API route**

Port `src/app/api/v1/models/[...model]/route.js` and remove single-segment `[kind]` route:
```bash
git checkout upstream/master -- src/app/api/v1/models/\[...model\]/route.js
rm -f src/app/api/v1/models/\[kind\]/route.js
```

- [ ] **Step 4: Port Ollama fetch and Codex/Qoder registry updates**

Update `open-sse/providers/registry/ollama.js`, `open-sse/handlers/fetch/index.js`, `open-sse/providers/registry/codex.js`, `open-sse/providers/registry/qoder.js`.

- [ ] **Step 5: Run tests for usage and model lookup**

```bash
npx vitest run -c tests/vitest.config.js tests/unit/groq-usage.test.js tests/unit/opencode-go-usage.test.js tests/unit/opencode-go-session.test.js tests/unit/ollama-web-fetch-provider.test.js tests/unit/v1-model-lookup-3588.test.js
```
Expected: PASS for all tests.

- [ ] **Step 6: Commit usage and provider enhancements**

```bash
git add open-sse/ src/app/api/v1/models/ tests/unit/
git commit -m "feat(providers,usage): add Groq/OpenCode Go quota tracking and single model lookup route"
```

---

### Task 6: Selective UI Logic Integration (BeeRouter Token Compliant)

**Files:**
- Modify: `src/app/layout.js`
- Modify: `src/app/(dashboard)/dashboard/providers/page.js`
- Modify: `src/app/(dashboard)/dashboard/providers/utils.js`
- Modify: `src/app/(dashboard)/dashboard/providers/[id]/AddCustomModelModal.js`
- Modify: `src/app/(dashboard)/dashboard/providers/components/ConnectionsCard.js`
- Modify: `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js`
- Modify: `src/app/api/models/custom/route.js`
- Modify: `src/app/api/models/route.js`
- Create/Port: `tests/unit/providers-status-filter.test.js`, `tests/unit/provider-quota-visibility.test.js`

**Interfaces:**
- Consumes: BeeRouter Obsidian & Gold theme tokens, TopBar layout
- Produces: Theme anti-flash script, status filter pills, custom model capability toggles, grouped model limits

- [ ] **Step 1: Port provider status filter and quota visibility tests**

```bash
git checkout upstream/master -- tests/unit/providers-status-filter.test.js tests/unit/provider-quota-visibility.test.js
```

- [ ] **Step 2: Add theme anti-flash script to `src/app/layout.js`**

Add the pre-hydration blocking script inside `<head>` in `src/app/layout.js`:
```html
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})()`,
  }}
/>
```

- [ ] **Step 3: Adapt Provider Status Filter into `providers/page.js`**

In `src/app/(dashboard)/dashboard/providers/utils.js`, add `filterProvidersByStatus(providers, filter)`.
In `src/app/(dashboard)/dashboard/providers/page.js`, add status filter tabs:
Use BeeRouter button styling:
```jsx
{['all', 'connected', 'disconnected'].map((status) => (
  <button
    key={status}
    onClick={() => setStatusFilter(status)}
    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
      statusFilter === status
        ? 'bg-bee-gold/15 text-bee-gold border border-bee-gold/30 shadow-sm'
        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
    }`}
  >
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </button>
))}
```

- [ ] **Step 4: Adapt Custom Model Capability Toggles into `AddCustomModelModal.js`**

In `src/app/(dashboard)/dashboard/providers/[id]/AddCustomModelModal.js` and `src/app/api/models/custom/route.js`, support `caps: { vision, tools, thinking }`.
Style switches with `border-bee-gold/30` and amber toggle accents.

- [ ] **Step 5: ConnectionsCard scroll constraint**

In `src/app/(dashboard)/dashboard/providers/components/ConnectionsCard.js`, ensure max-h and custom scrollbar classes are present.

- [ ] **Step 6: Update ProviderLimits utils for Groq, Fable, and Antigravity grouping**

In `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js`:
- Add Groq and Claude Fable quota parsers.
- Support model grouping while keeping BeeRouter's `pool_summary` rendering intact.

- [ ] **Step 7: Run provider filter and quota tests**

```bash
npx vitest run -c tests/vitest.config.js tests/unit/providers-status-filter.test.js tests/unit/provider-quota-visibility.test.js
```
Expected: PASS for both test files.

- [ ] **Step 8: Commit UI adaptations**

```bash
git add src/app/layout.js src/app/(dashboard)/dashboard/ src/app/api/models/ tests/unit/
git commit -m "feat(ui): adapt theme anti-flash, provider status filter, and capability toggles with BeeRouter styling"
```

---

### Task 7: Comprehensive Verification & Production Build Gate

**Files:**
- Entire repository

**Interfaces:**
- Consumes: All completed tasks on `feat/sync-upstream-fixes`
- Produces: 100% passing test suite, successful Next.js production build, verified clean UI

- [ ] **Step 1: Run full Vitest test suite**

```bash
npx vitest run -c tests/vitest.config.js
```
Expected: All test suites pass with 0 failures.

- [ ] **Step 2: Run Next.js production build**

```bash
npm run build
```
Expected: `Compiled successfully`, standalone assets copied via `scripts/copy-standalone-assets.mjs`.

- [ ] **Step 3: Dev server sanity check**

Start server:
```bash
node custom-server.js --port 20128
```
Verify `http://localhost:20128/` responds with HTTP 200, TopBar renders properly, no console errors.

- [ ] **Step 4: Final branch review**

```bash
git status
git log --oneline master..HEAD
```
Verify only clean, structured commits are present without any leftover unwanted upstream files (e.g. `id.json`).
