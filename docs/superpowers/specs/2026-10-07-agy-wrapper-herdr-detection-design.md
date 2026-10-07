# AGY Apply breaks herdr detection + misleading banner model

Date: 2026-10-07
Scope: `src/lib/antigravityCliConfig.js`, `src/app/api/cli-tools/agy-settings/route.js`, `AntigravityCliToolCard.js`, `tests/unit/antigravity-cli-config.test.js`

## Symptom

After Dashboard → CLI Tools → AGY → Apply:

- agy banner shows `Gemini API key` / `Gemini 3.1 Pro (Low)` even though the selected route model is `ag/gemini-3.8-flash-medium`.
- herdr no longer detects the pane as an Antigravity agent (`agent` missing, `agent_status: unknown`).

## Root cause 1 — wrapper renames the agy process (herdr breakage)

Apply (`installAgyWrapper`) copies the real binary to `~/.gemini/antigravity-cli/agy.real` and replaces `~/.local/bin/agy` with a sh script ending in `exec ".../agy.real" "$@"`.
After `exec`, the process name / argv0 is `agy.real`.

herdr's built-in manifest matches `id = "agy"`, aliases `["antigravity", "antigravity-cli"]` against the foreground process name.

Evidence:

- `herdr pane process-info --pane w3:p4` → `"name":"agy.real","argv0":"agy.real"`.
- `~/.config/herdr/herdr-server.log`:
  - `07:33:42Z agent changed ... agent=Some(Antigravity) process=agy` (before Apply)
  - `07:42:44Z agent changed ... previous_agent=Some(Antigravity) agent=None` (= 14:42 local, same mtime as `agy.real` and `bee-router.env`)
- herdr session hook still reports `agent_session` (source `herdr:antigravity_cli`), so integration is fine — only process-name detection fails.

## Root cause 2 — hardcoded catalog model (banner)

`applyAntigravitySettings` writes `settings.model = AGY_CATALOG_MODEL` (`"Gemini 3.1 Pro"`) for every bee-router id.
agy log: `model alias "Gemini 3.1 Pro" resolved to "Gemini 3.1 Pro (Low)"`.
Traffic is still rewritten correctly by `resolveAgyRouteModel` (`BEE_ROUTER_MODEL`), so this is display-only, but it hides which model is actually routed.
agy's catalog contains `Gemini 3.{5..8} Flash (Low|Medium|High)` and `Gemini 3.1 Pro (Low|High)`.

## Root cause 3 — UI reload seeds the catalog label as route model (found during fix)

`AntigravityCliToolCard` initialises `selectedModel` from `settings.model` (the catalog label). Re-Apply after a reload then writes `BEE_ROUTER_MODEL="Gemini 3.1 Pro"` — not a bee-router id — and routing breaks.
Fix: GET also returns `env.BEE_ROUTER_MODEL`; the card prefers it over `settings.model`.

## Fix design

### 1. Keep the real binary's basename `agy`

- New real-binary path: `~/.gemini/antigravity-cli/bee-router/agy` (own dir; do not reuse agy's `bin/`).
- Wrapper unchanged except target: `exec "<dir>/bee-router/agy" "$@"` → process name `agy`.
- Rejected: `exec -a agy` (bash-only, wrapper is `/bin/sh`); PATH-shim (order-dependent).

Route changes (`agy-settings/route.js`):

- `getRealBinPath()` → `<agyDir>/bee-router/agy`; keep `getLegacyRealBinPath()` → `<agyDir>/agy.real`.
- `installAgyWrapper()`:
  - bin not a wrapper → `mkdir bee-router`, copy bin → new real path, write wrapper (as today).
  - bin is a wrapper (migration) → if legacy `agy.real` exists and new path missing, `rename` legacy → new; always rewrite wrapper text so it points at the new path.
- `uninstallAgyWrapper()`: restore from new path, else legacy path; unlink both.

UI (`AntigravityCliToolCard.js:178-179`): update shown filename / wrapper preview to the new path.

### 2. Map route model to a matching catalog label

`toAgyCatalogModel(model)` in `antigravityCliConfig.js`:

- strip provider prefix (`ag/`, `gemini/`, …), match `^gemini-(\d+(?:\.\d+)?)-(pro|flash)(?:-(low|medium|high))?$`
- → `Gemini <ver> <Pro|Flash>` + ` (<Level>)` when a level is present (e.g. `ag/gemini-3.8-flash-medium` → `Gemini 3.8 Flash (Medium)`)
- no match → `AGY_CATALOG_MODEL` fallback.

`applyAntigravitySettings` uses it instead of the constant. `resolveAgyRouteModel` still rewrites (incoming `gemini-…` matches `/^gemini/i`).

Open risk: agy in Gemini-API-key mode may reject a label it does not list for that mode. Verify manually (below); if rejected, keep fallback and only fix #1.

## Tests (write failing first)

`tests/unit/antigravity-cli-config.test.js`:

- `serializeAgyWrapper({ realBin: "/x/bee-router/agy" })` exec line ends with basename `agy`.
- `toAgyCatalogModel`: `ag/gemini-3.8-flash-medium` → `Gemini 3.8 Flash (Medium)`; `gemini/gemini-3.1-pro-high` → `Gemini 3.1 Pro (High)`; `cc/claude-x` → `Gemini 3.1 Pro`.
- `applyAntigravitySettings` writes the mapped label.

Route migration logic is fs-bound; verify manually rather than adding fs mocks.

## Manual verification

1. Apply in dashboard on a machine with the old `agy.real` layout → `~/.local/bin/agy` points to `bee-router/agy`, `agy.real` gone.
2. Start `agy` in a herdr pane → `herdr pane process-info` shows `name: "agy"`; `herdr agent list` lists it as `agy`; server log `agent=Some(Antigravity)`.
3. agy banner / `cli.log` `model_resolver` shows the mapped label; a prompt still reaches bee-router with `BEE_ROUTER_MODEL`.
4. Reset → `~/.local/bin/agy` is the Mach-O binary again, both real copies removed.

## Out of scope / follow-up

- agy self-updater (`updater/`) may overwrite `~/.local/bin/agy`, silently dropping the wrapper, or leave the copied real binary stale. Not addressed here.
- Windows: wrapper is skipped there today; unchanged.
