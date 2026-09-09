# Upstream Fixes Sync: 9router (v0.5.65 -> v0.5.69) into BeeRouter

**Date:** 2026-09-09  
**Status:** Approved design, awaiting implementation plan  
**Scope:** Port recent bugfixes, provider enhancements, and security patches from `upstream/master` (`decolua/9router` commit `90b52e06..eb712ca8`) into BeeRouter  
**Target Branch:** `feat/sync-upstream-fixes` (branched from `master`)  
**Base Commit:** `master` (`a8465765`)  
**Upstream Range:** `90b52e06ffd666b7929554211474d01588f6b1f8..eb712ca8` (50 commits)

---

## 1. Problem & Objectives

### Problem
Since divergence point `90b52e06`:
1. **BeeRouter (`master`):** Received extensive UX and branding redesigns (Obsidian & Gold theme, Geist typography, top bar navigation, command palette, Cyber CRM dashboard, 2-locale restriction to `en`/`vi`, and custom Antigravity 5h pooled quota tracking).
2. **Upstream (`9router`):** Shipped 50 commits across v0.5.65 to v0.5.69 covering critical security fixes (SSRF hardening, cowork-mcp-tools protection, root `/responses` protection), model catalog updates (Gemini 3.8 Flash, Claude Fable, Muse Spark 1.2/1.3, GPT-5.6 Sol/Terra/Luna), translator stability (Claude [1m] context marker stripping, thoughtSignature store, Responses parallel tool calls), and quota tracking for new providers (Groq, OpenCode Go).
3. **The Risk:** Running a blunt `git merge upstream/master` or using automated upstream sync scripts directly would trigger conflicts across dashboard pages and overwrite BeeRouter's tailored UI styles, layout components, and custom Antigravity quota resolution.

### Goals
1. **Zero UI Regressions:** Maintain 100% of BeeRouter's TopBar navigation, Obsidian & Gold theme, Cyber CRM token system, and `en`/`vi` locale setup.
2. **Preserve Custom Architecture:** Keep BeeRouter's 5h Antigravity pooled quota resolution, chat host daily resolution, and pool-exhausted account pre-filtering intact.
3. **100% Backend & Security Parity:** Port all upstream security patches (SSRF bypasses, auth guards) and provider/translator bugfixes.
4. **Selective UI Feature Adaptation:** Port upstream UI functional enhancements (Provider status filter, Custom model capability toggles, CLI tools API key presets, Provider connection list scroll, and layout theme anti-flash) by adapting their logic directly to BeeRouter's design tokens and component hierarchy.
5. **Pass All Verifications:** Ensure all Vitest unit tests pass and `npm run build` succeeds cleanly.

### Non-Goals
- Restoring deleted/deprecated i18n locales (e.g. Indonesian `id.json` with 1500+ lines).
- Restoring 9router legacy sidebar navigation or 9remote/9english external links.
- Adopting upstream versioning numbers (BeeRouter maintains its independent version lifecycle).

---

## 2. Architectural Decisions & Principles

| Area | Decision | Rationale |
|---|---|---|
| **Branching Strategy** | Work exclusively in `feat/sync-upstream-fixes` branched from `master` | Keeps `master` clean; isolates verification until fully tested. |
| **Backend Integration** | Function-level and file-level porting of `open-sse/`, `src/mitm/`, `src/sse/`, `src/shared/utils/ssrfGuard.js`, `src/app/api/` | Direct port of engine logic while preserving local custom quota pooling. |
| **UI Integration** | Manual adaptation of UI logic into BeeRouter components; no wholesale file replacement of `src/app/(dashboard)` | Protects custom TopBar, CRM layout, and color tokens from being overwritten. |
| **i18n Strategy** | Retain strict `en` and `vi` dictionary support; ignore `id.json` and Chinese-only literals | Prevents locale pollution. |
| **Antigravity Quota** | Integrate anti-abuse throttling and strike-break logic on top of BeeRouter's `resolvePool()` architecture | Unifies upstream fixes with BeeRouter's multi-account pool tracker. |

---

## 3. Commit Categorization & Action Plan

### Group A: Backend, Core, Providers & Security (Port 100%)
* **Security & Auth:**
  - `b870b5d4`: Close SSRF guard bypasses in `ssrfGuard.js` (#3714).
  - `97f3ab97`: Guard `cowork-mcp-tools` probe against SSRF (#3783).
  - `98579f98`: Protect root `/responses` rewrite.
  - `15687d19`: Return 503 for rate-limited providers and bundle `node-machine-id`.
* **Antigravity & Gemini:**
  - `1442cc73`: Prevent Google anti-abuse rate limits on multi-account refresh (#3813).
  - `ac98dd9d`: Strike-break optimistic quota readings that keep 429ing.
  - `70f15aa5`: Add Gemini 3.8 Flash support & bump IDE fingerprint to 2.11.0.
  - `f68d2f5e`: Preserve client identity on model catalog requests.
  - `f388b5e5`: Remove noisy background token refresh logs.
  - `c08efdbe`: Persist and replay `thoughtSignature` with session namespace (`open-sse/services/thoughtSignatureStore.js`).
  - `1fe996db`: Route Gemini thinking through `reasoning_effort` on OpenAI wire.
  - `f6c59d30`: Convert `prefixItems` and ensure array items in schema sanitizer.
* **Claude & Anthropic:**
  - `009cac63`: Bump Claude Code fingerprint to 2.1.258 for new-model access.
  - `ee7a9616`: Strip `[1m]` context marker Claude Code appends to model names.
  - `ed1bd0c5`: Drop `server_tool_use` blocks carrying a foreign ID.
  - `6ab9ca9e`: Never anchor cache breakpoint on `defer_loading` tools (#3567).
  - `77e6a227`: Normalize adaptive auto effort (#3792).
  - `ac9120fd`: Support Claude Fable 5.1.
  - `fb9fab02`: Send Claude beta flags to nodes fronting Anthropic (#3797).
* **OpenCode / Codex / Qoder / Groq / Ollama:**
  - `11222eff`, `e74db4d0`: Muse Spark 1.2/1.3 and Responses tool fixes (#3820, #3819).
  - `81f4f930`: Send stable session header for OpenCode Go (#3800).
  - `acb5c34c`: Route Muse Spark models to Responses API and declare vision.
  - `44e4b80b`: Filter dead opencode free model.
  - `1a3d4468`: Format reset credit API errors for Codex (#3778).
  - `ed963931`: Add GPT-5.6 Sol, Terra, and Luna image aliases (#3806).
  - `1f190bd0`: Preserve inline images in OpenAI MITM.
  - `1fc2a81d`: Remove redundant top-level `systemPrompt` field from Kiro payload.
  - `2ab6a4c9`: Refresh Qoder model catalog, capability mapping, image pass-through.
  - `e0ffc7e2`: Add Ollama Cloud web fetch provider.
  - `cec672d9`, `e014cb53`: Align Codebuddy CN catalog/capabilities.
  - `6efb9790`: Streamline Tokenrouter models and provider icons.
* **Quota & Usage Tracking:**
  - `b9c92cb8`: Add usage tracking for Groq (`open-sse/services/usage/groq.js`).
  - `0da803ee`: Track OpenCode Go quota (`open-sse/services/usage/opencode-go.js`).
  - `e214fb1c`: Add Claude Fable quota tracker support.
  - `e7dd72a8`: Read Responses-shape `cached_tokens` in `extractUsageFromResponse`.
* **API Endpoints:**
  - `5caa72f5`: Support single model lookup (`src/app/api/v1/models/[...model]/route.js`).

### Group B: UI Features (Selective Logic Porting & Styling Adaptation)
1. **Theme Flash Fix (`925cb4aa`):**
   - File: `src/app/layout.js`
   - Action: Add pre-hydration script to check `localStorage.getItem('theme')` and apply class to document element before initial paint.
2. **Provider Status Filter (`d1d4e0f0`):**
   - Files: `src/app/(dashboard)/dashboard/providers/page.js`, `src/app/(dashboard)/dashboard/providers/utils.js`
   - Action: Add `statusFilter` state (`'all'`, `'connected'`, `'disconnected'`). Style filter controls using BeeRouter's cyber pill buttons (`border-bee-gold/20`, subtle hover glow, active amber border).
3. **Custom Model Capability Toggles (`38f031f4`):**
   - File: `src/app/(dashboard)/dashboard/providers/[id]/AddCustomModelModal.js`
   - Action: Introduce capability toggles (vision, tools, thinking) with upsert capability. Style toggles using BeeRouter's amber switch controls.
4. **CLI Tools API Key Presets (`c24a8542`, `b84681d5`):**
   - Files: `src/app/(dashboard)/dashboard/cli-tools/...`
   - Action: Port preset selector and helper utilities. Ensure the layout matches the top-bar and content width constraints.
5. **Connections Card Scroll Constraint (`831001c3`):**
   - File: `src/app/(dashboard)/dashboard/providers/components/ConnectionsCard.js`
   - Action: Add max height and custom cyber scrollbar styling to connection list.
6. **Antigravity Model Quota Grouping (`f615a83c`):**
   - File: `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js`
   - Action: Integrate grouping logic without removing BeeRouter's `pool_summary` rendering or amber progress gradient styles.

### Group C: Excluded Files / Upstream Noise
- `public/i18n/literals/id.json` (Indonesian locale).
- Any 9router legacy icon/logo replacements reverting BeeRouter assets.
- Unnecessary CSS overrides in global stylesheets.

---

## 4. Testing & Verification Plan

### Step 1: Vitest Unit Tests
Run the comprehensive test suite with the project's config:
```bash
npx vitest run -c tests/vitest.config.js
```
Ensure all existing unit tests pass, plus newly ported tests:
- `tests/unit/antigravity-quota-routing.test.js`
- `tests/unit/antigravity-ide-version.test.js`
- `tests/unit/gemini-38-integration.test.js`
- `tests/unit/claude-foreign-server-tool-use.test.js`
- `tests/unit/ssrf-guard-hardening.test.js`
- `tests/unit/cowork-mcp-ssrf-guard.test.js`
- `tests/unit/groq-usage.test.js`
- `tests/unit/opencode-go-*.test.js`

### Step 2: Next.js Production Build
```bash
npm run build
```
Verify:
- Zero compilation or JSX syntax errors.
- Webpack bundling completes cleanly.
- Standalone assets copied via `scripts/copy-standalone-assets.mjs`.

### Step 3: UI Visual & Functional Verification
1. Start dev server: `npm run dev` on port 20128.
2. Verify:
   - Navigation: TopBar, Command Palette, and routes load without layout shifts.
   - Theme: Reloading does not flash white/black.
   - Providers page: Status filter pills work smoothly and look native to BeeRouter.
   - Usage page: Antigravity pooled quota is displayed with amber bars alongside model quotas.
   - CLI Tools: Presets dropdown works cleanly.
