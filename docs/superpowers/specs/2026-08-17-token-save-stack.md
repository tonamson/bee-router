# Token save stack (OmniRoute-level input cut, bee-router grok-cli identity)

Date: 2026-08-17

## Goal

Match OmniRoute stacked savings on dirty agent payloads (RTK tool-cut × Caveman prose rewrite) without copying OmniRoute session/identity. Two Grok CLI processes on one account stay isolated — bee-router already does this; this work must not touch that path.

## Non-goals

- Do not port OmniRoute 55 JSON filters / command detector / session-dedup / CCR / llmlingua / ultra / aggressive aging.
- Do not edit `open-sse/executors/grok-cli.js`, `open-sse/utils/sessionManager.js`, machineId, account-fallback, grok-cli token refresh.

## Pipeline (handleChatCore, after translate, before executor)

1. RTK `compressMessages` — existing 12 filters, tool_result only.
2. Lite — whitespace, 2k tool cap, consecutive dup drop. On when RTK on.
3. Caveman rewrite — user/assistant prose only; skip tool / code / URL. On when Caveman toggle on.
4. Caveman + Ponytail system inject — existing.
5. Headroom / PXPIPE — existing.

Fail-open each step. `x-bee-router-token-saver: off` still bypasses all.

## Files

- `open-sse/rtk/lite.js` (new)
- `open-sse/rtk/cavemanRules.js` (new)
- `open-sse/rtk/cavemanCompress.js` (new)
- `open-sse/handlers/chatCore.js` (wire 2+3)
- `src/app/(dashboard)/dashboard/token-saver/TokenSaverClient.js` (copy)
- `tests/unit/lite-caveman.test.js` (new)
