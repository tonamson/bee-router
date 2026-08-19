# Web Cookie Chat Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `deepseek-web` and `qwen-web` so `/v1/chat` can drain consumer-web free quota for **plain chat / research**. Same job as `grok-web` / `perplexity-web`. No tools. No Gemini. No Playwright.

**Architecture:** Two specialized `BaseExecutor`s, same return shape as `grok-web` (`{ response, url, headers, transformedBody }`). Registry `category: "webCookie"` + `authType: "cookie"` makes dashboard cards appear with no new UI. Cookie lives in existing connection `apiKey`. Protocol adapted from OmniRoute MIT (`omniroute@3.8.49` at `$(npm root -g)/omniroute`). Do **not** copy `webTools.ts`.

**Spec:** `docs/superpowers/specs/2026-08-17-web-cookie-chat-providers-design.md`

**Tech stack:** JavaScript ESM, Next.js dashboard (untouched except modal placeholder), Vitest. Tests live in `tests/` (independent package). Run from `tests/`: `npx vitest run unit/<file>.test.js`.

## Global constraints

- Chat/research only. Incoming `tools` are ignored (not 400, not emulated).
- Official `deepseek` API-key provider stays untouched. Alias `ds` stays `deepseek`. New alias is `ds-web`.
- Qwen web alias is its own id `qwen-web` (do not steal `qw` if it exists).
- No new npm deps. Port OmniRoute `deepseek-pow.ts` + `deepseek-pow-solver.cjs` + `sha3_wasm_bg.wasm` as JS/cjs/wasm.
- Fresh session per request. Flatten full history with a grok-style `parseOpenAIMessages` (text only).
- 401/403/WAF → re-paste message, combo-fallbackable. Never dump HTML to the client.
- Write the failing test first. Observe red. Then implement. Frequent commits (Conventional Commits).
- File headers on ported files: `adapted from OmniRoute MIT (https://github.com/diegosouzapw/OmniRoute)`.

## File map

**Create**

| File | Responsibility |
|---|---|
| `open-sse/providers/registry/deepseek-web.js` | Registry entry |
| `open-sse/providers/registry/qwen-web.js` | Registry entry |
| `open-sse/lib/webCookieAuth.js` | Cookie/token extract helpers (DeepSeek + Qwen). Shared by executors + validate route + tests |
| `open-sse/lib/deepseek-pow.js` | WASM + JS PoW solver |
| `open-sse/lib/deepseek-pow-solver.cjs` | JS SHA3 sponge (copy) |
| `open-sse/lib/sha3_wasm_bg.wasm` | WASM binary (copy) |
| `open-sse/executors/deepseek-web.js` | DeepSeek web executor |
| `open-sse/executors/qwen-web.js` | Qwen v2 web executor |
| `tests/unit/web-cookie-auth.test.js` | Pure extract/normalize helpers |
| `tests/unit/web-cookie-chat.test.js` | Executor flatten / flags / SSE / errors (mocked fetch) |

**Modify**

| File | Change |
|---|---|
| `open-sse/providers/registry/index.js` | `p122` / `p123` imports + array entries (next free ids after `p121`) |
| `open-sse/executors/index.js` | Import + map both executors |
| `src/app/api/providers/validate/route.js` | `deepseek-web` / `qwen-web` cases |
| `src/app/(dashboard)/dashboard/providers/[id]/AddApiKeyModal.js` | Placeholder per provider (~3 lines) |
| `tests/unit/web-cookie-validation.test.js` | DeepSeek + Qwen probe replicas |
| `tests/translator/golden-url-header.test.js` | Add both ids to `SPECIALIZED` |
| `tests/__baseline__/verify-alias.mjs` | Add tokens `ds-web`, `deepseek-web`, `qwen-web` |
| `tests/__baseline__/alias-baseline.json` | Refresh after registry lands (`node tests/__baseline__/verify-alias.mjs` then accept the new snapshot if the script supports write; otherwise edit `aliasToId` / `idToAlias` / `modelKeys` to include the three new keys) |

Do **not** edit `src/shared/constants/providers.js` (already `byCategory("webCookie")`). Do **not** seed combos. Do **not** add `*.real.test.js`.

OmniRoute reference (read, do not import):

- `$(npm root -g)/omniroute/open-sse/executors/deepseek-web.ts`
- `$(npm root -g)/omniroute/open-sse/executors/qwen-web.ts`
- `$(npm root -g)/omniroute/open-sse/lib/deepseek-pow.ts` (+ sibling cjs/wasm)
- `$(npm root -g)/omniroute/src/lib/providers/webCookieAuth.ts` (`buildQwenCookieHeader`, `extractQwenToken`)
- `$(npm root -g)/omniroute/open-sse/config/providers/registry/deepseek/web/index.ts`
- `$(npm root -g)/omniroute/open-sse/config/providers/registry/qwen/web/index.ts`

---

### Task 1: Registry entries + wire

**Files:**
- Create: `open-sse/providers/registry/deepseek-web.js`
- Create: `open-sse/providers/registry/qwen-web.js`
- Modify: `open-sse/providers/registry/index.js`
- Modify: `tests/translator/golden-url-header.test.js`
- Modify: `tests/__baseline__/verify-alias.mjs`
- Modify: `tests/__baseline__/alias-baseline.json`

**Why first:** dashboard + `PROVIDER_MODELS` come from registry. Executors can land after cards exist.

- [ ] **Step 1: Write `deepseek-web.js`**

Copy shape from `open-sse/providers/registry/grok-web.js`. Exact fields:

```js
export default {
  id: "deepseek-web",
  priority: 210,
  alias: "ds-web",
  aliases: ["deepseek-web"],
  uiAlias: "ds-web",
  display: {
    name: "DeepSeek Web (Free)",
    icon: "bolt",
    color: "#4D6BFE",
    textIcon: "DSW",
    website: "https://chat.deepseek.com",
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Paste userToken from chat.deepseek.com DevTools → Application → Local Storage → userToken (raw JWT or {\"value\":\"...\"})",
  transport: {
    baseUrl: "https://chat.deepseek.com/api/v0/chat/completion",
    format: "openai",
    authType: "cookie",
  },
  models: [
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "deepseek-v4-flash-think", name: "DeepSeek V4 Flash Think" },
    { id: "deepseek-v4-flash-search", name: "DeepSeek V4 Flash Search" },
    { id: "deepseek-v4-flash-think-search", name: "DeepSeek V4 Flash Think+Search" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-v4-pro-think", name: "DeepSeek V4 Pro Think" },
    { id: "deepseek-v4-pro-search", name: "DeepSeek V4 Pro Search" },
    { id: "deepseek-v4-pro-think-search", name: "DeepSeek V4 Pro Think+Search" },
  ],
};
```

- [ ] **Step 2: Write `qwen-web.js`**

```js
export default {
  id: "qwen-web",
  priority: 211,
  alias: "qwen-web",
  aliases: ["qwen-web"],
  uiAlias: "qwen-web",
  display: {
    name: "Qwen Web (Free)",
    icon: "auto_awesome",
    color: "#615CED",
    textIcon: "QW",
    website: "https://chat.qwen.ai",
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Paste the FULL Cookie header from chat.qwen.ai (cna, ssxmod_itna, token, …). Token-only paste is blocked by WAF.",
  transport: {
    baseUrl: "https://chat.qwen.ai/api/v2/chat/completions",
    format: "openai",
    authType: "cookie",
  },
  models: [
    { id: "qwen3.7-max", name: "Qwen3.7 Max" },
    { id: "qwen3.7-plus", name: "Qwen3.7 Plus" },
    { id: "qwen3.6-plus", name: "Qwen3.6 Plus" },
    { id: "qwen3.8-max-preview", name: "Qwen3.8 Max Preview" },
  ],
};
```

- [ ] **Step 3: Wire `registry/index.js`**

After `import p121 from "./alitp-intl.js";` add:

```js
import p122 from "./deepseek-web.js";
import p123 from "./qwen-web.js";
```

Append `p122, p123` to the exported array (before the closing `];`).

- [ ] **Step 4: Keep golden-url from treating them as DefaultExecutor**

In `tests/translator/golden-url-header.test.js`, add `"deepseek-web"` and `"qwen-web"` to `SPECIALIZED`.

- [ ] **Step 5: Alias baseline**

Add `"ds-web"`, `"deepseek-web"`, `"qwen-web"` to `ALIAS_TOKENS` in `tests/__baseline__/verify-alias.mjs`.

Regenerate then verify:

```bash
cd tests && node __baseline__/verify-alias.mjs --snapshot
cd tests && node __baseline__/verify-alias.mjs
```

Confirm snapshot now has:

- `aliasToId["ds-web"] === "deepseek-web"`
- `aliasToId["deepseek-web"] === "deepseek-web"`
- `aliasToId["qwen-web"] === "qwen-web"`
- `aliasToId["ds"]` still `"deepseek"`
- `idToAlias` / `modelKeys` include the new ids

Re-run until exit 0.

- [ ] **Step 6: Smoke registry**

```bash
cd tests && npx vitest run unit/web-cookie-validation.test.js
```

Existing grok/pplx tests still pass. Commit: `feat(providers): add deepseek-web and qwen-web registry`

---

### Task 2: Cookie helpers + validation (TDD)

**Files:**
- Create: `open-sse/lib/webCookieAuth.js`
- Create: `tests/unit/web-cookie-auth.test.js`
- Modify: `tests/unit/web-cookie-validation.test.js`
- Modify: `src/app/api/providers/validate/route.js`

**Helpers (export all):**

```js
export function stripCookieInputPrefix(raw) { /* Cookie: / bearer  */ }
export function extractDeepSeekUserToken(raw) {
  // JSON {"value":"..."} → value
  // userToken=... → value
  // raw JWT → as-is
}
export function buildQwenCookieHeader(raw) {
  // full blob with `=` → verbatim (minus Cookie:/bearer prefix)
  // bare token (no `=`) → ""
}
export function extractQwenToken(raw) {
  // bare → itself
  // blob → token= pair
  // blob without token= → ""
}
```

Port logic from OmniRoute `webCookieAuth.ts` + DeepSeek `extractUserToken`. Keep it ~40 lines.

- [ ] **Step 1: Write `tests/unit/web-cookie-auth.test.js` first**

Cases:

- `extractDeepSeekUserToken('{"value":"abc"}') === "abc"`
- `extractDeepSeekUserToken("userToken=abc") === "abc"`
- `extractDeepSeekUserToken("abc") === "abc"`
- `extractDeepSeekUserToken("")` falsy
- `buildQwenCookieHeader("cna=1; token=xyz") === "cna=1; token=xyz"`
- `buildQwenCookieHeader("Cookie: cna=1; token=xyz")` strips prefix
- `buildQwenCookieHeader("barejwt") === ""`
- `extractQwenToken("cna=1; token=xyz") === "xyz"`
- `extractQwenToken("barejwt") === "barejwt"`
- `extractQwenToken("cna=1; ssxmod_itna=2") === ""`

Run, expect fail (module missing).

- [ ] **Step 2: Implement `open-sse/lib/webCookieAuth.js`**

Run until green.

- [ ] **Step 3: Add validation replicas in `web-cookie-validation.test.js`**

Mirror grok/pplx style (inline replica of the route case, mock `fetch`):

DeepSeek:

- GET `https://chat.deepseek.com/api/v0/users/current`
- `Authorization: Bearer <token>`
- JSON wrap unwraps before send
- 401/403 → `{ valid: false, error }` containing `userToken`
- 200 + `{ data: { biz_data: { token: "x" } } }` → valid
- DeepSeek `code !== 0` → invalid

Qwen:

- POST `https://chat.qwen.ai/api/v2/chats/new`
- Cookie header = full blob, `Authorization: Bearer <token>`
- 401/403 → invalid
- `content-type: text/html` or status 504 → invalid, error mentions WAF, **not** HTML body
- 200 + `{ data: { id: "chat_1" } }` → valid
- bare token (no `=`) → invalid before fetch (`valid: false`, no fetch call)

- [ ] **Step 4: Implement route cases**

In `src/app/api/providers/validate/route.js` switch, next to `grok-web` / `perplexity-web`:

```js
case "deepseek-web": {
  const token = extractDeepSeekUserToken(apiKey);
  if (!token) { isValid = false; error = "…userToken…"; break; }
  const res = await fetch("https://chat.deepseek.com/api/v0/users/current", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "*/*", /* same FAKE_HEADERS as executor */ },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 401 || res.status === 403) { isValid = false; error = "Invalid userToken — re-paste from chat.deepseek.com Local Storage"; break; }
  // parse json; code!==0 or missing biz_data.token → invalid
  break;
}
case "qwen-web": {
  const cookieHeader = buildQwenCookieHeader(apiKey);
  const token = extractQwenToken(apiKey);
  if (!cookieHeader || !token) { isValid = false; error = "Paste full Cookie header from chat.qwen.ai (must include token=)"; break; }
  const res = await fetch("https://chat.qwen.ai/api/v2/chats/new", { method: "POST", headers: { /* see Task 5 */ }, body: JSON.stringify({ /* same as executor chats/new */ }), signal: AbortSignal.timeout(8000) });
  const ct = res.headers.get("content-type") || "";
  if (res.status === 401 || res.status === 403 || ct.includes("text/html") || res.status === 504) {
    isValid = false; error = "Qwen WAF/auth failed — re-paste full Cookie header from chat.qwen.ai"; break;
  }
  isValid = res.ok;
  break;
}
```

Import helpers from `open-sse/lib/webCookieAuth.js`. Keep FAKE_HEADERS in one shared const if the route file already has a pattern; otherwise duplicate the small header object (do not extract a god helper).

- [ ] **Step 5: Run**

```bash
cd tests && npx vitest run unit/web-cookie-auth.test.js unit/web-cookie-validation.test.js
```

Commit: `feat(providers): validate deepseek-web and qwen-web cookies`

---

### Task 3: DeepSeek PoW

**Files:**
- Create: `open-sse/lib/deepseek-pow.js`
- Create: `open-sse/lib/deepseek-pow-solver.cjs`
- Create: `open-sse/lib/sha3_wasm_bg.wasm`

No unit test against real difficulty (too slow / binary). Executor tests mock `solveDeepSeekPowAsync`.

- [ ] **Step 1: Copy binaries**

```bash
OMNI="$(npm root -g)/omniroute"
cp "$OMNI/open-sse/lib/deepseek-pow-solver.cjs" open-sse/lib/
cp "$OMNI/open-sse/lib/sha3_wasm_bg.wasm" open-sse/lib/
```

- [ ] **Step 2: Port `deepseek-pow.ts` → `deepseek-pow.js`**

Public API (keep names):

```js
export async function solveDeepSeekPowAsync(algorithm, challenge, salt, difficulty, expireAt)
export function solveDeepSeekPow(algorithm, challenge, salt, difficulty, expireAt) // sync JS path if OmniRoute exports it
```

- WASM first (`calculateHash`). Fail → JS `U` sponge from cjs.
- `algorithm !== "DeepSeekHashV1"` throw.
- Answer `< 0` = fail (executor maps to 502).
- MIT header.

Do not add tests that grind difficulty 144000.

Commit: `feat(open-sse): port DeepSeek web PoW solver`

---

### Task 4: DeepSeek executor (TDD)

**Files:**
- Create: `open-sse/executors/deepseek-web.js`
- Create: `tests/unit/web-cookie-chat.test.js` (DeepSeek section)
- Modify: `open-sse/executors/index.js`

**Export for tests:** `parseOpenAIMessages`, `resolveModelOptions`, `extractUserToken` (re-export from webCookieAuth or local alias), `DeepSeekWebExecutor`.

`parseOpenAIMessages` = copy `grok-web.js` lines 46–72 (developer→system, text parts only, last user unprefixed).

`resolveModelOptions(model, body)`:

- `modelType`: id contains `pro` or `expert` → `"expert"`, else `"default"`
- `thinkingEnabled`: id matches `/think|reason|r1/i` OR `body.thinking_enabled === true`
- `searchEnabled`: id matches `/search/i` OR `body.search_enabled === true`

Execute path (no tools, no persistSession, no auto-refresh wrapper):

1. Flatten messages. Empty → 400 `invalid_request`.
2. `extractDeepSeekUserToken(credentials.apiKey)`. Missing → 400.
3. `GET /api/v0/users/current` with Bearer userToken. Cache access token by userToken until `expiresAt` if present, else ~5 min. 401/403 → 401 re-paste.
4. Always `createSession(accessToken)` (OmniRoute helper — POST session create). **Do not** port `persistSession` / `sessionCache`. Fresh session every request.
5. Fetch PoW challenge (`getPowChallenge` — copy OmniRoute; `target_path: "/api/v0/chat/completion"`).
6. `solveDeepSeekPowAsync`. Fail → 502.
7. `POST /api/v0/chat/completion` with `Authorization: Bearer <access>`, `X-Ds-Pow-Response`, `X-Client-Timezone-Offset`, FAKE_HEADERS (Chrome 149, `X-Client-Bundle-Id: com.deepseek.chat`, **no** stale `X-App-Version`), plus OmniRoute `generateFakeCookie()`. Body exactly:
   `{ chat_session_id, parent_message_id: null, model_type, prompt, ref_file_ids: [], thinking_enabled, search_enabled, preempt: false }`
8. Stream: parse DeepSeek `data:` JSON `p`/`v` paths like OmniRoute `transformSSE` but **without** tool parse. `thinking` → `delta.reasoning_content`, `content` → `delta.content`. On `response/status === FINISHED`, drain briefly for `search_results` then emit `stop` + `data: [DONE]`.
9. Non-stream: collect then one JSON completion.
10. Fetch throw → 502. 429 → 429 message. 401/403 → re-paste.

Mocked `fetch` sequence in tests: (1) users/current (2) createSession (3) pow challenge (4) completion SSE.

Header comment: MIT OmniRoute, chat-only, tools ignored.

- [ ] **Step 1: Write failing tests in `tests/unit/web-cookie-chat.test.js`**

Import from `../../open-sse/executors/deepseek-web.js`.

`parseOpenAIMessages`:

- system+user+assistant+user → `system: …\n\nuser: …\n\nassistant: …\n\n<last user raw>`
- `developer` treated as system
- array text parts joined

`resolveModelOptions`:

- `deepseek-v4-flash` → default, think off, search off
- `deepseek-v4-flash-think` → think on
- `deepseek-v4-pro-think-search` → expert + think + search
- `deepseek-v4-flash` + `{ thinking_enabled: true }` → think on

`execute` with mocked `fetch` (sequence: users/current JSON, pow challenge JSON, completion SSE):

- Happy stream: thinking fragment then answer fragment → client SSE has `reasoning_content` then `content`, ends with `[DONE]`
- `tools: [{...}]` still completes as text (no `tool_calls` in output; completion still called)
- Missing apiKey → 400
- users/current 401 → 401, message contains `userToken`
- PoW solver: mock module or inject — if hard, stub `global.fetch` pow body with difficulty `1` and a challenge the JS solver can hit; otherwise export `solvePow` seam. Prefer mocking `fetch` only: if solver is too heavy, export `__setPowSolverForTests` — **don't**. Simpler: export `solvePow` as a let binding overwritten in test, or pass through a tiny internal that tests import and `vi.spyOn`. Use `vi.mock("../../open-sse/lib/deepseek-pow.js", () => ({ solveDeepSeekPowAsync: async () => 1 }))`.

- [ ] **Step 2: Run, see red**

```bash
cd tests && npx vitest run unit/web-cookie-chat.test.js
```

- [ ] **Step 3: Implement executor. Port from OmniRoute, delete every `webTools` / `persistSession` / `hasTools` branch.**

SSE transform: keep FINISHED-drain from OmniRoute `deepseek-web-done-terminator.ts` if small (~40 lines) — copy the two helpers into the same file, do not add a third file unless it is already >400 lines.

- [ ] **Step 4: Wire `executors/index.js`**

```js
import { DeepSeekWebExecutor } from "./deepseek-web.js";
// ...
"deepseek-web": new DeepSeekWebExecutor(),
```

- [ ] **Step 5: Green + commit**

```bash
cd tests && npx vitest run unit/web-cookie-chat.test.js unit/web-cookie-auth.test.js
```

Commit: `feat(open-sse): add DeepSeek web cookie executor`

---

### Task 5: Qwen executor (TDD)

**Files:**
- Create: `open-sse/executors/qwen-web.js`
- Modify: `tests/unit/web-cookie-chat.test.js` (Qwen section)
- Modify: `open-sse/executors/index.js`

Constants (pin from OmniRoute 3.8.49):

```js
const BASE_URL = "https://chat.qwen.ai";
const CHATS_NEW_URL = `${BASE_URL}/api/v2/chats/new`;
const CHAT_COMPLETIONS_URL = `${BASE_URL}/api/v2/chat/completions`;
const QWEN_SPA_VERSION = "0.2.66";
const BX_VERSION = "2.5.36";
const BX_UMIDTOKEN_FALLBACK = "T2gA0000000000000000000000000000000000000000";
```

`MODEL_ALIASES`: `qwen-plus`/`qwen3-plus` → `qwen3.7-plus`; `qwen-max`/`qwen3-max`/`qwen`/`qwen3` → `qwen3.7-max`; `qwen-turbo`/`qwen3-flash`/`qwen3-coder-flash` → `qwen3.6-plus`. Default `qwen3.7-max`. `qwen3.8-max-preview` forces thinking.

Execute:

1. `buildQwenCookieHeader` + `extractQwenToken`. Either missing → 400, tell user to paste full Cookie header.
2. `POST CHATS_NEW_URL` body `{ title: "New Chat", models: [modelId], chat_mode: "normal", chat_type: "t2t", timestamp: Date.now() }`. Headers: `source: web`, `version: 0.2.66`, `bx-v`, `bx-umidtoken` fallback, Cookie, Bearer. HTML/504/!ok → 401 WAF message, **do not** put HTML in `error.message`.
3. Missing `data.id` → 502.
4. `POST ${CHAT_COMPLETIONS_URL}?chat_id=` with `version: QWEN_SPA_VERSION`, cookie, bearer, `bx-umidtoken` fallback. Payload from OmniRoute `buildMessagePayload` minus tool bits. `thinking_enabled` if required model or `/think|reason|r1/i` on requested id.
5. Stream: `phase` `think` / `thinking_summary` → `reasoning_content`; `answer` or null → `content`; then `stop` + `[DONE]`.
6. Non-stream: collect answer text.
7. 429 / 401 / 403 / fetch fail same as DeepSeek.

Export: `mapQwenModel`, `isWafResponse`, `QwenWebExecutor`, `parseOpenAIMessages` (can import shared flatten from deepseek-web **or** duplicate 20 lines — prefer export flatten from `open-sse/lib/webCookieAuth.js` if both need it; if you already copied into deepseek-web, export from there and import in qwen-web. One flatten function. Move to `webCookieAuth.js` if that keeps files smaller).

- [ ] **Step 1: Add failing Qwen tests**

- `mapQwenModel("qwen-max") === "qwen3.7-max"`
- `isWafResponse(200, "text/html", "<html>") === true`
- `isWafResponse(504, "application/json", "{}") === true`
- execute: first fetch `chats/new` → `{ data: { id: "c1" } }`; second fetch SSE `{ choices:[{ delta:{ phase:"think", content:"r" } }] }` then `{ phase:"answer", content:"hi" }` → client has reasoning then content
- HTML on chats/new → status 401, `error.message` matches `/WAF|cookie/i`, not `/<html/i`
- bare token credentials → 400, fetch not called
- `tools` present → still text completion, two fetches happen

- [ ] **Step 2: Implement + wire `"qwen-web": new QwenWebExecutor()`**

- [ ] **Step 3: Run**

```bash
cd tests && npx vitest run unit/web-cookie-chat.test.js
```

Commit: `feat(open-sse): add Qwen web cookie executor`

---

### Task 6: Dashboard placeholder + docs touch

**Files:**
- Modify: `src/app/(dashboard)/dashboard/providers/[id]/AddApiKeyModal.js`

Existing:

```js
const credentialPlaceholder = isCookie
  ? (provider === "grok-web" ? "sso=xxxxx... or just the raw value" : "eyJhbGciOi...")
  : ...
```

Replace the cookie branch with a small map:

```js
const COOKIE_PLACEHOLDER = {
  "grok-web": "sso=xxxxx... or just the raw value",
  "perplexity-web": "eyJhbGciOi...",
  "deepseek-web": "userToken=... or {\"value\":\"...\"}",
  "qwen-web": "cna=...; ssxmod_itna=...; token=...",
};
const credentialPlaceholder = isCookie
  ? (COOKIE_PLACEHOLDER[provider] || "eyJhbGciOi...")
  : ...
```

`authHint` already comes from registry. No new modal.

Optional one paragraph in `docs/ARCHITECTURE.md` under providers: web cookie = ToS/ban risk, chat only, `ds-web` / `qwen-web`. Skip if ARCHITECTURE is already stale and you do not want to expand it — spec lives in `docs/superpowers/specs/`.

- [ ] **Step 1: Placeholder map**
- [ ] **Step 2: Commit** `fix(ui): cookie placeholders for deepseek-web and qwen-web`

No browser verification required unless you have the dashboard running with a real cookie. If dashboard is up: Providers page shows two new Web Cookie cards; open each; hint + placeholder match. Do not claim UI verified without that.

---

### Task 7: Final verification

- [ ] **Step 1: Unit suite for this feature**

```bash
cd tests && npx vitest run unit/web-cookie-auth.test.js unit/web-cookie-validation.test.js unit/web-cookie-chat.test.js
```

All new tests green.

- [ ] **Step 2: Alias + golden**

```bash
cd tests && node __baseline__/verify-alias.mjs
cd tests && npx vitest run translator/golden-url-header.test.js
```

- [ ] **Step 3: Confirm official DeepSeek untouched**

`open-sse/providers/registry/deepseek.js` unchanged. `aliasToId.ds === "deepseek"`.

- [ ] **Step 4: Manual (optional, needs user cookie)**

```
curl -s localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $GATEWAY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"ds-web/deepseek-v4-flash","messages":[{"role":"user","content":"ping"}]}'
```

Same for `qwen-web/qwen3.7-max`. Skip if no cookie.

---

## Done when

- Providers page lists DeepSeek Web + Qwen Web under Web Cookie.
- Paste cookie → Check uses the new probes.
- `/v1/chat` with `ds-web/…` or `qwen-web/…` streams text.
- `tools` do not crash and do not produce `tool_calls`.
- Official `ds/` still hits API DeepSeek.
- No Playwright, no `webTools`, no Gemini, no Z.ai.

## Out of scope (do not sneak in)

Gemini Web, Z.ai, Kimi web, persistSession, tool emulate, combo presets, searchViaChat, new npm deps.
