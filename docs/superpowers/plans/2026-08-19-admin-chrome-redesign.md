# Admin Chrome Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 9router-clone left sidebar with a 64px Hive top bar + dropdowns + `⌘K` palette, without changing dashboard routes or APIs.

**Architecture:** One pure nav module (`adminNav.js`) is the only list of destinations. Header, mobile sheet, and CommandPalette all import it. Update/disconnect overlay moves out of `Sidebar.js` into `UpdateOverlay.js`. `Sidebar.js` is deleted once nothing imports it. Page clients stay; they inherit tokens. Providers page search moves off the header store onto the page.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Geist + Geist Mono (`next/font/google`), `@phosphor-icons/react`, Zustand (`themeStore`, `notificationStore`), vitest in `tests/`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-19-admin-chrome-redesign-design.md`
- Do not change route slugs or `/api/*` handlers.
- Do not rewrite providers / usage / quota / OAuth modal bodies.
- Accent `#FFC700`, hover `#F59E0B`, primary button text black.
- Shell (`Header`, `CommandPalette`, `UpdateOverlay`, `DashboardLayout`, `HeaderMenu`) must contain zero `material-symbols-outlined` class names.
- Keep `import "material-symbols/outlined.css"` in `src/app/layout.js` (page bodies still use ligatures).
- Do not add Lucide. Do not add a second tab row, overview KPI home, or hex mesh.
- English group labels only: Hive, Providers, Routing, Usage, Tools.
- Dropdown: click or hover 120ms; `prefers-reduced-motion: reduce` makes hover delay 0.
- `headerSearchStore` still feeds Providers page filter. Do not delete it until Task 7 moves that search onto the page.
- Commits: Conventional Commits, subject ≤72 chars, no AI attribution.

### File map

| File | Role |
|---|---|
| `src/shared/constants/adminNav.js` | Only destination tree + `getActiveGroupId` + `getPaletteItems` |
| `tests/unit/admin-nav.test.js` | Nav + palette contract |
| `src/app/layout.js` | Geist / Geist Mono; keep Material CSS |
| `src/shared/constants/colors.js` | Delete (terracotta leftover) |
| `src/shared/constants/index.js` | Stop re-exporting colors |
| `src/shared/components/CommandPalette.js` | `⌘K` overlay |
| `src/shared/components/UpdateOverlay.js` | Update confirm + disconnect (from Sidebar) |
| `src/shared/components/Header.js` | Top bar + dropdowns + mobile sheet trigger |
| `src/shared/components/HeaderMenu.js` | User menu, Phosphor icons |
| `src/shared/components/layouts/DashboardLayout.js` | No sidebar; skip link; `#main` |
| `src/shared/components/Sidebar.js` | Delete after Task 5 |
| `src/shared/components/index.js` | Drop Sidebar export; add CommandPalette / UpdateOverlay |
| `src/shared/components/Button.js` / `Card.js` | Token skin only |
| `src/app/(dashboard)/dashboard/providers/page.js` | In-page search input |
| `src/store/headerSearchStore.js` | Delete after Providers no longer imports it |
| `package.json` | Add `@phosphor-icons/react` |

---

### Task 1: Nav module (TDD)

**Files:**
- Create: `src/shared/constants/adminNav.js`
- Test: `tests/unit/admin-nav.test.js`

**Interfaces:**
- Consumes: `MEDIA_PROVIDER_KINDS` from `src/shared/constants/providers.js` (ids + labels only)
- Produces:
  - `VISIBLE_MEDIA_KIND_IDS` = `["embedding", "image", "video", "tts", "stt"]`
  - `ADMIN_NAV_GROUPS`: `Array<{ id: string, label: string, items: Array<{ href: string, label: string, flag?: "translator" }> }>`
  - `PALETTE_ACTIONS`: `Array<{ id: "theme" \| "copy-base-url" \| "changelog" \| "logout", label: string }>`
  - `getActiveGroupId(pathname: string): string | null`
  - `getPaletteItems({ enableTranslator: boolean }): Array<{ groupId: string, groupLabel: string, href: string, label: string }>`
  - `filterPaletteItems(items, query: string):` same shape, case-insensitive substring on `label` or `href`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin-nav.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import {
  ADMIN_NAV_GROUPS,
  PALETTE_ACTIONS,
  getActiveGroupId,
  getPaletteItems,
  filterPaletteItems,
} from "../../src/shared/constants/adminNav.js";

const REQUIRED_HREFS = [
  "/dashboard/endpoint",
  "/dashboard/providers",
  "/dashboard/media-providers/embedding",
  "/dashboard/media-providers/image",
  "/dashboard/media-providers/video",
  "/dashboard/media-providers/tts",
  "/dashboard/media-providers/stt",
  "/dashboard/media-providers/web",
  "/dashboard/combos",
  "/dashboard/proxy-pools",
  "/dashboard/usage",
  "/dashboard/quota",
  "/dashboard/token-saver",
  "/dashboard/analytics/keys",
  "/dashboard/analytics/token-save",
  "/dashboard/analytics/pricing",
  "/dashboard/cli-tools",
  "/dashboard/console-log",
  "/dashboard/translator",
  "/dashboard/profile",
];

describe("ADMIN_NAV_GROUPS", () => {
  it("lists each required href exactly once", () => {
    const hrefs = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toEqual(expect.arrayContaining(REQUIRED_HREFS));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toHaveLength(REQUIRED_HREFS.length);
  });

  it("uses the five locked group ids and labels", () => {
    expect(ADMIN_NAV_GROUPS.map((g) => [g.id, g.label])).toEqual([
      ["hive", "Hive"],
      ["providers", "Providers"],
      ["routing", "Routing"],
      ["usage", "Usage"],
      ["tools", "Tools"],
    ]);
  });
});

describe("getActiveGroupId", () => {
  it("treats /dashboard and /dashboard/endpoint as hive", () => {
    expect(getActiveGroupId("/dashboard")).toBe("hive");
    expect(getActiveGroupId("/dashboard/endpoint")).toBe("hive");
  });

  it("does not treat other /dashboard/* routes as hive", () => {
    expect(getActiveGroupId("/dashboard/providers")).toBe("providers");
    expect(getActiveGroupId("/dashboard/usage")).toBe("usage");
  });

  it("uses longest href prefix", () => {
    expect(getActiveGroupId("/dashboard/providers/claude")).toBe("providers");
    expect(getActiveGroupId("/dashboard/media-providers/tts")).toBe("providers");
    expect(getActiveGroupId("/dashboard/analytics/keys/abc")).toBe("usage");
    expect(getActiveGroupId("/dashboard/cli-tools/claude")).toBe("tools");
  });
});

describe("getPaletteItems", () => {
  it("includes every nav href plus four actions stay separate", () => {
    const items = getPaletteItems({ enableTranslator: true });
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toEqual(expect.arrayContaining(REQUIRED_HREFS));
    expect(PALETTE_ACTIONS.map((a) => a.id)).toEqual([
      "theme",
      "copy-base-url",
      "changelog",
      "logout",
    ]);
  });

  it("omits translator when enableTranslator is false", () => {
    const items = getPaletteItems({ enableTranslator: false });
    expect(items.some((i) => i.href === "/dashboard/translator")).toBe(false);
    expect(getPaletteItems({ enableTranslator: true }).some((i) => i.href === "/dashboard/translator")).toBe(true);
  });
});

describe("filterPaletteItems", () => {
  it("matches label or href case-insensitively", () => {
    const items = getPaletteItems({ enableTranslator: true });
    const hits = filterPaletteItems(items, "QUOTA");
    expect(hits.map((i) => i.href)).toContain("/dashboard/quota");
  });

  it("returns [] when nothing matches", () => {
    const items = getPaletteItems({ enableTranslator: true });
    expect(filterPaletteItems(items, "zzz-no-such-page")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from repo root:

```bash
cd tests && npx vitest run unit/admin-nav.test.js
```

Expected: FAIL — `Cannot find module .../adminNav.js` (or named export missing).

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/constants/adminNav.js`:

```javascript
import { MEDIA_PROVIDER_KINDS } from "./providers.js";

export const VISIBLE_MEDIA_KIND_IDS = ["embedding", "image", "video", "tts", "stt"];

export const PALETTE_ACTIONS = [
  { id: "theme", label: "Toggle theme" },
  { id: "copy-base-url", label: "Copy base URL" },
  { id: "changelog", label: "Open changelog" },
  { id: "logout", label: "Log out" },
];

const mediaItems = VISIBLE_MEDIA_KIND_IDS.map((id) => {
  const kind = MEDIA_PROVIDER_KINDS.find((k) => k.id === id);
  return { href: `/dashboard/media-providers/${id}`, label: kind?.label || id };
});

export const ADMIN_NAV_GROUPS = [
  {
    id: "hive",
    label: "Hive",
    items: [{ href: "/dashboard/endpoint", label: "Endpoint & Keys" }],
  },
  {
    id: "providers",
    label: "Providers",
    items: [
      { href: "/dashboard/providers", label: "Providers" },
      ...mediaItems,
      { href: "/dashboard/media-providers/web", label: "Web Fetch & Search" },
    ],
  },
  {
    id: "routing",
    label: "Routing",
    items: [
      { href: "/dashboard/combos", label: "Combos & Routing" },
      { href: "/dashboard/proxy-pools", label: "Proxy Pools" },
    ],
  },
  {
    id: "usage",
    label: "Usage",
    items: [
      { href: "/dashboard/usage", label: "Usage & Stats" },
      { href: "/dashboard/quota", label: "Quota Tracker" },
      { href: "/dashboard/token-saver", label: "Token Saver" },
      { href: "/dashboard/analytics/keys", label: "API Keys" },
      { href: "/dashboard/analytics/token-save", label: "Token Save" },
      { href: "/dashboard/analytics/pricing", label: "Pricing" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { href: "/dashboard/cli-tools", label: "CLI Tools" },
      { href: "/dashboard/console-log", label: "Console Log" },
      { href: "/dashboard/translator", label: "Translator", flag: "translator" },
      { href: "/dashboard/profile", label: "Settings" },
    ],
  },
];

export function getActiveGroupId(pathname) {
  if (!pathname) return null;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint")) {
    return "hive";
  }
  let best = null;
  let bestLen = -1;
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (hit && item.href.length > bestLen) {
        best = group.id;
        bestLen = item.href.length;
      }
    }
  }
  return best;
}

export function getPaletteItems({ enableTranslator = false } = {}) {
  const items = [];
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.flag === "translator" && !enableTranslator) continue;
      items.push({
        groupId: group.id,
        groupLabel: group.label,
        href: item.href,
        label: item.label,
      });
    }
  }
  return items;
}

export function filterPaletteItems(items, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd tests && npx vitest run unit/admin-nav.test.js
```

Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/shared/constants/adminNav.js tests/unit/admin-nav.test.js
git commit -m "feat(ui): add admin nav module"
```

---

### Task 2: Tokens, Geist, Phosphor

**Files:**
- Modify: `src/app/layout.js`
- Modify: `src/shared/constants/index.js`
- Delete: `src/shared/constants/colors.js`
- Modify: `package.json` (and lockfile via npm)
- Modify: `src/app/globals.css` only if `--font-sans` / `--font-mono` need wiring under `@theme inline`

**Interfaces:**
- Consumes: existing `globals.css` bee/obsidian tokens (do not change hex values)
- Produces: `Geist` as `--font-sans`, `Geist_Mono` as `--font-mono`; no `COLORS` / `CSS_VARIABLES` export; `@phosphor-icons/react` installed

- [ ] **Step 1: Confirm colors.js has no src importers**

```bash
rg -n "shared/constants/colors|CSS_VARIABLES|COLORS\\.primary" src --glob '*.js'
```

Expected: only `src/shared/constants/colors.js` and `src/shared/constants/index.js` (`export * from "./colors"`). CLI `COLORS` in `cli/` is a different object — do not touch CLI.

- [ ] **Step 2: Delete terracotta palette**

Delete `src/shared/constants/colors.js`.

In `src/shared/constants/index.js` remove the line `export * from "./colors";`. Leave `export * from "./config";`.

- [ ] **Step 3: Install Phosphor**

From repo root:

```bash
npm install @phosphor-icons/react
```

Do not add Lucide. Do not remove `material-symbols`.

- [ ] **Step 4: Swap Inter for Geist**

Replace the font block in `src/app/layout.js`:

```javascript
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "material-symbols/outlined.css";
import "./globals.css";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import "@/lib/network/initOutboundProxy";
import "@/shared/services/bootstrap";
import { initConsoleLogCapture } from "@/lib/consoleLogBuffer";
import { RuntimeI18nProvider } from "@/i18n/RuntimeI18nProvider";

initConsoleLogCapture();

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});
```

On `<body>`:

```javascript
<body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
```

Keep the Material CSS import and the `fonts-loaded` script.

If Tailwind does not already map `font-sans` / `font-mono` to those variables, add under `@theme inline` in `src/app/globals.css`:

```css
--font-sans: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
--font-mono: var(--font-mono), ui-monospace, monospace;
```

Only add this if `font-sans` still resolves to Inter after the layout change. Do not invent extra tokens.

- [ ] **Step 5: Grep terracotta out of src/shared**

```bash
rg -n "#D97757|#C56243" src/shared
```

Expected: no matches. If a primitive still hardcodes those hexes, replace with `brand-500` / CSS variables in Task 6, not here.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.js src/app/globals.css src/shared/constants/index.js package.json package-lock.json
git rm src/shared/constants/colors.js
git commit -m "feat(ui): Geist fonts, drop terracotta palette"
```

---

### Task 3: Command palette

**Files:**
- Create: `src/shared/components/CommandPalette.js`
- Modify: `src/shared/components/index.js` (export it)
- Test: extend `tests/unit/admin-nav.test.js` is enough for filter; no React test runner in this repo — do not add Testing Library

**Interfaces:**
- Consumes: `getPaletteItems`, `filterPaletteItems`, `PALETTE_ACTIONS` from `adminNav.js`; `useTheme().toggleTheme`
- Produces: `CommandPalette({ open, onClose, enableTranslator, onLogout, onOpenChangelog })`
  - Recents key: `localStorage["bee-router.palette.recent"]` = JSON array of hrefs, max 5, most-recent first
  - Actions: `theme` calls `toggleTheme()`; `copy-base-url` copies `window.location.origin`; `changelog` calls `onOpenChangelog`; `logout` calls `onLogout`

- [ ] **Step 1: Implement CommandPalette**

Create `src/shared/components/CommandPalette.js` as a client component. Required behavior (implement exactly):

```javascript
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, ArrowRight } from "@phosphor-icons/react";
import { useTheme } from "@/shared/hooks/useTheme";
import {
  PALETTE_ACTIONS,
  filterPaletteItems,
  getPaletteItems,
} from "@/shared/constants/adminNav";

const RECENT_KEY = "bee-router.palette.recent";

function readRecents() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((h) => typeof h === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function pushRecent(href) {
  const next = [href, ...readRecents().filter((h) => h !== href)].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function CommandPalette({
  open,
  onClose,
  enableTranslator = false,
  onLogout,
  onOpenChangelog,
}) {
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(
    () => getPaletteItems({ enableTranslator }),
    [enableTranslator]
  );
  const filtered = useMemo(() => filterPaletteItems(items, query), [items, query]);
  const recents = useMemo(() => {
    if (query.trim()) return [];
    const hrefs = readRecents();
    return hrefs
      .map((href) => items.find((i) => i.href === href))
      .filter(Boolean);
  }, [items, query, open]);

  const rows = query.trim()
    ? filtered.map((i) => ({ kind: "nav", ...i }))
    : [
        ...recents.map((i) => ({ kind: "recent", ...i })),
        ...filtered.map((i) => ({ kind: "nav", ...i })),
      ];

  const actionRows = PALETTE_ACTIONS.map((a) => ({ kind: "action", id: a.id, label: a.label }));
  const list = query.trim()
    ? [...rows, ...actionRows.filter((a) => a.label.toLowerCase().includes(query.trim().toLowerCase()))]
    : [...rows, ...actionRows];

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(list.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = list[active];
        if (row) choose(row);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list, active, onClose]);

  function choose(row) {
    if (row.kind === "action") {
      if (row.id === "theme") toggleTheme();
      if (row.id === "copy-base-url") navigator.clipboard?.writeText(window.location.origin);
      if (row.id === "changelog") onOpenChangelog?.();
      if (row.id === "logout") onLogout?.();
      onClose();
      return;
    }
    pushRecent(row.href);
    router.push(row.href);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4">
      <button type="button" className="absolute inset-0 bg-bg/60" aria-label="Close search" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative w-full max-w-[560px] rounded-[8px] border border-border bg-surface shadow-[var(--shadow-soft)]"
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-3">
          <MagnifyingGlass size={18} className="text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search"
            className="h-12 w-full bg-transparent text-sm text-text-main outline-none"
          />
        </div>
        <ul className="max-h-[360px] overflow-y-auto py-1">
          {list.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-text-muted">No match</li>
          ) : (
            list.map((row, i) => (
              <li key={row.href || row.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(row)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    i === active ? "bg-surface-3" : ""
                  }`}
                >
                  <span>
                    {row.kind !== "action" && (
                      <span className="mr-2 text-[11px] text-text-muted">{row.groupLabel}</span>
                    )}
                    {row.label}
                  </span>
                  {row.kind !== "action" && <ArrowRight size={14} className="text-text-subtle" />}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
```

Deduplicate recents vs full list if the empty-query list would show the same href twice (skip a `nav` row whose href is already in `recents`).

Zero `material-symbols-outlined` in this file.

Export from `src/shared/components/index.js`:

```javascript
export { default as CommandPalette } from "./CommandPalette";
```

- [ ] **Step 2: Re-run nav tests (no regression)**

```bash
cd tests && npx vitest run unit/admin-nav.test.js
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/CommandPalette.js src/shared/components/index.js
git commit -m "feat(ui): add command palette"
```

---

### Task 4: Update overlay extraction

**Files:**
- Create: `src/shared/components/UpdateOverlay.js`
- Modify: `src/shared/components/index.js`

**Interfaces:**
- Consumes: `UPDATER_CONFIG` from `@/shared/constants/config`; `ConfirmModal` from `./Modal`; `Button` from `./Button`; `useCopyToClipboard`
- Produces: `UpdateOverlay` that owns:
  - `GET /api/version` on mount (same as current Sidebar)
  - `hasUpdate` banner state
  - `ConfirmModal` + `ManualUpdatePanel` (copy `ManualUpdatePanel` out of `Sidebar.js` verbatim, then swap Material `power_off` for Phosphor `Power`)
  - `POST /api/version/shutdown` after countdown, same as Sidebar `handleCopyAndShutdown`
DashboardLayout (Task 5) owns `GET /api/version` and confirm/updating flags. Header only receives `{ updateInfo, onRequestUpdate }` for the status dot. Overlay is presentational.

Preferred shape (lock this):

```javascript
// UpdateOverlay.js
export default function UpdateOverlay({
  updateInfo,          // null | { hasUpdate, latestVersion }
  isUpdating,
  isDisconnected,
  shutdownCountdown,
  onCopyAndShutdown,
  onCancel,
  showConfirm,
  onCloseConfirm,
  onConfirmUpdate,
})
```

Header (Task 5) owns the fetch + confirm flag. Overlay is presentational + ManualUpdatePanel.

Copy `ManualUpdatePanel` from `src/shared/components/Sidebar.js` (starts ~line 528) into `UpdateOverlay.js`. Replace the disconnected `material-symbols-outlined` `power_off` span with:

```javascript
import { Power } from "@phosphor-icons/react";
<Power size={32} />
```

Keep install command, countdown, and shutdown POST identical.

- [ ] **Step 1: Create UpdateOverlay.js with ManualUpdatePanel + disconnected screen**

Use the existing Sidebar markup for the overlay (`fixed inset-0 z-50 ... bg-black/80`). Do not redesign the panel.

- [ ] **Step 2: Export it**

```javascript
export { default as UpdateOverlay } from "./UpdateOverlay";
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/UpdateOverlay.js src/shared/components/index.js
git commit -m "feat(ui): extract update overlay from sidebar"
```

Sidebar still works until Task 5. Temporary duplication of ManualUpdatePanel is OK for one commit.

---

### Task 5: Top bar Header + layout (sidebar dies)

**Files:**
- Modify: `src/shared/components/Header.js`
- Modify: `src/shared/components/HeaderMenu.js`
- Modify: `src/shared/components/layouts/DashboardLayout.js`
- Modify: `src/shared/components/index.js` (remove Sidebar export)
- Delete: `src/shared/components/Sidebar.js`

**Interfaces:**
- Consumes: `ADMIN_NAV_GROUPS`, `getActiveGroupId`; `CommandPalette`; `UpdateOverlay`; `HeaderMenu`; `ThemeToggle`; `HeaderLanguage` (keep); `APP_CONFIG`; `GET /api/settings` (`enableTranslator`); `GET /api/auth/status` (existing Header effect); `GET /api/version`
- Produces: 64px sticky bar; no left rail; `#main`; skip link

- [ ] **Step 1: Rewrite HeaderMenu icons to Phosphor**

In `src/shared/components/HeaderMenu.js` replace `MenuItem` so `icon` is a React node, not a Material ligature string:

```javascript
function MenuItem({ icon, label, onClick, trailing, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
        danger ? "text-red-500 hover:bg-red-500/10" : "text-text-main hover:bg-surface-2"
      }`}
    >
      <span className={danger ? "" : "text-text-muted"}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {trailing}
    </button>
  );
}
```

Call sites:

```javascript
import { ClockCounterClockwise, Sun, Moon, Power, SignOut } from "@phosphor-icons/react";

<MenuItem icon={<ClockCounterClockwise size={18} />} label="Change Log" onClick={...} />
<MenuItem icon={isDark ? <Sun size={18} /> : <Moon size={18} />} label="Theme" onClick={...} />
<MenuItem icon={<Power size={18} />} label="Shutdown" danger onClick={...} />
<MenuItem icon={<SignOut size={18} />} label="Logout" danger onClick={...} />
```

Trigger button: `List` or `User` Phosphor, not `grid_view`.

Add a fifth item **before** Shutdown:

```javascript
<MenuItem
  icon={<Copy size={18} />}
  label="Copy base URL"
  onClick={() => { close(); navigator.clipboard?.writeText(window.location.origin); }}
/>
```

Keep ChangelogModal + Shutdown ConfirmModal.

Zero Material classes in this file.

- [ ] **Step 2: Rewrite Header.js into the top bar**

Keep `getPageInfo` for `title` / `description` only. Delete breadcrumb rendering and every `⬡`. Delete `useHeaderSearchStore` usage (Providers still registers; the header just stops reading it until Task 7).

Desktop (`lg+`) structure:

```javascript
<header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-subtle bg-surface px-4">
  <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
  <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
    <Image src="/logo.png?v=2" alt="" width={20} height={20} unoptimized />
    <span className="font-semibold text-text-main">{APP_CONFIG.name}</span>
  </Link>
  <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
    {/* one GroupMenu per ADMIN_NAV_GROUPS */}
  </nav>
  <button
    type="button"
    onClick={() => setPaletteOpen(true)}
    className="ml-auto hidden lg:flex h-9 min-w-[200px] items-center gap-2 rounded-[8px] border border-border bg-bg px-3 text-sm text-text-muted"
  >
    <MagnifyingGlass size={16} />
    Search
    <kbd className="ml-auto font-mono text-[11px]">⌘K</kbd>
  </button>
  {/* status dot: online | update */}
  <ThemeToggle />
  <HeaderLanguage />
  <HeaderMenu onLogout={handleLogout} />
</header>
```

`GroupMenu` rules:

- Trigger text = `group.label` + `CaretDown`.
- If `getActiveGroupId(pathname) === group.id`, add `aria-current="true"` and `border-b-2 border-brand-500` on the trigger.
- Open on click. Also open on pointer enter after 120ms (`window.matchMedia("(prefers-reduced-motion: reduce)").matches` then 0ms). Close on leave, Escape, outside click, or navigation.
- Dropdown: `role="menu"`, items `role="menuitem"`, `Link` to `item.href`. Skip `flag === "translator"` unless `enableTranslator`.
- Matching item: `aria-current="page"` when `pathname === href || pathname.startsWith(href + "/")`, plus Hive special case for `/dashboard` on Endpoint.

Mobile (`< lg`): logo, `pageInfo.title`, search icon (opens palette), hamburger (toggles a **bottom sheet**, not a left drawer). Sheet lists the five groups as `<details>` / accordion with the same items.

Global `keydown`: if `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"`, preventDefault and open palette.

Fetch `/api/settings` once for `enableTranslator` (same as Sidebar).

Render `CommandPalette` here with `open={paletteOpen}`. `onOpenChangelog` sets local `changelogOpen` and Header renders one `ChangelogModal` (HeaderMenu may keep its own; do not invent a shared store). `onLogout` is the existing `handleLogout`.

Do not put Material classes in this file.

- [ ] **Step 3: Rewrite DashboardLayout**

`src/shared/components/layouts/DashboardLayout.js` becomes a column, not `flex` + left rail:

```javascript
export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const { copy } = useCopyToClipboard(2000);

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((data) => { if (data.hasUpdate) setUpdateInfo(data); })
      .catch(() => {});
  }, []);

  async function onCopyAndShutdown() {
    const cmd = UPDATER_CONFIG.installCmdLatest;
    try { await navigator.clipboard.writeText(cmd); } catch { /* ignore */ }
    copy(cmd);
    let remaining = UPDATER_CONFIG.shutdownCountdownSec;
    setShutdownCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setShutdownCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        fetch("/api/version/shutdown", { method: "POST" }).catch(() => {});
        setIsDisconnected(true);
      }
    }, 1000);
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg">
      {/* existing toast stack, unchanged getToastStyle */}
      <Header
        updateInfo={updateInfo}
        onRequestUpdate={() => setShowUpdateModal(true)}
      />
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${pathname === "/dashboard/basic-chat" ? "" : "p-6 lg:p-10"}`}>
          <div className={pathname === "/dashboard/basic-chat" ? "flex-1 w-full h-full flex flex-col" : "max-w-7xl mx-auto"}>
            {children}
          </div>
        </div>
      </main>
      <UpdateOverlay
        updateInfo={updateInfo}
        isUpdating={isUpdating}
        isDisconnected={isDisconnected}
        shutdownCountdown={shutdownCountdown}
        onCopyAndShutdown={onCopyAndShutdown}
        onCancel={() => { setIsUpdating(false); setShutdownCountdown(0); }}
        showConfirm={showUpdateModal}
        onCloseConfirm={() => setShowUpdateModal(false)}
        onConfirmUpdate={() => { setShowUpdateModal(false); setIsUpdating(true); }}
      />
    </div>
  );
}
```

Use `h-dvh` not `h-screen`. Remove the mobile left-drawer overlay. Remove `<Sidebar />`. Keep toast markup as it is today.

Header shows an `update` status control that calls `onRequestUpdate` when `updateInfo` is set. Otherwise a green 8px dot + `online`.

- [ ] **Step 4: Delete Sidebar**

```bash
rg -n "from [\"'].*Sidebar|default as Sidebar" src --glob '*.js'
```

Expected after layout change: only `src/shared/components/index.js` and `Sidebar.js`. Remove the export line. Delete `src/shared/components/Sidebar.js`.

- [ ] **Step 5: Fingerprint grep on new shell**

```bash
rg -n "material-symbols-outlined" src/shared/components/Header.js src/shared/components/HeaderMenu.js src/shared/components/CommandPalette.js src/shared/components/UpdateOverlay.js src/shared/components/layouts/DashboardLayout.js
rg -n "Sidebar" src/shared/components/layouts/DashboardLayout.js
```

Expected: no Material matches; no Sidebar import.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/Header.js src/shared/components/HeaderMenu.js src/shared/components/layouts/DashboardLayout.js src/shared/components/index.js
git rm src/shared/components/Sidebar.js
git commit -m "feat(ui): replace sidebar with top bar"
```

---

### Task 6: Primitive skin

**Files:**
- Modify: `src/shared/components/Button.js`
- Modify: `src/shared/components/Card.js`

**Interfaces:**
- Consumes: existing props (`variant`, `size`, `icon` as Material ligature string for **page** callers)
- Produces: same public API. Do **not** change `icon` from string to Phosphor — page bodies still pass `"add"`.

- [ ] **Step 1: Button**

In `variants.primary` and `variants.cta`:

- hover `bg-brand-600` (not `brand-400`)
- drop `shadow-[0_2px_14px_rgba(255,199,0,0.28)]` and the stronger hover glow
- keep `text-black` and `active:scale-[0.98]`
- wrap scale in a way that `@media (prefers-reduced-motion: reduce)` wins: add class `motion-safe:active:scale-[0.98]` and remove unconditional `active:scale-[0.98]`

Leave the Material spinner / `icon` spans. They are page API, not shell.

- [ ] **Step 2: Card**

Replace `rounded-[14px]` with `rounded-[10px]`.

Change hover:

```javascript
hover && "hover:border-brand-500/30 transition-all duration-200 cursor-pointer"
```

No `shadow-honey-glow`.

If Card still renders `material-symbols-outlined` for `icon`, leave it (page API).

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/Button.js src/shared/components/Card.js
git commit -m "style(ui): quiet button and card chrome"
```

---

### Task 7: Providers in-page search

**Files:**
- Modify: `src/app/(dashboard)/dashboard/providers/page.js`
- Delete: `src/store/headerSearchStore.js` after grep is clean

**Interfaces:**
- Consumes: existing `matchSearch(name)` logic
- Produces: local `useState("")` query; a search `<input>` at the top of the providers page; no `useHeaderSearchStore`

- [ ] **Step 1: Move search onto the page**

Remove:

```javascript
import { useHeaderSearchStore } from "@/store/headerSearchStore";
const searchQuery = useHeaderSearchStore((s) => s.query);
const registerSearch = useHeaderSearchStore((s) => s.register);
const unregisterSearch = useHeaderSearchStore((s) => s.unregister);
useEffect(() => {
  registerSearch("Search providers...");
  return () => unregisterSearch();
}, [registerSearch, unregisterSearch]);
```

Add:

```javascript
const [searchQuery, setSearchQuery] = useState("");
```

Render above the provider lists (same visual density as other page filters):

```javascript
<input
  type="search"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Search providers..."
  className="h-9 w-full max-w-sm rounded-[8px] border border-border bg-bg px-3 text-sm text-text-main"
/>
```

Keep `matchSearch` unchanged.

- [ ] **Step 2: Delete the store if unused**

```bash
rg -n "headerSearchStore|useHeaderSearchStore" src --glob '*.js'
```

Expected: only `src/store/headerSearchStore.js`. Delete that file. Do not add a re-export.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/providers/page.js
git rm src/store/headerSearchStore.js
git commit -m "feat(ui): move provider search onto page"
```

---

### Task 8: Verify

**Files:** none (commands only)

- [ ] **Step 1: Unit**

```bash
cd tests && npx vitest run unit/admin-nav.test.js
```

Expected: PASS.

- [ ] **Step 2: Fingerprints**

```bash
rg -n "#D97757|#C56243" src/shared
rg -n "material-symbols-outlined" src/shared/components/Header.js src/shared/components/HeaderMenu.js src/shared/components/CommandPalette.js src/shared/components/UpdateOverlay.js src/shared/components/layouts/DashboardLayout.js
rg -n "from [\"'].*Sidebar" src --glob '*.js'
```

Expected: no terracotta in `src/shared`; no Material in the five shell files; no Sidebar imports.

- [ ] **Step 3: Browser (required)**

Start:

```bash
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev
```

Login at `http://localhost:20128/login`. Then:

| Viewport | Check |
|---|---|
| 1280 | No left sidebar. 64px bar. Five group labels. Active group has brand underline. |
| 1280 | Each dropdown lists the spec destinations. Translator hidden unless settings enable it. |
| 1280 | `⌘K` / `Ctrl+K` opens palette; type `quota`; Enter goes to `/dashboard/quota`. Esc closes. |
| 1280 | Click Hive → Endpoint, Providers → Providers, Routing → Combos, Usage → Usage, Tools → CLI Tools. |
| 390 | No left drawer. Hamburger opens **bottom** sheet. Search icon opens palette. |
| both | Primary buttons are yellow + black text. Cards have no honey glow. |

If login or a group click is broken, fix in this task — do not claim done.

- [ ] **Step 4: Final commit only if Step 3 forced fixes**

```bash
git add -u
git commit -m "fix(ui): admin chrome verify follow-ups"
```

Skip this commit if the tree is clean.

---

## Self-review (coverage)

| Spec section | Task |
|---|---|
| §3 IA / group map / Hive matcher | Task 1 |
| §3.3 palette index + actions | Task 1 + 3 |
| §4 tokens, delete colors.js, Geist, Phosphor | Task 2 |
| §4.4 banned fingerprints | Task 5 Step 5, Task 8 Step 2 |
| §5 top bar, mobile sheet, skip link, `#main` | Task 5 |
| §5.4 delete Sidebar, header search store | Task 5 + 7 |
| §6 CommandPalette | Task 3 |
| §7 Button / Card skin | Task 6 |
| §8 overlay / toasts | Task 4 + 5 |
| §9 a11y | Task 5 (aria, skip, focus) + Task 3 (Esc) |
| §11 tests + browser | Task 1 + 8 |
| Login / landing / page-body Material | Out of scope (explicit) |

No `TBD`. Signatures used later (`getPaletteItems`, `UpdateOverlay` props, `PALETTE_ACTIONS` ids) match Task 1 / 3 / 4.
