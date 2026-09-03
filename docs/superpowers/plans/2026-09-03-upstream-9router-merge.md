# Upstream 9router v0.5.59 Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `upstream/master` (decolua/9router @ `90b52e06`, v0.5.59) into this fork, keeping every upstream engine fix and provider feature while losing no part of the dashboard redesign or the bee-router rebrand.

**Architecture:** All conflict resolution happens on a throwaway integration branch cut from `master` (which already carries 127 of our 129 commits). One merge commit lands there; audit fixes land as follow-up commits on the same branch. Only after every gate passes does the branch merge into `master`, then `master` into `refactor/template` (a 2-commit merge). The integration branch is discardable at any point before that.

**Tech Stack:** git (merge, no rebase), Node.js ESM, Next.js 15 dashboard, vitest (in `tests/`, an independent package), custom baseline verifiers under `tests/__baseline__/`.

**Spec:** `docs/superpowers/specs/2026-09-03-upstream-9router-merge-design.md`

## Global Constraints

- Sync point is upstream commit `90b52e06` ("# v0.5.59 (2026-08-29)"). Do not merge a different upstream ref.
- Merge commit only. No rebase, no squash, no cherry-pick.
- Branding: this fork is **BeeRouter / bee-router**. Never let an upstream `9router` / `9Router` string into a user-visible path, TOML key, npm name, or dashboard label. Upstream code comments mentioning "9Router" are cosmetic and may stay.
- `public/i18n/literals/pt-BR.json` and every other deleted i18n literal file stays deleted.
- `src/shared/constants/skills.js` stays deleted.
- `open-sse/providers/registry/index.js` is auto-generated. Never hand-edit or hand-merge it.
- Final version is `0.2.0` in root and `cli/`, produced by `scripts/bump-version.mjs`, not by hand.
- Test baseline on a plain checkout is ~938 pass / ~64 fail. Judge regressions with `tests/__baseline__/verify-no-regression.mjs`, never a raw pass/fail count.
- All `npx vitest` commands run from the `tests/` directory. Root `npm install` must have run first, then `cd tests && npm install`.
- No commit may be made while `git status` reports unmerged paths. Tasks 3-6 stage but do not commit; Task 7 makes the single merge commit.

---

### Task 1: Baseline and integration branch

**Files:**
- Create: `/private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/baseline-pre-merge.txt`
- Modify: none (git refs only)

**Interfaces:**
- Consumes: nothing.
- Produces: tag `pre-upstream-sync-0.1.3`; branch `merge/upstream-v0.5.59`; the saved pre-merge baseline output that Task 10 compares against.

- [ ] **Step 1: Confirm the working tree is clean and on the right branch**

```bash
cd /Volumes/Code/Opensource/mrouter
git status --porcelain          # must print nothing
git rev-parse --abbrev-ref HEAD # must print refactor/template
```

If the tree is not clean, stop and report. Do not stash — an uncommitted change here is a signal something else is in flight.

- [ ] **Step 2: Tag the pre-merge state**

```bash
git tag pre-upstream-sync-0.1.3 refactor/template
git tag -l pre-upstream-sync-0.1.3   # must print the tag name
```

- [ ] **Step 3: Fetch upstream and pin the sync point**

```bash
git fetch upstream
git rev-parse upstream/master   # must print 90b52e06... — if it does not, STOP and report
```

Upstream moving means the spec's feature list and conflict set are stale. Report the new head rather than merging it.

- [ ] **Step 4: Install dependencies for the test suite**

```bash
npm install
cd tests && npm install && cd ..
```

- [ ] **Step 5: Record the pre-merge test baseline**

```bash
cd tests
npx vitest run 2>&1 | tail -40 > /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/baseline-pre-merge.txt
node __baseline__/verify-no-regression.mjs 2>&1 | tee -a /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/baseline-pre-merge.txt
cd ..
cat /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/baseline-pre-merge.txt
```

Expected: a pass/fail summary near ~938 pass / ~64 fail. Whatever it prints is the number Task 10 must not worsen. Record it even if it differs from the spec's estimate.

- [ ] **Step 6: Cut the integration branch from master**

```bash
git checkout master
git rev-list --left-right --count master...refactor/template  # expect "0	2"
git rev-parse master | tee /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/master-pre-merge-sha.txt
git checkout -b merge/upstream-v0.5.59
```

The recorded sha is what the Rollback section resets `master` to.

If the count is not `0 2`, the branch topology has changed since the spec was written. Stop and report.

- [ ] **Step 7: Commit**

Nothing to commit — this task only creates refs. Verify:

```bash
git status --porcelain          # must print nothing
git rev-parse --abbrev-ref HEAD # must print merge/upstream-v0.5.59
```

---

### Task 2: Start the merge and record the conflict set

**Files:**
- Create: `/private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/conflicts.txt`
- Modify: the working tree enters a conflicted merge state

**Interfaces:**
- Consumes: branch `merge/upstream-v0.5.59` from Task 1.
- Produces: an in-progress merge whose unmerged path list is recorded in `conflicts.txt`. Tasks 3-6 each resolve a subset of that list.

- [ ] **Step 1: Start the merge without committing**

```bash
git merge --no-commit --no-ff upstream/master
```

Expected: exits non-zero, printing `Automatic merge failed; fix conflicts and then commit the result.` A zero exit means the conflict set has changed — stop and report.

- [ ] **Step 2: Record the unmerged paths**

```bash
git diff --name-only --diff-filter=U > /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/conflicts.txt
cat /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/conflicts.txt
wc -l < /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/conflicts.txt
```

Expected 14 paths:

```
CHANGELOG.md
cli/package.json
open-sse/handlers/chatCore.js
open-sse/providers/registry/index.js
open-sse/utils/usageTracking.js
package.json
public/i18n/literals/pt-BR.json
skills/bee-router-web-search/SKILL.md
src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js
src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js
src/app/api/cli-tools/codex-settings/route.js
src/shared/constants/skills.js
tests/translator/__snapshots__/golden-url-header.test.js.snap
tests/unit/headroom.test.js
```

- [ ] **Step 3: Reconcile against the spec**

Compare the list to the 14 paths above. A path in the file but not in the list, or vice versa, means the spec is stale for that file. Stop and report the difference rather than improvising a resolution.

- [ ] **Step 4: Commit**

Do not commit. `git status` reports unmerged paths; a commit here would land a half-resolved merge. Verify the merge is still in progress:

```bash
test -f .git/MERGE_HEAD && echo "merge in progress"
```

---

### Task 3: Resolve the engine conflicts

**Files:**
- Modify: `open-sse/handlers/chatCore.js`
- Modify: `open-sse/utils/usageTracking.js`
- Modify: `open-sse/providers/registry/index.js` (by regeneration, not by editing)
- Test: `tests/unit/cached-token-usage.test.js` (run, not written)

**Interfaces:**
- Consumes: the conflicted merge from Task 2.
- Produces: `handleChatCore({ ..., liteEnabled, headroomEnabled, headroomUrl, headroomCompressUserMessages, headroomTimeoutMs, cavemanEnabled, cavemanLevel, ..., onTokenSaveEvent, ... })` — the union signature every later caller audit (Task 8) checks against. Also `pickCachedTokens(usage)` from `usageTracking.js`, kept from our side.

- [ ] **Step 1: Resolve `chatCore.js` — take upstream's three changes**

Open `open-sse/handlers/chatCore.js`. Resolve every conflict marker by union, keeping both sides' additions.

Add upstream's import alongside our token-saver imports:

```js
import { defaultClaudeToolType } from "../translator/concerns/toolCall.js";
```

Add `headroomTimeoutMs` to the destructured parameter list, immediately after `headroomCompressUserMessages`, while keeping our `liteEnabled` and `onTokenSaveEvent`:

```js
export async function handleChatCore({ body, modelInfo, credentials, log, onCredentialsRefreshed, onRequestSuccess, onDisconnect, clientRawRequest, connectionId, userAgent, apiKey, ccFilterNaming, rtkEnabled, liteEnabled, headroomEnabled, headroomUrl, headroomCompressUserMessages, headroomTimeoutMs, cavemanEnabled, cavemanLevel, ponytailEnabled, ponytailLevel, pxpipeEnabled, pxpipeMinChars, pxpipeTimeoutMs, pxpipeTransform, onPxpipeEvent, onTokenSaveEvent, sourceFormatOverride, providerThinking }) {
```

Flip the `targetFormat` precedence to upstream's order, comment included:

```js
  // A source-format-matched endpoint keeps the request lossless. Prefer it
  // over a model-level targetFormat, which is only the fallback for clients
  // whose wire format has no supported transport (for example MiniMax-M3:
  // OpenAI clients should stay on /chat/completions; other clients can fall
  // back to its declared Claude target).
  const targetFormat = useTransport?.format || modelTargetFormat || getTargetFormat(provider, credentials);
```

Add upstream's Claude tool-type default, immediately after the existing
`delete translatedBody.tools;` block:

```js
  // Claude tool schema requires `type` to be explicitly set; strict gateways (e.g., MiniMax)
  // reject legacy payloads that omit it with HTTP 400. Default to "custom" when missing.
  if (finalFormat === FORMATS.CLAUDE && Array.isArray(translatedBody.tools)) {
    translatedBody.tools = defaultClaudeToolType(translatedBody.tools);
  }
```

Pass the timeout through to headroom:

```js
  const headroomStats = await compressWithHeadroom(translatedBody, { enabled: tokenSaverEnabled && headroomEnabled, url: headroomUrl, model: upstreamModel, format: finalFormat, compressUserMessages: headroomCompressUserMessages, timeoutMs: headroomTimeoutMs, diagnostics: headroomDiagnostics });
```

- [ ] **Step 2: Resolve `chatCore.js` — keep our token-saver pipeline**

Keep our three imports:

```js
import { crushMessages, formatCrushLog } from "../rtk/smartCrush.js";
import { applyLiteCompression, formatLiteLog } from "../rtk/lite.js";
import { cavemanCompress, formatCavemanLog } from "../rtk/cavemanCompress.js";
```

Keep our pipeline blocks, in this exact order, positioned after the RTK log line and **before** the `compressWithHeadroom` call. SmartCrush must precede Lite so the minifier sees the compact columnar form; both must precede headroom.

```js
  // SmartCrush: lossless columnar JSON arrays. Before lite so minify sees compact form.
  const crushStats = tokenSaverEnabled && liteEnabled !== false ? crushMessages(translatedBody) : null;
  const crushLine = formatCrushLog(crushStats);
  if (crushLine) console.log(crushLine);

  // Lite: lossless whitespace / JSON minify / ANSI / consecutive-dup. Fail-open.
  const liteStats = tokenSaverEnabled && liteEnabled !== false ? applyLiteCompression(translatedBody) : null;
  const liteLine = formatLiteLog(liteStats);
  if (liteLine) console.log(liteLine);

  // Caveman rewrite: user/assistant prose only. Same toggle as output prompt.
  const cavemanStats = cavemanCompress(translatedBody, tokenSaverEnabled && cavemanEnabled, cavemanLevel);
  const cavemanLine = formatCavemanLog(cavemanStats);
  if (cavemanLine) console.log(cavemanLine);
```

Keep our four flag pushes on the `xf` accumulator:

```js
  if (rtkStats?.hits?.length) xf.push("RTK");
  if (crushStats) xf.push("CRUSH");
  if (liteStats) xf.push("LITE");
  if (cavemanStats) xf.push(`CAVEMAN-IN:${cavemanLevel}`);
```

- [ ] **Step 3: Verify no conflict markers survive in `chatCore.js`**

```bash
grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' open-sse/handlers/chatCore.js
```

Expected: no output. Then confirm each expected symbol is present exactly once:

```bash
grep -c "defaultClaudeToolType" open-sse/handlers/chatCore.js   # expect 2 (import + call)
grep -c "headroomTimeoutMs" open-sse/handlers/chatCore.js       # expect 1
grep -c "timeoutMs: headroomTimeoutMs" open-sse/handlers/chatCore.js  # expect 1
grep -c "crushMessages\|applyLiteCompression\|cavemanCompress" open-sse/handlers/chatCore.js  # expect 6
```

- [ ] **Step 4: Resolve `usageTracking.js` — take our version**

Our side is a strict superset: it adds `pickCachedTokens()` (inclusive
cache-read extraction for OpenAI / Responses / DeepSeek / xAI) and a
reasoning-token fallback, and its `inclusiveCached === undefined` guard already
covers upstream's narrower `usage.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens`
fix (upstream `4a371d1d`).

```bash
git checkout --ours open-sse/utils/usageTracking.js
grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' open-sse/utils/usageTracking.js   # expect no output
grep -c "pickCachedTokens" open-sse/utils/usageTracking.js               # expect 3 or more
```

- [ ] **Step 5: Prove our `usageTracking.js` satisfies upstream's test**

Take upstream's version of the cached-token test unchanged, then run it. If it passes, our superset genuinely covers upstream's fix; if it fails, our `pickCachedTokens` has a gap and must be extended rather than the test relaxed.

```bash
git checkout upstream/master -- tests/unit/cached-token-usage.test.js
cd tests && npx vitest run unit/cached-token-usage.test.js; cd ..
```

Expected: PASS. On failure, extend `pickCachedTokens` to read
`usage.prompt_tokens_details?.cached_tokens` and re-run. Never edit the test to
make it pass.

- [ ] **Step 6: Resolve the registry by regenerating it**

Accept the two new upstream provider files, then regenerate the auto-generated
import list. Do not open the conflicted `index.js`.

```bash
git checkout upstream/master -- open-sse/providers/registry/ollama-search.js open-sse/providers/registry/xquik.js
git checkout --theirs open-sse/providers/registry/index.js
node scripts/migrate-registry.mjs
node scripts/injectDisplayToRegistry.mjs
grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' open-sse/providers/registry/index.js   # expect no output
grep -c "ollama-search\|xquik" open-sse/providers/registry/index.js           # expect 2
```

- [ ] **Step 7: Verify the regenerated registry differs only by the two additions**

```bash
git diff HEAD -- open-sse/providers/registry/index.js
```

Expected: exactly two added import lines (`ollama-search.js`, `xquik.js`) and
nothing else. Any other change means the generator disagrees with the committed
file — stop and report before staging.

- [ ] **Step 8: Stage the engine group**

```bash
git add open-sse/handlers/chatCore.js open-sse/utils/usageTracking.js \
        open-sse/providers/registry/index.js open-sse/providers/registry/ollama-search.js \
        open-sse/providers/registry/xquik.js tests/unit/cached-token-usage.test.js
git diff --name-only --diff-filter=U   # these 6 paths must no longer appear
```

- [ ] **Step 9: Commit**

Do not commit — the merge is still in progress with other unmerged paths. Staging is the checkpoint for this task.

---

### Task 4: Resolve the rebrand conflicts

**Files:**
- Delete: `src/shared/constants/skills.js`
- Modify: `skills/bee-router-web-search/SKILL.md`
- Modify: `src/app/api/cli-tools/codex-settings/route.js`

**Interfaces:**
- Consumes: the in-progress merge from Task 2.
- Produces: a Codex config writer that emits `model_providers.bee-router` with an `Authorization` header and `agents.default_subagent_model`. Task 10's cli-tools smoke test checks exactly these keys.

- [ ] **Step 1: Confirm `src/shared/constants/skills.js` still has no importers, then delete it**

The delete was deliberate (rebrand). Re-verify before honoring it, because upstream may have added a consumer.

```bash
grep -rn "constants/skills" src cli open-sse skills 2>/dev/null   # expect no output
git rm src/shared/constants/skills.js
```

If the grep prints anything, stop and report: an upstream file now imports the
constant, and the delete needs a replacement rather than a straight removal.

- [ ] **Step 2: Resolve `skills/bee-router-web-search/SKILL.md` — our path, upstream's content**

Keep our filename, our frontmatter `name: bee-router-web-search`, our
`BEE_ROUTER_URL` / `BEE_ROUTER_KEY` env names, and our
`raw.githubusercontent.com/tonamson/bee-router/...` setup link. Take upstream's
content addition: Xquik listed as an X-search provider (upstream `f0a6d358`) and
the widened provider list in the description.

Resolve the markers by hand, then verify no upstream branding leaked in:

```bash
grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' skills/bee-router-web-search/SKILL.md   # expect no output
grep -in "9router" skills/bee-router-web-search/SKILL.md                        # expect no output
grep -c "Xquik" skills/bee-router-web-search/SKILL.md                           # expect 1 or more
grep -c "BEE_ROUTER_URL" skills/bee-router-web-search/SKILL.md                  # expect 1 or more
```

- [ ] **Step 3: Resolve `codex-settings/route.js` — upstream logic, our TOML key**

Take upstream's three behavior changes (upstream `9c45b27c`):

```js
    // Custom providers ignore auth.json - the key must travel as a static header
    setNestedSection(parsed, "model_providers.bee-router", {
      name: "BeeRouter",
      base_url: normalizedBaseUrl,
      wire_api: "responses",
      http_headers: { Authorization: `Bearer ${apiKey}` },
    });

    // Subagent model is a scalar under [agents]; agents.<role> now means a custom role
    deleteNestedSection(parsed, "agents.subagent");
    setNestedSection(parsed, "agents.default_subagent_model", subagentModel || model);
```

Remove the `auth.json` write block entirely — the `getCodexAuthPath()` read,
the `authData.OPENAI_API_KEY` assignment, and the `authData.auth_mode = "apikey"`
assignment. If `getCodexAuthPath` becomes unused after this, drop its import too
(lint will catch it in Task 10).

Note the two deliberate deviations from upstream: the TOML key stays
`bee-router` (not `9router`) and the `name` stays `"BeeRouter"` (not
`"9Router"`). Our file already uses the rebranded key in its detect, write, and
delete paths — all three must agree.

- [ ] **Step 4: Verify the Codex writer is internally consistent**

```bash
grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' src/app/api/cli-tools/codex-settings/route.js   # expect no output
grep -in "9router" src/app/api/cli-tools/codex-settings/route.js      # expect no output
grep -c "model_providers.bee-router" src/app/api/cli-tools/codex-settings/route.js  # expect 3 (detect, write, delete)
grep -c "http_headers" src/app/api/cli-tools/codex-settings/route.js  # expect 1
grep -c "default_subagent_model" src/app/api/cli-tools/codex-settings/route.js  # expect 1
grep -c "OPENAI_API_KEY" src/app/api/cli-tools/codex-settings/route.js  # expect 0
```

- [ ] **Step 5: Stage the rebrand group**

```bash
git add skills/bee-router-web-search/SKILL.md src/app/api/cli-tools/codex-settings/route.js
git diff --name-only --diff-filter=U   # the 3 rebrand paths must no longer appear
```

- [ ] **Step 6: Commit**

Do not commit — the merge is still in progress.

---

### Task 5: Resolve the UI conflicts

**Files:**
- Modify: `src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js`
- Modify: `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js`
- Delete: `public/i18n/literals/pt-BR.json`

**Interfaces:**
- Consumes: the in-progress merge from Task 2.
- Produces: `BaseUrlSelect` with upstream's shared-preset props (the 13 `*ToolCard.js` files audited in Task 8 consume it), and a `QuotaTable` that renders upstream's Zed / `CREDIT_LIMIT` / multi-interval GLM / Codex-Spark quota shapes inside our redesigned markup.

- [ ] **Step 1: Take upstream's `BaseUrlSelect.js` wholesale**

Upstream rewrote this component (45+/36-, `a68ada1c`: endpoint presets shared
across every tool card); our side changed one line. Upstream's version is the
one the auto-merged tool cards now expect.

```bash
git checkout --theirs "src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js"
git add "src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js"
```

- [ ] **Step 2: Restyle `BaseUrlSelect.js` onto our design tokens**

Read the file and replace any hardcoded color, radius, or spacing literal with
the token the rest of our dashboard uses (see `src/app/globals.css` for the
token names introduced in `27f462c7`). Leave behavior untouched.

```bash
grep -n "#[0-9a-fA-F]\{3,6\}\|rgb(\|rgba(" "src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js"
```

Expected after the edit: no output, or only values that already match a token.

- [ ] **Step 3: Port upstream's quota data into our redesigned `QuotaTable.js`**

Ours is a 57-line redesign of the markup; upstream adds 17 lines of new data
handling: Zed plan quota (`e5a13c3a`), `CREDIT_LIMIT` and multi-interval GLM
quotas (`fcfcced4`), and GPT-5.3-Codex-Spark quota windows (`40eed186`).

Keep our table markup, our `QuotaProgressBar`, and our class names. Bring across
upstream's rows, columns, and value formatting for the new quota kinds. Read
upstream's side first so nothing is invented:

```bash
git show upstream/master:"src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js" > /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/QuotaTable.upstream.js
git show :2:"src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js" > /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/QuotaTable.ours.js
diff -u /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/QuotaTable.ours.js /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/QuotaTable.upstream.js
```

Then edit the conflicted file into the union and verify:

```bash
grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js"   # expect no output
grep -c "CREDIT_LIMIT" "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js"  # expect 1 or more
```

- [ ] **Step 4: Read the two auto-merged siblings that feed the table**

`index.js` and `utils.js` in the same directory merged cleanly as text but both
sides changed them (upstream +5 / +27, ours +55 / +13). They supply the quota
objects `QuotaTable` renders, so a clean text merge here can still produce a
table that renders nothing.

```bash
git diff HEAD -- "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.js" \
                 "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js"
```

Confirm by reading: every quota kind `QuotaTable` now branches on is actually
produced by `utils.js`, and `index.js` passes it through. Fix any mismatch here
rather than in the table.

- [ ] **Step 5: Honor the i18n delete**

```bash
git rm public/i18n/literals/pt-BR.json
ls public/i18n public/i18n/literals
grep -rn "pt-BR\|pt_BR" src public/i18n 2>/dev/null   # expect no output
```

Expected: `public/i18n` holds `literals/` and `vi.json`. If the grep prints a
loader reference to `pt-BR`, remove that reference too — a dangling locale entry
would 404 at runtime.

- [ ] **Step 6: Stage the UI group**

```bash
git add "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js" \
        "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.js" \
        "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js"
git diff --name-only --diff-filter=U   # the 3 UI paths must no longer appear
```

- [ ] **Step 7: Commit**

Do not commit — the merge is still in progress.

---

### Task 6: Resolve the packaging and test conflicts

**Files:**
- Modify: `package.json`
- Modify: `cli/package.json`
- Modify: `CHANGELOG.md`
- Modify: `tests/unit/headroom.test.js`
- Delete: `tests/translator/__snapshots__/golden-url-header.test.js.snap`

**Interfaces:**
- Consumes: the in-progress merge from Task 2.
- Produces: a conflict-free tree with `version` still `0.1.3` in both manifests (Task 11 bumps to `0.2.0` via `scripts/bump-version.mjs`), and a `CHANGELOG.md` carrying the `## Upstream sync — 9router v0.5.59 (90b52e06)` heading that Task 11 fills in.

- [ ] **Step 1: Resolve both manifests to our side**

The conflict is the `version` field plus the scripts our fork added (`bump`,
`version`, `cli:pack`). Ours wins both; the version number itself is set in
Task 11 by the bump script, not by hand here.

```bash
git checkout --ours package.json cli/package.json
grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' package.json cli/package.json   # expect no output
node -e "console.log(require('./package.json').version, require('./cli/package.json').version)"
```

Expected: `0.1.3` for root. Note whatever `cli/` prints — the bump script keeps
satellites in sync, so a difference here is fine as long as Task 11 reconciles it.

- [ ] **Step 2: Confirm our scripts survived**

```bash
node -e "const s=require('./package.json').scripts; ['bump','version','cli:pack','dev','build','start'].forEach(k=>console.log(k, JSON.stringify(s[k])))"
```

Expected: `bump` is `node scripts/bump-version.mjs`, `version` is
`node scripts/bump-version.mjs --sync-only`, and none is `undefined`.

- [ ] **Step 3: Resolve `CHANGELOG.md` — ours on top, one upstream section**

Do not interleave upstream's entries. Keep our entries in place and add a single
section below our newest block:

```markdown
## Upstream sync — 9router v0.5.59 (90b52e06)
```

Leave the section body empty for now; Task 11 fills it from the spec's §7.

```bash
grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' CHANGELOG.md   # expect no output
grep -n "Upstream sync — 9router v0.5.59" CHANGELOG.md # expect 1 match
```

- [ ] **Step 4: Resolve `tests/unit/headroom.test.js` by union**

Keep our cases; add upstream's configurable-timeout case. Upstream's
`compressWithHeadroom` now normalizes the timeout, so the new behavior under
test is: a positive finite `timeoutMs` is used, and anything else
(`0`, `-1`, `NaN`, `undefined`, `"3000"`) falls back to the 3000 ms default.

Read upstream's version before editing so the case is copied, not invented:

```bash
git show upstream/master:tests/unit/headroom.test.js > /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/headroom.upstream.test.js
git show :2:tests/unit/headroom.test.js > /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/headroom.ours.test.js
diff -u /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/headroom.ours.test.js /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/headroom.upstream.test.js
```

Edit the conflicted file into the union, then verify:

```bash
grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' tests/unit/headroom.test.js   # expect no output
```

- [ ] **Step 5: Run the headroom test**

```bash
cd tests && npx vitest run unit/headroom.test.js; cd ..
```

Expected: PASS, including the timeout case. A failure here is real — `headroom.js`
auto-merged, so this is the first check that upstream's `normalizeTimeout` landed
intact.

- [ ] **Step 6: Accept upstream's snapshot deletion**

Upstream dropped the golden url/header snapshot deliberately (`2203cd8f`).
Accept the delete and discard our modification.

```bash
git rm tests/translator/__snapshots__/golden-url-header.test.js.snap
ls tests/translator/golden-url-header.test.js 2>/dev/null
grep -rn "golden-url-header" tests --include=*.js 2>/dev/null
```

If the test file still exists on our side and still references the snapshot, take
upstream's version of the test file too (`git checkout upstream/master -- <path>`)
or remove it — a test asserting against a deleted snapshot will fail forever.

- [ ] **Step 7: Verify the merge is fully resolved**

```bash
git diff --name-only --diff-filter=U   # expect NO output
git status --short | head -40
```

No unmerged paths may remain. If any do, return to the task that owns them
(Task 3 engine, Task 4 rebrand, Task 5 UI) rather than resolving them here.

- [ ] **Step 8: Commit**

Do not commit yet — Task 7 makes the single merge commit.

---

### Task 7: Land the merge commit

**Files:**
- Modify: none (git commit only)

**Interfaces:**
- Consumes: a fully resolved merge tree from Tasks 3-6.
- Produces: one merge commit on `merge/upstream-v0.5.59`. Tasks 8-9 add follow-up commits on top of it.

- [ ] **Step 1: Re-confirm nothing is unmerged and no markers survive**

```bash
git diff --name-only --diff-filter=U   # expect no output
git grep -n '^<<<<<<<\|^>>>>>>>' -- . ':!docs' | head
```

Expected: no output from both. The `:!docs` exclusion keeps spec/plan prose from
matching.

- [ ] **Step 2: Make the merge commit**

```bash
git commit --no-verify -F - <<'EOF'
merge: upstream 9router v0.5.59 (90b52e06)

Merge decolua/9router master into the fork. Engine and provider changes
taken from upstream; the dashboard redesign and the bee-router rebrand
kept on our side.

Resolutions:
- chatCore.js: union — upstream headroomTimeoutMs, defaultClaudeToolType,
  targetFormat precedence; ours liteEnabled, onTokenSaveEvent, and the
  SmartCrush/Lite/caveman pipeline.
- usageTracking.js: ours (superset of upstream's cached_tokens fix),
  proven against upstream's cached-token-usage test.
- providers/registry/index.js: regenerated after adding ollama-search
  and xquik.
- skills/bee-router-web-search/SKILL.md: our branding, upstream's Xquik
  content.
- src/shared/constants/skills.js: stays deleted (no importers).
- codex-settings/route.js: upstream's http_headers and
  agents.default_subagent_model, on our model_providers.bee-router key.
- BaseUrlSelect.js: upstream's shared endpoint presets, restyled onto our
  tokens.
- ProviderLimits/QuotaTable.js: upstream's Zed / CREDIT_LIMIT / GLM /
  Codex-Spark quota data inside our redesigned table.
- public/i18n/literals/pt-BR.json: stays deleted.
- package.json, cli/package.json: ours; version bumped separately.
- golden-url-header snapshot: accepted upstream's deletion.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
git log --oneline -1
git log --merges -1 --format='%H %P'
```

Expected: the last line prints the merge commit with two parents.

`--no-verify` is used because a repo hook may reject the large merge diff; the
gates in Task 10 cover what a pre-commit hook would.

---

### Task 8: Audit the auto-merged engine and app files

**Files:**
- Modify (only where the audit finds a defect): `open-sse/utils/sessionManager.js`, `open-sse/executors/antigravity.js`, `open-sse/executors/commandcode.js`, `open-sse/rtk/headroom.js`, `open-sse/translator/concerns/toolCall.js`, `open-sse/config/appConstants.js`, `src/lib/db/repos/settingsRepo.js`, `src/sse/handlers/chat.js`, `src/sse/handlers/search.js`, `src/sse/services/auth.js`, `src/shared/constants/cliTools.js`, `src/app/api/providers/[id]/test/testUtils.js`, `src/app/api/providers/validate/route.js`, `cli/hooks/sqliteRuntime.js`

**Interfaces:**
- Consumes: the merge commit from Task 7, and the `handleChatCore` union signature from Task 3.
- Produces: a wired `headroomTimeoutMs` path from `settingsRepo` defaults through `chat.js` into `handleChatCore`.

- [ ] **Step 1: Confirm the headroom timeout is wired end to end**

This is the highest-value check: three files each carry one link of the chain,
and all three auto-merged.

```bash
grep -n "headroomTimeoutMs" src/lib/db/repos/settingsRepo.js src/sse/handlers/chat.js open-sse/handlers/chatCore.js
grep -n "normalizeTimeout\|DEFAULT_TIMEOUT_MS" open-sse/rtk/headroom.js
```

Expected: `settingsRepo.js` has `headroomTimeoutMs: 3000` in `DEFAULT_SETTINGS`;
`chat.js` has `headroomTimeoutMs: chatSettings.headroomTimeoutMs`; `chatCore.js`
has it in the signature and as `timeoutMs:`; `headroom.js` defines
`normalizeTimeout` and calls it. Add any missing link.

- [ ] **Step 2: Confirm `defaultClaudeToolType` exists where `chatCore.js` imports it from**

```bash
grep -n "export function defaultClaudeToolType" open-sse/translator/concerns/toolCall.js
```

Expected: one match. `toolCall.js` auto-merged, so the export could have been
lost; `chatCore.js` importing a missing symbol fails at module load, not at
request time.

- [ ] **Step 3: Confirm the search failure lock is scoped**

Upstream `ec669280` scopes failure locks so a search provider failure cannot take
chat offline. `search.js` auto-merged and both sides touched it.

```bash
git diff HEAD~1 -- src/sse/handlers/search.js | head -60
```

Read the result: a failure lock keyed per search provider is correct; a global or
chat-shared lock is the bug upstream fixed. Fix it here if the merge dropped the
scoping.

- [ ] **Step 4: Read the remaining engine and app diffs**

```bash
git diff HEAD~1 -- open-sse/utils/sessionManager.js open-sse/executors/antigravity.js \
  open-sse/executors/commandcode.js open-sse/rtk/headroom.js \
  open-sse/translator/concerns/toolCall.js open-sse/config/appConstants.js \
  src/lib/db/repos/settingsRepo.js src/sse/handlers/chat.js src/sse/services/auth.js \
  src/shared/constants/cliTools.js "src/app/api/providers/[id]/test/testUtils.js" \
  src/app/api/providers/validate/route.js cli/hooks/sqliteRuntime.js
```

For each file ask: did both sides' intent survive? Specific things upstream
added that must still be present — Claude Code session id read from the request
header (`2fd99eae`, `sessionManager.js`), provider connection tests timed out and
guarded against undefined names (`df85e16d`, `testUtils.js` / `validate/route.js`),
Antigravity branding sanitized in system prompts and quota-aware routing
(`dff64849`, `1a3db1ef`, `antigravity.js`), CommandCode in-stream errors handled
for combo and account fallback (`67d9182e`, `commandcode.js`), RTK system-prompt
injection format-safe and idempotent (`cadef6c4`), `better-sqlite3` installed
without build tools on Node 22+ (`90a00058`, `sqliteRuntime.js`).

- [ ] **Step 5: Commit any fixes**

If Steps 1-4 changed nothing, skip this step and record that the audit was clean.

```bash
git add -A
git commit -F - <<'EOF'
fix(merge): repair engine wiring the upstream text merge dropped

Follow-up to the v0.5.59 merge: reconnect what auto-merged cleanly as
text but not as behavior.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

Replace the body with the specific defects found before committing.

---

### Task 9: Audit the auto-merged UI files

**Files:**
- Modify (only where the audit finds a defect): `src/app/(dashboard)/dashboard/providers/page.js`, `src/app/(dashboard)/dashboard/token-saver/TokenSaverClient.js`, `src/app/globals.css`, `src/app/layout.js`, and the 13 `src/app/(dashboard)/dashboard/cli-tools/components/*ToolCard.js` files

**Interfaces:**
- Consumes: the merge commit from Task 7 and upstream's `BaseUrlSelect` from Task 5.
- Produces: tool cards whose props match `BaseUrlSelect`'s current signature.

- [ ] **Step 1: Read `BaseUrlSelect`'s props, then check every consumer against them**

Upstream `a68ada1c` shares endpoint presets across every tool card, so the
component's props changed while all 13 cards auto-merged.

```bash
sed -n '1,60p' "src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js"
grep -rn "BaseUrlSelect" "src/app/(dashboard)/dashboard/cli-tools/components/" | grep -v "BaseUrlSelect.js:"
```

Every call site must pass the props the component actually destructures. A card
passing a prop the component no longer reads renders an empty preset list with no
error — this is the single most likely silent break in the whole merge.

- [ ] **Step 2: Read the four remaining UI diffs**

```bash
git diff HEAD~1 -- "src/app/(dashboard)/dashboard/providers/page.js" \
  "src/app/(dashboard)/dashboard/token-saver/TokenSaverClient.js" \
  src/app/globals.css src/app/layout.js
```

Check: `providers/page.js` still has our on-page provider search (`83acc333`) and
lists the new search providers; `TokenSaverClient.js` still exposes our RTK,
SmartCrush, Lite, and caveman toggles and gained a headroom-timeout field if
upstream added one; `globals.css` kept our CRM tokens (`27f462c7`) and dropped
the terracotta palette (`dd4abbd4`); `layout.js` kept our Geist fonts and
upstream's icon-font-await fix (`14401c43`).

- [ ] **Step 3: Read the 13 tool card diffs**

```bash
git diff HEAD~1 --stat -- "src/app/(dashboard)/dashboard/cli-tools/components/"
git diff HEAD~1 -- "src/app/(dashboard)/dashboard/cli-tools/components/ClaudeToolCard.js" \
  "src/app/(dashboard)/dashboard/cli-tools/components/CodexToolCard.js" \
  "src/app/(dashboard)/dashboard/cli-tools/components/ClineToolCard.js"
```

Read all 13, starting with these three (Codex is the one whose API route changed
in Task 4; Cline is the one whose OAuth refresh changed upstream in `88676b30`).

- [ ] **Step 4: Commit any fixes**

Skip if the audit was clean.

```bash
git add -A
git commit -F - <<'EOF'
fix(merge): realign tool cards with the shared BaseUrlSelect props

Follow-up to the v0.5.59 merge.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

Replace the body with the specific defects found.

---

### Task 10: Run every verification gate

**Files:**
- Modify: `tests/__baseline__/providers-baseline.json` (regenerated, only if the diff is exactly the two new providers)

**Interfaces:**
- Consumes: the audited merge from Tasks 8-9 and the pre-merge baseline from Task 1.
- Produces: a green gate set. Task 11 must not run until every gate here passes.

- [ ] **Step 1: Lint**

```bash
npx eslint .
```

Expected: no new errors relative to the pre-merge run. An unused
`getCodexAuthPath` import left over from Task 4 surfaces here.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: succeeds. A missing export (for example `defaultClaudeToolType`) or a
deleted module still being imported (for example `constants/skills.js`) fails
here.

- [ ] **Step 3: Test baseline**

```bash
cd tests
npx vitest run 2>&1 | tail -40
node __baseline__/verify-no-regression.mjs
cd ..
cat /private/tmp/claude-501/-Volumes-Code-Opensource-mrouter/fe2705ef-35c6-4e2e-a38a-ec231710b7a0/scratchpad/baseline-pre-merge.txt
```

Read the pre-merge summary alongside the run just made and compare the pass and
fail counts by eye.

Expected: `verify-no-regression.mjs` reports no new failures beyond the
catalogued ones in `tests/__baseline__/known-fails.txt`. Compare the pass/fail
counts against `baseline-pre-merge.txt` from Task 1. Known-red and not a
regression: the 26 entries in `known-fails.txt`, `unit/embeddings.cloud.test.js`
(imports the absent `cloud/` worker dir), `unit/xai-oauth-service.test.js`
(times out without a reachable xAI endpoint), and `real/*.real.test.js` (need
live credentials).

- [ ] **Step 4: Provider, alias, and OAuth baselines**

```bash
cd tests
node __baseline__/verify-providers.mjs
node __baseline__/verify-alias.mjs
node __baseline__/verify-oauth-urls.mjs
cd ..
```

`verify-providers.mjs` is expected to fail: the registry gained
`ollama-search` and `xquik`. Read its diff and confirm it reports **only** those
two additions. `verify-alias.mjs` and `verify-oauth-urls.mjs` should pass; a
failure there means the registry regeneration in Task 3 changed more than
intended.

- [ ] **Step 5: Regenerate the provider baseline, deliberately**

Only after Step 4's diff is confirmed to be exactly the two new providers:

```bash
cd tests && node __baseline__/snapshot-providers.mjs && cd ..
git diff -- tests/__baseline__/providers-baseline.json | head -40
node tests/__baseline__/verify-providers.mjs 2>/dev/null || (cd tests && node __baseline__/verify-providers.mjs)
```

Expected: the JSON diff adds only the two providers, and the verifier now passes.

- [ ] **Step 6: Manual smoke test**

Start the server and exercise the five surfaces the merge touched.

```bash
npm run build && PORT=20128 HOSTNAME=0.0.0.0 npm run start
```

Then, in another shell:

```bash
# Pick a model that actually has credentials configured in this install
MODEL=$(curl -s http://localhost:20128/v1/models | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).data[0].id))')
echo "$MODEL"
curl -s -X POST http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"stream\":true,\"messages\":[{\"role\":\"user\",\"content\":\"say hi\"}]}" | head -20
```

Expected: SSE chunks, and the server log shows the `⚙` token-saver line with our
flags. Then check in a browser:

| Surface | Expected |
|---|---|
| `/dashboard/providers` | Page renders, on-page search works, new search providers listed |
| `/dashboard/usage` | Quota tables render for a configured GLM or Zed account, no empty table |
| `/dashboard/cli-tools` | Endpoint presets populate in every tool card |
| `/dashboard/cli-tools` → Codex apply | `~/.codex/config.toml` gains `[model_providers.bee-router]` with `http_headers.Authorization` and `agents.default_subagent_model`; `auth.json` is untouched |
| `/dashboard/token-saver` | RTK, SmartCrush, Lite, caveman toggles all present and persist |

- [ ] **Step 7: Commit the regenerated baseline**

```bash
git add tests/__baseline__/providers-baseline.json
git commit -F - <<'EOF'
test(baseline): add ollama-search and xquik to the provider snapshot

Registry gained both providers in the v0.5.59 upstream merge.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 11: Land on master and refactor/template, changelog, bump to 0.2.0

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `package.json`, `cli/package.json` (by `scripts/bump-version.mjs`, not by hand)

**Interfaces:**
- Consumes: green gates from Task 10.
- Produces: `master` and `refactor/template` both carrying the merge; tag `v0.2.0`.

- [ ] **Step 1: Fill in the changelog section**

Edit the `## Upstream sync — 9router v0.5.59 (90b52e06)` section added in
Task 6, listing the features taken. Copy the groupings from the spec's §7:
engine and translator fixes; search; quota and usage; models and catalog; other.
State explicitly what was not taken — the pt-BR i18n expansion (`e79ae6e7`) and
upstream's `src/shared/constants/skills.js` description change.

```bash
grep -n "Upstream sync — 9router v0.5.59" CHANGELOG.md
sed -n "/Upstream sync/,/^## /p" CHANGELOG.md | head -40
```

- [ ] **Step 2: Commit the changelog**

```bash
git add CHANGELOG.md
git commit -F - <<'EOF'
docs(changelog): record the 9router v0.5.59 upstream sync

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

- [ ] **Step 3: Merge the integration branch into master**

```bash
git checkout master
git merge --no-ff merge/upstream-v0.5.59 -m "merge: upstream 9router v0.5.59 integration"
git log --oneline -3
```

- [ ] **Step 4: Merge master into refactor/template**

```bash
git checkout refactor/template
git merge master
git log --oneline -3
git rev-list --left-right --count master...refactor/template   # expect "0	2" again
```

Expected: a clean merge. Our two extra commits (`0115361c` fix(usage) Antigravity
pools, `ef38be91` chore(release) v0.1.3) touch usage-pool display; if they
conflict with upstream's quota work, resolve toward the union — keep the
Antigravity 5h/weekly pools and upstream's Zed/Codex-Spark windows.

- [ ] **Step 5: Bump to 0.2.0**

The bump script handles root plus satellites (`cli/`, `gitbook/`, `cli/app/`),
commits, and tags `v0.2.0`. Do not hand-edit versions.

```bash
npm run bump -- minor
node -e "console.log(require('./package.json').version, require('./cli/package.json').version)"
git tag -l v0.2.0
```

Expected: `0.2.0 0.2.0`, and the tag exists. `--push` is deliberately omitted —
pushing is the user's call.

- [ ] **Step 6: Verify the version consistency test**

```bash
cd tests && npx vitest run unit/version-consistency.test.js unit/bump-version-script.test.js; cd ..
```

Expected: PASS.

- [ ] **Step 7: Final verification**

```bash
npx eslint .
npm run build
cd tests && node __baseline__/verify-no-regression.mjs; cd ..
git log --oneline -8
git status --porcelain   # expect no output
```

All green and clean. Nothing is pushed; report the state and let the user decide
whether to push `refactor/template`, `master`, and `v0.2.0`.

---

## Rollback

Before Task 11 Step 3, the whole merge is discardable:

```bash
git merge --abort                          # during Tasks 2-6
git checkout master && git branch -D merge/upstream-v0.5.59   # after Task 7
```

After Task 11 Step 4:

```bash
git checkout refactor/template && git reset --hard pre-upstream-sync-0.1.3
git checkout master && git reset --hard <master's pre-merge sha>
git tag -d v0.2.0
```

Record `master`'s pre-merge sha during Task 1 Step 6 (`git rev-parse master`) so
this is possible.
