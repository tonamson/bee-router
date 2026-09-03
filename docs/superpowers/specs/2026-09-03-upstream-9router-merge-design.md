# Upstream Merge: 9router v0.5.59 into BeeRouter

**Date:** 2026-09-03
**Status:** Approved design, not implemented
**Scope:** Merge `upstream/master` (decolua/9router) into this fork
**Sync point:** upstream `90b52e06` — "# v0.5.59 (2026-08-29)"

## Problem

This repo is a fork of `decolua/9router` that diverged at merge-base
`699edac3`. Since then:

- Our side: 129 commits, 581 files changed — a full dashboard UI overhaul
  (top bar replacing the sidebar, command palette, Geist fonts, CRM tokens,
  MetricCard), a 9router → bee-router rebrand, a unified versioning system,
  and extra token savers (SmartCrush, Lite, caveman input compression).
- Upstream: 41 commits, 114 files changed — engine fixes and new provider
  features (search providers, quota tracking, model catalog, translator fixes).

A dry-run merge produces 13 content conflicts and 3 modify/delete conflicts.
The remaining ~30 overlapping files auto-merge as text but are the real risk:
upstream reworked shared endpoint presets and quota data shapes inside the same
files we redesigned.

## Goals

1. Take every upstream engine fix and provider feature.
2. Lose no part of the dashboard redesign or the bee-router rebrand.
3. Leave `master` as the resolved integration point so the next upstream sync
   does not replay these conflicts.
4. No regression against the committed test baseline.

## Non-goals

- Restoring the deleted i18n literal files.
- Adopting upstream's version number.
- Rebasing or rewriting our 129 commits.
- Building dashboard UI for the new upstream features beyond wiring what
  already has a surface. New surfaces are follow-up work, tracked in §7.

## Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Strategy | Merge into `master` on an integration branch, then merge `master` into `refactor/template` | Conflicts resolved once, in the branch that carries 127 of our 129 commits |
| History | Merge commit — no rebase, no squash | 129-commit rebase would replay conflicts 129 times |
| UI conflicts | Ours wins the shell, upstream logic ported into it | Keeps the redesign; keeps upstream behavior |
| Engine conflicts | Upstream wins, then our additions re-applied | Upstream owns the routing engine |
| Deleted i18n literals | Resolve = delete | Deliberate cleanup in `8af20875` |
| Version | Keep our line, bump to `0.2.0` | Fork versions independently; `0.2.0` marks a large merge |

## 1. Branch topology

`refactor/template` is `master` + 2 commits (`0115361c`, `ef38be91`), so
`master` already carries the UI overhaul. The conflict set on `master` (14) is
effectively the same as on `refactor/template` (13); the benefit of the two-step
is only that the resolution lands on `master`.

```
pre-upstream-sync-0.1.3   (tag on refactor/template, cut before starting)
master ──┬─────────────────────────────► master (merge commit)
         └── merge/upstream-v0.5.59 ◄── upstream/master @ 90b52e06
                    (all resolution happens here; discardable)
master ─────────────────────────────────► refactor/template (2-commit merge)
```

## 2. Conflict resolution

### 2.1 Engine — upstream wins, our additions re-applied

**`open-sse/handlers/chatCore.js`** — both sides changed the
`handleChatCore` signature and the token-saver pipeline. Manual union.

Take from upstream:
- `headroomTimeoutMs` parameter, passed through to `compressWithHeadroom`
  as `timeoutMs` (upstream `993c6eb4`).
- `import { defaultClaudeToolType } from "../translator/concerns/toolCall.js"`
  and the `finalFormat === FORMATS.CLAUDE && Array.isArray(translatedBody.tools)`
  block that defaults the tool `type` (upstream `e08ac6da`).
- The `targetFormat` precedence flip:
  `useTransport?.format || modelTargetFormat || getTargetFormat(...)`
  (upstream `28d00577`; a source-format-matched endpoint is lossless and must
  outrank a model-level `targetFormat`).

Keep from ours:
- `liteEnabled` and `onTokenSaveEvent` parameters.
- Imports and pipeline blocks for `crushMessages`, `applyLiteCompression`,
  `cavemanCompress`, in that order, before the headroom call.
- The four `xf.push(...)` lines (`RTK`, `CRUSH`, `LITE`, `CAVEMAN-IN:<level>`).

Ordering constraint: SmartCrush must run before Lite (minify must see the
compact columnar form), and both must run before headroom.

**`open-sse/utils/usageTracking.js`** — our version is a strict superset.
Ours adds `pickCachedTokens()` (inclusive cache-read extraction for
OpenAI/Responses/DeepSeek/xAI) plus reasoning-token fallback from
`completion_tokens_details` / `output_tokens_details`. Upstream's fix
(`4a371d1d`: `usage.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens`)
is already covered by `pickCachedTokens`. Resolve by taking ours, then proving
it with upstream's `tests/unit/cached-token-usage.test.js` unchanged.

**`open-sse/providers/registry/index.js`** — auto-generated static import list.
Never hand-merge. Accept the two new upstream registry files
(`ollama-search.js`, `xquik.js`), then regenerate:

```bash
node scripts/migrate-registry.mjs
node scripts/injectDisplayToRegistry.mjs
```

The regenerated file must differ from ours only by the two added imports.

### 2.2 Rebrand class — our naming wins, upstream content ported

**`skills/bee-router-web-search/SKILL.md`** — upstream modified
`skills/9router-web-search/SKILL.md`; rename detection paired them. Keep our
path, filename, frontmatter `name`, and bee-router branding. Port upstream's
content additions: Xquik as an X-search provider (`f0a6d358`) and the widened
provider list in the description.

**`src/shared/constants/skills.js`** — deleted on our side as part of the
rebrand. No file in `src/`, `cli/`, or `open-sse/` imports it (verified by
grep). Upstream's only change was a description string. Resolve = delete.

**`src/app/api/cli-tools/codex-settings/route.js`** — upstream rewrote the
Codex config writer (`9c45b27c`). Take upstream's logic:
- `http_headers: { Authorization: "Bearer <key>" }` on the provider section —
  custom providers ignore `auth.json`.
- `agents.default_subagent_model` scalar replaces the `agents.subagent` table.
- Drop the `auth.json` `OPENAI_API_KEY` / `auth_mode` write.

Keep our TOML key: `model_providers.bee-router` (and `model_provider =
"bee-router"`), not `9router`. Our file already uses the rebranded key in the
detect, write, and delete paths — all three must stay consistent.

### 2.3 UI — our shell wins, upstream logic ported

**`src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js`** —
upstream rewrote it (45+/36-, `a68ada1c`: endpoint presets shared across every
tool card); our change is a single line. Take upstream's file wholesale, then
replace any hardcoded color or spacing with our design tokens. The 13
`*ToolCard.js` files auto-merge but consume this component — re-read each one
after the merge (see §3).

**`src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js`** —
ours is a 57-line redesign; upstream adds 17 lines of new data (Zed plan quota
`e5a13c3a`, `CREDIT_LIMIT` and multi-interval GLM quotas `fcfcced4`,
GPT-5.3-Codex-Spark windows `40eed186`). Port upstream's columns and data
handling into our redesigned table markup. `index.js` and `utils.js` in the same
directory auto-merge but feed this table — both must be read, not trusted.

**`public/i18n/literals/pt-BR.json`** — resolve = delete. Confirm the i18n
loader has no remaining reference to `pt-BR` or to the removed literal files;
`public/i18n/` should hold only `vi.json` and `literals/`.

### 2.4 Packaging and tests

**`package.json`, `cli/package.json`** — conflict is the `version` field plus
our added scripts. Keep our scripts, set both to `0.2.0`. The unified version
module and its consistency test must agree (see `src/lib/version` consumers and
the version consistency tests added in `14d740a2`).

**`CHANGELOG.md`** — do not merge upstream entries line by line. Keep our
entries at the top and add one section:

```
## Upstream sync — 9router v0.5.59 (90b52e06)
```

listing the features taken (see §7).

**`tests/unit/headroom.test.js`** — union. Keep our cases, add upstream's
configurable-timeout case.

**`tests/translator/__snapshots__/golden-url-header.test.js.snap`** — upstream
deleted it deliberately (`2203cd8f`, "drop the golden url/header snapshot").
Accept the delete; discard our modification. Confirm the corresponding test file
was also removed or updated upstream so nothing references the snapshot.

## 3. Silent-risk set

These auto-merge as text and must each be read and reasoned about before the
merge is considered done. A clean text merge here does not mean correct
behavior: upstream changed shared endpoint presets and quota shapes inside the
same files we redesigned.

Engine: `open-sse/utils/sessionManager.js`, `open-sse/executors/antigravity.js`,
`open-sse/executors/commandcode.js`, `open-sse/rtk/headroom.js`,
`open-sse/translator/concerns/toolCall.js`, `open-sse/config/appConstants.js`.

App: `src/lib/db/repos/settingsRepo.js`, `src/sse/handlers/chat.js`,
`src/sse/handlers/search.js`, `src/sse/services/auth.js`,
`src/shared/constants/cliTools.js`,
`src/app/api/providers/[id]/test/testUtils.js`,
`src/app/api/providers/validate/route.js`.

UI: `src/app/(dashboard)/dashboard/providers/page.js`,
`src/app/(dashboard)/dashboard/token-saver/TokenSaverClient.js`,
`src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.js`,
`.../ProviderLimits/utils.js`, `src/app/globals.css`, `src/app/layout.js`, and
the 13 `src/app/(dashboard)/dashboard/cli-tools/components/*ToolCard.js` files
(Claude, Cline, Codex, Copilot, Cowork, DeepSeekTui, Droid, GrokBuild, Hermes,
Jcode, Kilo, OpenClaw, OpenCode).

CLI: `cli/hooks/sqliteRuntime.js` (upstream `90a00058`: install
`better-sqlite3` without build tools on Node 22+).

Specific things to check: `chat.js` must pass the new `headroomTimeoutMs`
through to `handleChatCore`; `settingsRepo.js` must expose the setting;
`search.js` must carry upstream's failure-lock scoping (`ec669280`: a search
failure must not take chat offline).

## 4. Sequence

1. Tag `pre-upstream-sync-0.1.3` on `refactor/template`.
2. Record the pre-merge baseline: run `tests/__baseline__/verify-no-regression.mjs`
   and save its output.
3. Cut `merge/upstream-v0.5.59` from `master`; `git merge upstream/master`.
4. Resolve §2.1 (engine), then §2.2 (rebrand), then §2.3 (UI), then §2.4
   (packaging/tests). Commit the resolution in that order so each group is
   independently reviewable.
5. Regenerate the provider registry; regenerate the provider/alias/OAuth
   baselines deliberately.
6. Read every file in §3; fix what the text merge broke.
7. Run the §5 gates.
8. Merge `merge/upstream-v0.5.59` into `master`.
9. Merge `master` into `refactor/template`.
10. Update `CHANGELOG.md` and bump to `0.2.0`.

## 5. Verification gates

Every gate must pass before step 8.

| Gate | Command | Pass criterion |
|---|---|---|
| Lint | `npx eslint .` | No new errors vs pre-merge |
| Build | `npm run build` | Succeeds |
| Test baseline | `node tests/__baseline__/verify-no-regression.mjs` | Not worse than the step-2 baseline (~938 pass / ~64 fail on a plain checkout) |
| Registry/alias/OAuth snapshots | `node tests/__baseline__/verify-providers.mjs`, `verify-alias.mjs`, `verify-oauth-urls.mjs` | Snapshot diff contains only `ollama-search` and `xquik` additions; regenerate `providers-baseline.json` via `snapshot-providers.mjs` once reviewed |
| Version consistency | `npx vitest run unit/version-consistency.test.js` (from `tests/`) | Root and `cli/` both report `0.2.0` |

Manual smoke, all against a locally started server:
one streaming chat through `/v1/chat/completions`; `/dashboard/providers`;
`/dashboard/usage` (quota tables render, including a GLM or Zed account);
`/dashboard/cli-tools` (endpoint presets populate; Codex config writes the
`bee-router` section with the `Authorization` header);
`/dashboard/token-saver` (RTK, SmartCrush, Lite, caveman toggles still work).

## 6. Rollback

Any gate fails and cannot be fixed in place: delete
`merge/upstream-v0.5.59`; `master` and `refactor/template` are untouched until
steps 8-9. After step 9, `git reset --hard pre-upstream-sync-0.1.3` restores
`refactor/template`.

## 7. Upstream features taken

Engine and translator fixes: Claude tool `type` default; source-format-matched
transport precedence; MiniMax image preservation on matched OpenAI transport;
`zai` `thinkingFormat` sending a `reasoning.effort` object; Claude tool-name
decloaking in same-format streaming passthrough; trailing-NDJSON-line parsing
on Ollama streams; CommandCode in-stream errors handled for combo and account
fallback; RTK system-prompt injection made format-safe and idempotent; RTK
Responses-translation diagnostic before a silent null; configurable headroom
compression timeout; nested `cached_tokens` preserved in `canonicalizeUsage`;
usage recorded when a client closes on the terminal event; no disconnect log on
completed Responses streams.

Search: `ollama-search`; `zai-search` folded into the `glm` provider; Antigravity
as a web-search provider; Xquik as an X-search provider; failure locks scoped so
a search failure cannot take chat offline.

Quota and usage: Zed plan quota on the dashboard; `CREDIT_LIMIT` and
multi-interval GLM quotas; GPT-5.3-Codex-Spark quota windows; Antigravity
quota-aware routing with reset-aware fallback.

Models and catalog: GLM-5.3-Flash, DeepSeek V4 Vision, Grok 4.5/4.6, Gemini 3.7
Flash tiers in Antigravity MITM `defaultModels`; background capability refresh
from models.dev; catalog sync no longer erases its own output and no longer uses
a worker thread; Antigravity image size mapped to an aspect-ratio model suffix.

Other: Cline OAuth refresh using the extension JSON contract; Claude Code
session id read from its request header; provider connection tests timed out and
guarded against undefined names; API key mask clamped for short keys; Material
Symbols icon font awaited before reveal; OpenCode Muse Spark routed through the
Responses API; shared endpoint presets across CLI tool cards; `better-sqlite3`
installed without build tools on Node 22+.

**Not taken:** the pt-BR i18n expansion (`e79ae6e7`), and upstream's
`src/shared/constants/skills.js` description change.

## 8. Follow-up (out of scope)

The new search providers, the Zed and Codex-Spark quota windows, and the
Antigravity quota-aware routing controls may have no surface in the redesigned
dashboard. Auditing and building those surfaces is separate work with its own
spec.
