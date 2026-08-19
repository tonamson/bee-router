# Per-API-key usage limits

Date: 2026-08-17  
Status: approved (user: ok)

## Goal

Per gateway API key: concurrency, daily/weekly request caps, daily/weekly token caps. Empty/`0` = unlimited. Easy edit on Endpoint key row.

## Non-goals

- No queue when at cap (429, do not wait).
- No cost ($) caps in v1.
- Cached tokens are already inside prompt; do not double-count.
- No change to provider-side quota UI.

## Fields (`apiKeys` columns, auto-sync)

`concurrency`, `dailyRequests`, `weeklyRequests`, `dailyTokens`, `weeklyTokens` — INTEGER DEFAULT 0. `0` = unlimited.

## Windows

Local calendar. Day = midnight. Week = Monday 00:00 local → next Monday. Tokens = `promptTokens + completionTokens` from `usageHistory`.

## Enforce

After a **valid** gateway key is present (even if `requireApiKey` is off). No key / invalid key / local mode → skip.

Order: day/week usage, then concurrency increment. `finally` decrement.

`429` + `Retry-After` (seconds to next midnight or next Monday; concurrency → `1`).

```json
{ "error": { "message": "...", "type": "insufficient_quota", "code": "key_daily_request_limit" } }
```

Codes: `key_concurrency`, `key_daily_request_limit`, `key_weekly_request_limit`, `key_daily_token_limit`, `key_weekly_token_limit`.

Shared `acquireApiKeySlot` / `releaseApiKeySlot` from `src/lib/apiKeyLimits.js`. Wired in chat + embeddings + search + fetch + tts + stt + image + video.

## API

`PUT /api/keys/:id` accepts the five fields (omit = leave). `GET /api/keys` returns them plus `usage`: `{ inflight, dayRequests, dayTokens, weekRequests, weekTokens }`.

## UI

Endpoint key row: Limits button + short used/cap chips. Panel: five number inputs, placeholder Unlimited, used/cap under each. Save PUT. Pause key still the way to block all traffic.

## Tests

Acquire rejects over cap; `0` never rejects; day/week isolate two keys; release frees concurrency.
