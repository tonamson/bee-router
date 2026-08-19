# Design Spec: Admin Chrome Redesign (not 9router)

- **Date:** 2026-08-19
- **Status:** Draft for user review
- **Product:** BeeRouter local dashboard (`/dashboard/*`)
- **Mode:** Redesign overhaul of chrome only. Routes, APIs, and page clients stay.

---

## 1. Problem

BeeRouter forked 9router. Landing and tokens already use bumblebee yellow + obsidian. The **admin shell still reads as 9router**:

- Left grouped sidebar (`Gateway` / `Analytics` / `Routing` / `System`)
- Material Symbols ligature icons
- Claude terracotta leftovers in `src/shared/constants/colors.js` (`#D97757`)
- Inter + macOS traffic-light deco in `Sidebar.js`
- Same page labels and left-rail silhouette

A screenshot of `/dashboard` next to 9router still looks like a recolor.

**Goal:** change the **silhouette** so BeeRouter admin is a different product. Keep every route and handler.

**Non-goals:** rewrite providers/usage/quota page bodies; change `/v1` or store logic; restyle the public landing (already branded).

---

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Distance from 9router | New chrome. Not token-only. Not full page overhaul. |
| Skeleton | Single 64px top bar + dropdowns. No left sidebar. |
| Visual language | Hive admin: keep `#FFC700` + existing cream/obsidian surfaces. |
| Type / icons | Geist + Geist Mono. Phosphor Regular, stroke 1.5. |
| Depth of travel | `⌘K` / `Ctrl+K` command palette is the deep-nav. |
| Scope | Shell + tokens + primitive skin. Page clients inherit tokens. |

Dials (admin, not marketing): `DESIGN_VARIANCE: 4` · `MOTION_INTENSITY: 3` · `VISUAL_DENSITY: 8`.

---

## 3. Information architecture

Five top-level groups. **Slugs unchanged.** Labels stay the current English strings (no i18n rewrite in this spec).

### 3.1 Group map

| Group | Destinations |
|---|---|
| **Hive** | Endpoint & Keys `/dashboard/endpoint` (`/dashboard` already renders this same client) |
| **Providers** | Providers `/dashboard/providers` · Media kinds `/dashboard/media-providers/{embedding,image,video,tts,stt}` · Web Fetch & Search `/dashboard/media-providers/web` |
| **Routing** | Combos & Routing `/dashboard/combos` · Proxy Pools `/dashboard/proxy-pools` |
| **Usage** | Usage & Stats `/dashboard/usage` · Quota Tracker `/dashboard/quota` · Token Saver `/dashboard/token-saver` · Analytics/API Keys `/dashboard/analytics/keys` · Analytics/Token Save `/dashboard/analytics/token-save` · Analytics/Pricing `/dashboard/analytics/pricing` |
| **Tools** | CLI Tools `/dashboard/cli-tools` · Console Log `/dashboard/console-log` · Translator `/dashboard/translator` (only if `enableTranslator` from `/api/settings`) · Settings `/dashboard/profile` |

Active group = longest matching prefix. Special case already in sidebar: `/dashboard` and `/dashboard/endpoint` both count as Hive.

### 3.2 Routes that stay URL-only

These exist as pages but are **not** in today's sidebar. Do not add them to the top bar. They stay reachable from in-page links and (optionally) the palette as extra entries if a page already links them:

- `/dashboard/mitm`
- `/dashboard/pxpipe`
- `/dashboard/basic-chat`
- `/dashboard/providers/[id]`, `/dashboard/providers/new`
- `/dashboard/cli-tools/[toolId]`
- `/dashboard/analytics` (index) and nested key detail
- `/dashboard/media-providers/combo/[id]`

### 3.3 Command palette index

Always indexed:

- Every destination in §3.1 (Translator omitted when the setting is off)
- Actions: Toggle theme · Copy base URL (`window.location.origin`) · Open changelog · Log out (`POST /api/auth/logout` then `/login`)

Recent: last 5 destinations, shown when the query is empty.

---

## 4. Visual system

### 4.1 Tokens

Single source of truth: `src/app/globals.css` (already bee/obsidian).

- Accent: `#FFC700` / hover `#F59E0B`. Primary **button text is black** (WCAG on yellow).
- Dark: bg `#0D0E12` · surface `#16181F` · surface-2 `#1F222B` · border `#282B37` · text `#F4F4F5` · muted `#9CA3AF`
- Light: bg `#FDFCF7` · surface `#FFFFFF` · surface-2 `#F4F2E9` · border `#EAE6DC` · text `#18181B` · muted `#64748B`
- Radius: chrome `8px` · card `10px` · pill `999px`
- Shadows: `--shadow-soft` and `--shadow-focus` only on chrome. **No honey-glow on cards.** Glow stays on focus ring + primary button.

Delete `src/shared/constants/colors.js` (Claude terracotta). Grep importers and point them at CSS variables / Tailwind `brand-*` / `bg-bg` tokens. Do not leave a dual palette.

### 4.2 Type

Replace `Inter` in `src/app/layout.js` with `Geist` + `Geist_Mono` from `next/font/google` (`--font-sans`, `--font-mono`). Numbers, tokens, latency, currency: `font-mono tabular-nums`.

### 4.3 Icons

- New dep: `@phosphor-icons/react` (Regular, `size={18}`, weight regular).
- Shell (`Header`, `CommandPalette`, layout, update overlay) must have **zero** `material-symbols-outlined` classes.
- Keep the `material-symbols` CSS import in `src/app/layout.js` until a later page-body PR. Page clients still use ligatures; dropping the stylesheet now blanks those icons.
- One family in the shell. Do not add Lucide.

Hexagon: **logo mark only** (existing `/logo.png?v=2`, 20px in the bar). No honeycomb background, no hex breadcrumb separators.

### 4.4 Fingerprints banned in the new shell

- Left grouped sidebar
- macOS traffic lights
- Terracotta `#D97757` / `#C56243`
- Material Symbols in Header / Layout / Palette
- Inter as the admin UI font
- Marketing status copy (`Hive Active: N Providers`)
- Hex `⬡` breadcrumb ticks
- Card honey-glow hover on every tile

---

## 5. Shell

### 5.1 Desktop bar (`lg+`, 64px, sticky, hairline `border-b`)

```
[logo 20] BeeRouter    Hive ▾   Providers ▾   Routing ▾   Usage ▾   Tools ▾     [⌕ Search    ⌘K]   [status] [theme] [user]
```

- Group trigger: text + caret. Active group = `text-text-main` + **2px brand underline**. Not a filled pill.
- Dropdown: click **or** hover after 120ms. Close on Escape, outside click, item navigate. Focus trap while open. `role="menu"` / `aria-expanded`.
- Search field is a button that opens the palette (do not implement a second search).
- Status: 8px dot + `online` | `offline` | `update`. Reuse existing `/api/version` `hasUpdate` + current disconnect overlay. Update CTA moves here from the sidebar banner (same `ConfirmModal` + `ManualUpdatePanel` flow, same `/api/version/shutdown`).
- Theme: existing `ThemeToggle`.
- User menu: Copy base URL · Changelog · Log out. Settings lives under Tools, not duplicated as a second Settings item.

### 5.2 Mobile (`< lg`)

- Bar: logo · current page title · search icon · menu icon.
- Menu = **bottom sheet** listing the five groups (accordion). Not a left drawer.
- Palette still opens from the search icon.

### 5.3 Page header under the bar

One line title + optional one-line muted description. Page-owned actions stay on the right of that row (Add, Test, …). **No hex breadcrumb trail.**

Main landmark: `<main id="main">`. Skip link first in the layout.

### 5.4 Delete / replace

| Today | After |
|---|---|
| `Sidebar.js` as the primary nav | Delete from `DashboardLayout`. Move update + disconnect overlay into the layout or a `UpdateOverlay` sibling. |
| `Header.js` breadcrumbs + leftover search | Replace with the top bar in §5.1 (can keep the file name). |
| `headerSearchStore` if it only fed the old header search | Delete if unused after palette lands. |

---

## 6. Command palette

New client component, e.g. `src/shared/components/CommandPalette.js`.

- Open: `⌘K` / `Ctrl+K` / bar search button. Close: `esc`, overlay click.
- Overlay `bg-bg/60`. Panel max-width 560px, `surface`, 8px radius, 1px border.
- List: group headers (muted, 11px) then items. Highlight with `surface-3`, not a yellow wash.
- Filter: case-insensitive substring on label + href. Empty query shows Recents (max 5) then the grouped list.
- Keys: `↑↓` move, `↵` go, `esc` close. Restore focus to the opener.
- Fail: “No match”. Do not invent routes.

Palette must not fetch new APIs. Translator visibility is the same `/api/settings` read the sidebar already does.

---

## 7. Primitive skin (no API change)

Restyle only. Same props and variants.

- `Button.js`: primary = `bg-brand-500 text-black`; hover `brand-600`; active `scale-[0.98]`.
- `Card.js`: 10px radius, 1px border, no honey-glow hover.
- `Input.js` / `Select.js` / `Toggle.js`: focus uses `--shadow-focus`.
- `Badge.js` / `Modal.js` / `Drawer.js` / `MetricCard.js`: consume CSS variables; drop any `#D97757`.
- Login page: **out of this spec** unless a terracotta token remains. Login already has its own 2026-08-19 spec.

---

## 8. Error, empty, loading

- Chrome load: 64px bar skeleton. Do not block page children behind a full-viewport spinner.
- Palette empty query with no recents: grouped list. Query with zero hits: “No match”.
- Toasts: keep `notificationStore` + existing `getToastStyle` in `DashboardLayout`.
- Disconnect / update overlay: keep current behavior, new host (layout, not sidebar).
- Escape always closes dropdown, palette, and sheet.

---

## 9. Accessibility

- Skip link to `#main`.
- Active group: `aria-current="page"` on the matching item; `aria-current="true"` on the group trigger.
- Dropdown and palette: keyboard only, focus ring `--shadow-focus`.
- Contrast: yellow + **black** text. Muted text stays on `text-muted` tokens already AA-ish; do not lighten them.
- `prefers-reduced-motion: reduce`: hover delay 0, no scale, instant open/close.

---

## 10. Implementation shape (for the later plan)

Not implementation. Bounds for `writing-plans`:

1. Tokens: delete `colors.js`, wire Geist, add Phosphor, keep `globals.css` values.
2. Nav config: one module (e.g. `src/shared/constants/adminNav.js`) exporting the §3.1 tree. Header + palette import it. No second list.
3. Replace `DashboardLayout` + `Header`. Extract update overlay out of `Sidebar`.
4. Add `CommandPalette`. Delete sidebar from the layout. Delete `Sidebar.js` when nothing imports it.
5. Skin primitives. Grep `#D97757`, `material-symbols-outlined` in `src/shared/components/*`.
6. Verify in browser: 1280 and 390, login, one page per group, `⌘K`, update banner if `/api/version` says so.

**Do not** add a second tab row, a new overview KPI home, or hex mesh.

---

## 11. Testing

One small runnable check (no new framework):

`tests/unit/admin-nav.test.js` (or under existing `tests/` vitest):

- Every §3.1 href appears exactly once in the nav module.
- Hive active matcher treats `/dashboard` and `/dashboard/endpoint` as Hive.
- Palette index includes those hrefs plus the four actions.
- Translator href absent when `enableTranslator` is false.

Manual / browser (required before claiming done):

- Desktop 1280: five dropdowns, underline on the active group, palette `⌘K`.
- Mobile 390: sheet, no left drawer, palette from icon.
- Fingerprint grep: no `material-symbols` in the new Header/Palette; no `#D97757` in `src/shared`.
- Existing page actions still work (open Providers, add is not required; click through is).

---

## 12. Out of scope

- Rewriting providers grid, usage charts, quota bars, OAuth modals.
- Changing route slugs or `/api/*`.
- Removing Material Symbols from every page body in one PR.
- Landing page, CLI tray, docs screenshots (follow-up).
- New copy / i18n keys for group names beyond the five English words above.

---

## 13. Key decisions

1. **Top bar, not a restyled sidebar.** 9router’s silhouette is the left rail. Recoloring it still collides.
2. **Keep slugs and labels.** Muscle memory and bookmarks stay. Differentiation is chrome, not IA invention.
3. **One nav module.** Header and palette share the tree so they cannot drift.
4. **Hive tokens, not a third palette.** Landing already taught `#FFC700`. A teal admin would split the brand.
5. **Phosphor + Geist, drop Inter + Material in the shell.** Those two are the strongest 9router/AI tells after the sidebar.
6. **Chrome-only first PR.** Page-body clone is a later spec if screenshots still collide.

---

## 14. Open questions

None that block the plan. Follow-ups (not this spec):

- Whether hidden routes (`mitm`, `pxpipe`, `basic-chat`) should join Tools later.
- Whether Material Symbols leave page bodies in a second PR.

---

## 15. Success

A user who knows 9router can tell BeeRouter admin apart at a glance: **no left rail**, yellow/obsidian hive chrome, Geist + Phosphor, `⌘K` as the deep jump. Every current sidebar destination still exists at the same URL.
