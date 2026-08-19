# Web cookie chat providers (DeepSeek + Qwen)

Date: 2026-08-17
Status: approved

## Goal

Add two consumer-web cookie providers so `/v1/chat` can drain free DeepSeek / Qwen web quota for **plain chat and research**. Same job as existing `grok-web` / `perplexity-web`. Not a coding-agent backend.

## Non-goals

- No tool calling (native or prompt-emulate). Incoming `tools` are ignored.
- No Gemini Web (OmniRoute path is Playwright; bee-router has no browser dep).
- No Z.ai / Kimi / ChatGPT web in this slice.
- No Playwright, no new npm deps.
- No dashboard page, no combo seed, no `searchViaChat` fake search.
- Official `deepseek` API-key provider stays untouched.

## Why

bee-router already has `category: "webCookie"` + cookie paste + specialized executors. OmniRoute has ~23 web providers for the same reason: last-resort / $0 chat after paid quota. We port two HTTP ones. Protocol adapted from OmniRoute MIT (attribution in file headers). We do **not** copy `webTools.ts`.

## Architecture

```
client /v1/chat
  → chat.js → chatCore
  → getExecutor("deepseek-web" | "qwen-web")
  → flatten messages (copy grok-web parseOpenAIMessages, text only)
  → cookie + (DeepSeek PoW | Qwen v2)
  → SSE text → OpenAI chunks → client
```

Dashboard: no new UI. `WEB_COOKIE_PROVIDERS` is `byCategory("webCookie")`. New registry files appear as cards. Cookie stored in existing connection `apiKey`. `AddApiKeyModal` already handles `authType: "cookie"` + `authHint`.

## Files

New:

| File | Role |
|---|---|
| `open-sse/providers/registry/deepseek-web.js` | id, alias `ds-web`, display, `authType: "cookie"`, models |
| `open-sse/providers/registry/qwen-web.js` | id = alias `qwen-web` (avoid colliding with any future official qwen alias) |
| `open-sse/executors/deepseek-web.js` | HTTP + PoW, no tools |
| `open-sse/executors/qwen-web.js` | v2 chats/new + completions, no tools |
| `open-sse/lib/deepseek-pow.js` (+ wasm/cjs from OmniRoute MIT) | PoW solver |

Edit:

- `open-sse/executors/index.js` — register both
- `open-sse/providers/registry/index.js` — static imports
- `src/app/api/providers/validate/route.js` — cookie probe
- `src/app/(dashboard)/dashboard/providers/[id]/AddApiKeyModal.js` — placeholder special-case (~3 lines, same as grok)
- `tests/unit/web-cookie-validation.test.js` — prefix / 401 / WAF
- `tests/unit/web-cookie-chat.test.js` — flatten, flags, SSE, tools ignored

Do not hand-edit display maps; category on the registry entry is enough.

## Credentials

**DeepSeek** — Local Storage `userToken` (raw JWT or `{"value":"..."}`). Validate via `GET /api/v0/users/current` (Bearer `userToken` → short-lived access token). 401/403 = re-paste.

**Qwen** — **full Cookie header** from chat.qwen.ai (`cna`, `ssxmod_itna`, `ssxmod_itna2`, `token`, …). Bearer is the `token=` pair (also in localStorage). Token-only paste fails Alibaba WAF. Validate via `POST /api/v2/chats/new`. 401/403/WAF HTML = re-paste.

Cookie dead = dead. No OAuth refresh.

## Models

DeepSeek (suffix → executor flags):

- `deepseek-v4-flash`, `-think`, `-search`, `-think-search`
- `deepseek-v4-pro` + same three suffixes (`pro` → `model_type=expert`)

Qwen:

- `qwen3.7-max` (default)
- `qwen3.7-plus`, `qwen3.6-plus`, `qwen3.8-max-preview`

Legacy Qwen ids (`qwen-max`, `qwen-plus`, …) remap inside the executor only. No `passthroughModels`. No advertised tools.

## Execute

Both extend `BaseExecutor`, return `{ response, url, headers, transformedBody }` like `grok-web`. Fresh session per request. Full flattened history as one prompt.

**DeepSeek:** `userToken` → `GET /api/v0/users/current` (cached access token) → PoW (WASM, JS fallback) → `POST /api/v0/chat/completion` `{ prompt, thinking_enabled, search_enabled, model_type }` → SSE `thinking`/`content` (+ brief drain after `FINISHED` for citations) → `stop` + `[DONE]`.

**Qwen:** cookie jar + bearer → `POST /api/v2/chats/new` → `POST /api/v2/chat/completions?chat_id=` with `version: 0.2.66` and `bx-umidtoken` fallback → SSE `phase` `think`/`thinking_summary` → `reasoning_content`, `answer`/null → `content` → `stop` + `[DONE]`. HTML/504 = WAF, never dump HTML to client.

Errors (same shape as grok):

| Status | Meaning | Combo |
|---|---|---|
| 400 empty / missing cookie | `invalid_request` | no retry |
| 401/403 / Qwen WAF | re-paste cookie | fallback account/provider |
| 429 | rate limit | fallback |
| 5xx / fetch fail / PoW fail | `upstream_error` | fallback |

## Tests

Validation: prefix strip, DeepSeek JSON wrap, 401/403, Qwen WAF HTML.

Executor (mocked fetch, no live): flatten; DeepSeek suffix → flags; DeepSeek SSE thinking+content; Qwen two-step + phases; `tools` ignored; 401 message; Qwen HTML → 401 without leaking HTML.

No `*.real.test.js`.

## Risks

- Cookie = browser session. Leak = account loss. Reverse web UI usually violates ToS; captcha/PoW/WAF changes kill the executor.
- Qwen SPA `version` header is pinned; bump if upstream 200+`Bad_Request`.
- DeepSeek client-attestation header (`x-hif-leim`) omitted (OmniRoute also omits; revisit if completion starts requiring it).

## Later (not this slice)

Gemini Web (only if we accept Playwright), Z.ai, Kimi web, persistSession, tool emulate.
