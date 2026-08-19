# API key analyst UI

Date: 2026-08-17  
Status: self-approved (user: auto-review, fill gaps, implement)

## Goal

Dedicated Analytics surface for **gateway API keys**: compare keys, then drill into one key with period KPIs, chart, and model/provider/endpoint breakdown.

## Non-goals

- No new usage schema / no extra columns.
- No client-side filter of global `/api/usage/stats` (raw key leak + wrong 7d chart).
- No token-save per-key cards in v1 (`OverviewCards` may show $0 Token Save).
- Do not change `/dashboard/usage` tabs except `byApiKey` payload safety.

## Routes

| Path | Role |
|------|------|
| `/dashboard/analytics` | Hub card "API Keys" |
| `/dashboard/analytics/keys` | All keys + usage totals |
| `/dashboard/analytics/keys/[id]` | One key: cards, chart, breakdowns, recent |
| Endpoint key row | `bar_chart` → detail |

Sidebar Analytics: Token Save, **API Keys**, Pricing.

## API

`GET /api/keys/[id]/usage?period=today|24h|7d|30d|60d` (default `7d`)

```json
{
  "key": { "id", "name", "apiKeyMasked", "isActive", "createdAt" },
  "period": "7d",
  "totalRequests": 0,
  "totalPromptTokens": 0,
  "totalCompletionTokens": 0,
  "totalCachedTokens": 0,
  "totalCost": 0,
  "byModel": {},
  "byProvider": {},
  "byEndpoint": {},
  "recentRequests": [],
  "chart": [{ "label": "Aug 11", "tokens": 0, "cost": 0 }]
}
```

- 404 if key id missing.
- 400 if period invalid.
- Never return raw `key` secret.
- `DELETE` on same path unchanged (clear that key only).

## Data

- `getUsageStatsForApiKey(apiKey, period)` — totals from **that key only** (not day-wide `day.promptTokens`).
- `getChartData(period, { apiKey })` — today/24h: `usageHistory WHERE apiKey=?`; 7d/30d/60d: sum matching `day.byApiKey`.
- `getUsageStats` `byApiKey` entries add `apiKeyId`. Object keys use **masked** key (`${apiKeyMasked}|model|provider`), never raw secret. Fix lastUsed overlay to the same key.

## UI

- List: join `/api/keys` + `/api/usage/stats?period=` via `apiKeyId` (fallback mask). Unused keys stay on the list at zero. Row → detail.
- Detail: same period chips as Usage. `OverviewCards` + `UsageChart` (`data` prop, no second fetch) + simple model/provider/endpoint tables + recent requests. Clear-usage confirm → `DELETE` → refresh.
- Empty: "No usage for this period".
- Reuse existing dashboard components. No new chart library.

## Errors

- Missing key → 404 page copy + back to list.
- Fetch fail → inline error, keep last good data if any.

## Tests

- Unit: two keys seeded; `getUsageStatsForApiKey` / `getChartData(..., { apiKey })` isolate; unused key zeros; `Object.keys(byApiKey)` contain no raw secret; `apiKeyId` present when key registered.
- Browser: hub → list → detail, period switch, empty key, Endpoint icon, desktop + mobile. chrome-devtools / test-them `ui_probe` (no standalone Playwright MCP).

## Self-review

- No TBD.
- Chart 7d+ is per-key, not global day totals.
- List can link because `apiKeyId` is on stats.
- Clear stays on existing DELETE.
