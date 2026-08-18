# BeeRouter UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the BeeRouter UI into BeeRouter with a high-craft Bumblebee & Honey theme, modern obsidian surfaces, crisp Material Symbols vector icons, streamlined sidebar navigation (removing 9Remote and 9English), and polished landing/login/dashboard interfaces.

**Architecture:** Token-driven design system implemented natively via Tailwind CSS v4 in `globals.css` with a Bumblebee & Honey palette (`#FFC700` primary, `#F59E0B` hover/gradient, `#0D0E12` dark background, `#16181F` obsidian surface). Core UI primitives, layouts, animations, and pages consume these tokens uniformly.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Material Symbols Outlined, Recharts 3.

## Global Constraints

- Primary brand color: Bumblebee Yellow `#FFC700` (`--color-brand-500`), hover/secondary: Honey Amber `#F59E0B` (`--color-brand-600`).
- Surface base (Dark): `#0D0E12` (bg), `#16181F` (surface), `#1F222B` (surface-2), `#282B37` (border).
- Surface base (Light): `#FDFCF7` (bg), `#FFFFFF` (surface), `#EAE6DC` (border).
- No emojis in sidebar menu labels or action titles; use crisp Material Symbols vector icons only.
- Clean navigation naming without awkward nested parentheses (e.g. "Endpoint & Keys", "Providers", "Combos & Routing").
- Completely delete 9Remote and 9English components and menu links.
- Preserve 100% of existing backend APIs, proxy routing, and client state hooks.

---

### Task 1: Design Tokens, CSS Variables & Brand Assets

**Files:**
- Modify: `src/app/globals.css:10-150`
- Modify: `src/shared/constants/config.js:1-15`
- Modify: `src/app/layout.js:19-29`
- Modify: `src/app/manifest.js:1-30`
- Modify: `public/favicon.svg`
- Modify: `public/icons/icon-192.svg`
- Modify: `public/icons/icon-512.svg`

**Interfaces:**
- Consumes: Tailwind CSS v4 `@theme inline` mapping in `globals.css`.
- Produces: Updated CSS variables `--color-brand-50`..`900`, `--shadow-honey-glow`, updated `APP_CONFIG.name = "BeeRouter"`, and vector bee favicon assets.

- [ ] **Step 1: Update `src/app/globals.css` brand tokens and dark/light variables**

Replace the palette in `src/app/globals.css`:
```css
:root {
  /* Brand scale (Bee & Honey) */
  --color-brand-50: #fffbeb;
  --color-brand-100: #fef3c7;
  --color-brand-200: #fde68a;
  --color-brand-300: #fcd34d;
  --color-brand-400: #fbbf24;
  --color-brand-500: #FFC700;
  --color-brand-600: #f59e0b;
  --color-brand-700: #d97706;
  --color-brand-800: #b45309;
  --color-brand-900: #78350f;

  --color-primary: var(--color-brand-500);
  --color-primary-hover: var(--color-brand-600);

  /* Surfaces & backgrounds (Light - Warm Creamy Honey) */
  --color-bg: #FDFCF7;
  --color-bg-alt: #F7F5EE;
  --color-surface: #ffffff;
  --color-surface-2: #f4f2e9;
  --color-surface-3: #e8e5da;
  --color-sidebar: rgba(247, 245, 238, 0.90);

  /* Borders */
  --color-border: #eae6dc;
  --color-border-subtle: #f2efe8;

  /* Text */
  --color-text: #18181b;
  --color-text-main: #18181b;
  --color-text-muted: #64748b;
  --color-text-subtle: #94a3b8;

  /* Status */
  --color-danger: #ef4444;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;

  /* Radius */
  --radius-brand: 10px;
  --radius-brand-lg: 14px;

  /* Shadows */
  --shadow-soft: 0 1px 2px 0 rgba(0,0,0,0.04);
  --shadow-warm: 0 2px 14px -2px rgba(255, 199, 0, 0.22);
  --shadow-honey-glow: 0 0 20px -2px rgba(255, 199, 0, 0.28);
  --shadow-elevated: 0 12px 28px -4px rgba(60, 50, 45, 0.06);
  --shadow-focus: 0 0 0 3px rgba(255, 199, 0, 0.25);

  color-scheme: light;
}

.dark {
  --color-brand-50: #fffbeb;
  --color-brand-100: #fef3c7;
  --color-brand-200: #fde68a;
  --color-brand-300: #fcd34d;
  --color-brand-400: #fbbf24;
  --color-brand-500: #FFC700;
  --color-brand-600: #f59e0b;
  --color-brand-700: #d97706;
  --color-brand-800: #b45309;
  --color-brand-900: #78350f;

  --color-primary: #FFC700;
  --color-primary-hover: #f59e0b;

  /* Surfaces (Dark - Deep Obsidian & Honeycomb) */
  --color-bg: #0D0E12;
  --color-bg-alt: #12141A;
  --color-surface: #16181F;
  --color-surface-2: #1F222B;
  --color-surface-3: #2A2D39;
  --color-sidebar: rgba(18, 20, 26, 0.90);

  --color-border: #282B37;
  --color-border-subtle: #1E202A;

  --color-text: #f4f4f5;
  --color-text-main: #f4f4f5;
  --color-text-muted: #9ca3af;
  --color-text-subtle: #6b7280;

  --color-danger: #ef4444;
  --color-success: #22c55e;
  --color-warning: #fbbf24;
  --color-info: #60a5fa;

  --shadow-soft: 0 1px 2px 0 rgba(0,0,0,0.35);
  --shadow-warm: 0 2px 14px -2px rgba(255, 199, 0, 0.30);
  --shadow-honey-glow: 0 0 24px -2px rgba(255, 199, 0, 0.35);
  --shadow-elevated: 0 12px 32px -4px rgba(0, 0, 0, 0.65);
  --shadow-focus: 0 0 0 3px rgba(255, 199, 0, 0.25);

  color-scheme: dark;
}
```

- [ ] **Step 2: Update `APP_CONFIG` in `src/shared/constants/config.js` and metadata in `layout.js`**

In `src/shared/constants/config.js`:
```javascript
export const APP_CONFIG = {
  name: "BeeRouter",
  description: "The Smartest AI Hive — Fast AI Routing & Unified Proxy",
  version: pkg.version,
};
```
In `src/app/layout.js`:
```javascript
export const metadata = {
  title: "BeeRouter - AI Gateway & Unified Routing",
  description: "One unified endpoint for all your AI providers. High-performance model routing, quota tracking, and intelligent fallbacks.",
  icons: {
    icon: "/favicon.svg",
  },
};
```

- [ ] **Step 3: Create Vector Bee SVG Favicon (`public/favicon.svg`)**

```xml
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#16181F"/>
  <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="#FFC700" stroke-opacity="0.3"/>
  <!-- Bee Body -->
  <ellipse cx="16" cy="18" rx="6.5" ry="8" fill="url(#bee_yellow)" />
  <!-- Stripes -->
  <path d="M10 15H22" stroke="#16181F" stroke-width="2" stroke-linecap="round"/>
  <path d="M10.5 19H21.5" stroke="#16181F" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 23H20" stroke="#16181F" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Head -->
  <circle cx="16" cy="9.5" r="3.5" fill="#16181F" />
  <!-- Antennae -->
  <path d="M14 7L12 4.5" stroke="#FFC700" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M18 7L20 4.5" stroke="#FFC700" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Wings -->
  <ellipse cx="10" cy="12" rx="4.5" ry="3" fill="#FFFFFF" fill-opacity="0.75" transform="rotate(-30 10 12)"/>
  <ellipse cx="22" cy="12" rx="4.5" ry="3" fill="#FFFFFF" fill-opacity="0.75" transform="rotate(30 22 12)"/>
  <defs>
    <linearGradient id="bee_yellow" x1="16" y1="10" x2="16" y2="26" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFD633"/>
      <stop offset="1" stop-color="#FFC700"/>
    </linearGradient>
  </defs>
</svg>
```

- [ ] **Step 4: Commit Task 1**
```bash
git add src/app/globals.css src/shared/constants/config.js src/app/layout.js src/app/manifest.js public/favicon.svg public/icons/
git commit -m "feat(brand): update design tokens, metadata and bee assets for BeeRouter"
```

---

### Task 2: Core UI Components Redesign (Button, Card, Badge, Input, Toggle, Modal, ThemeToggle)

**Files:**
- Modify: `src/shared/components/Button.js`
- Modify: `src/shared/components/Card.js`
- Modify: `src/shared/components/Badge.js`
- Modify: `src/shared/components/Input.js`
- Modify: `src/shared/components/Toggle.js`
- Modify: `src/shared/components/Modal.js`
- Modify: `src/shared/components/ThemeToggle.js`
- Modify: `src/shared/components/Loading.js`

**Interfaces:**
- Consumes: Tailwind classes and CSS variables from Task 1.
- Produces: Polished interactive primitives with Bumblebee Yellow primary variant, obsidian glass surfaces, and honey glow hover states.

- [ ] **Step 1: Polish `Button.js` variants**
Ensure `primary` variant uses `bg-brand-500 hover:bg-brand-400 text-black font-bold shadow-[0_2px_14px_rgba(255,199,0,0.28)] active:scale-[0.98] transition-all`.

- [ ] **Step 2: Polish `Card.js` & `Badge.js`**
Ensure `Card` uses obsidian surface `bg-surface border-border-subtle hover:border-brand-500/30 hover:shadow-[var(--shadow-honey-glow)]`.
Ensure `Badge` styles support `brand` variant with `bg-brand-500/15 text-brand-500 dark:text-brand-400 border border-brand-500/30 font-medium`.

- [ ] **Step 3: Polish `Input.js` & `Toggle.js`**
Input focus ring: `focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30`.
Toggle checked: `bg-brand-500`.

- [ ] **Step 4: Commit Task 2**
```bash
git add src/shared/components/Button.js src/shared/components/Card.js src/shared/components/Badge.js src/shared/components/Input.js src/shared/components/Toggle.js src/shared/components/Modal.js src/shared/components/ThemeToggle.js src/shared/components/Loading.js
git commit -m "feat(ui): polish core UI primitives with BeeRouter tokens and bumblebee styling"
```

---

### Task 3: Sidebar Navigation, Top Header & Legacy Cleanup

**Files:**
- Modify: `src/shared/components/Sidebar.js`
- Modify: `src/shared/components/Header.js`
- Delete: `src/shared/components/NineRemoteButton.js`
- Delete: `src/shared/components/NineRemotePromoModal.js`

**Interfaces:**
- Consumes: `APP_CONFIG`, Material Symbols icons.
- Produces: Clean sidebar without 9Remote/9English, BeeRouter Logo in header, active indicators with amber bar.

- [ ] **Step 1: Clean up and modernize `Sidebar.js`**
- Replace logo markup with Vector Bee icon and "BeeRouter" typography.
- Update `navItems` with clean names:
  ```javascript
  const navItems = [
    { href: "/dashboard/endpoint", label: "Endpoint & Keys", icon: "key" },
    { href: "/dashboard/providers", label: "Providers", icon: "dns" },
    { href: "/dashboard/combos", label: "Combos & Routing", icon: "layers" },
    { href: "/dashboard/usage", label: "Usage & Stats", icon: "bar_chart" },
    { href: "/dashboard/quota", label: "Quota Tracker", icon: "data_usage" },
    { href: "/dashboard/token-saver", label: "Token Saver", icon: "savings" },
    { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal" },
  ];
  const debugItems = [
    { href: "/dashboard/console-log", label: "Console Log", icon: "dvr" },
    { href: "/dashboard/translator", label: "Translator", icon: "translate" },
  ];
  const systemItems = [
    { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan" },
    { href: "/dashboard/skills", label: "Skills", icon: "extension" },
  ];
  ```
- Remove all 9Remote promo state, buttons, and 9English link.
- Update active link styling: `bg-primary/10 text-primary border-l-2 border-primary font-medium`.

- [ ] **Step 2: Delete legacy 9Remote files**
```bash
rm src/shared/components/NineRemoteButton.js src/shared/components/NineRemotePromoModal.js
```

- [ ] **Step 3: Update `Header.js`**
- Replace breadcrumb separators with subtle mini hexagons `⬡`.
- Update honey status badges and quick search styling.

- [ ] **Step 4: Commit Task 3**
```bash
git add src/shared/components/Sidebar.js src/shared/components/Header.js
git rm src/shared/components/NineRemoteButton.js src/shared/components/NineRemotePromoModal.js
git commit -m "feat(navigation): clean up Sidebar with BeeRouter branding and remove 9remote/9english"
```

---

### Task 4: Landing Page Redesign (Hero, Flow Animation, Features, Footer)

**Files:**
- Modify: `src/app/landing/page.js`
- Modify: `src/app/landing/components/Navigation.js`
- Modify: `src/app/landing/components/HeroSection.js`
- Modify: `src/app/landing/components/FlowAnimation.js`
- Modify: `src/app/landing/components/Features.js`
- Modify: `src/app/landing/components/HowItWorks.js`
- Modify: `src/app/landing/components/GetStarted.js`
- Modify: `src/app/landing/components/Footer.js`

**Interfaces:**
- Consumes: BeeRouter branding, Bumblebee Yellow palette (`#FFC700`), obsidian background (`#0D0E12`).
- Produces: Modern tech landing page with animated honey traffic flow simulator.

- [ ] **Step 1: Update `landing/page.js` and `Navigation.js`**
- Set background to `#0D0E12` with subtle honeycomb grid pattern.
- Update Navigation with BeeRouter logo and Bumblebee "Open Dashboard" button.

- [ ] **Step 2: Update `HeroSection.js` and `FlowAnimation.js`**
- Title: "Unified AI Gateway with Lightning-Fast Routing".
- Update `FlowAnimation.js` node boxes to obsidian glass with golden amber pulse streams.

- [ ] **Step 3: Update `Features.js`, `HowItWorks.js`, `GetStarted.js`, and `Footer.js`**
- Replace coral/orange badges with Bumblebee Yellow/Amber badges.
- Replace bee-router text with BeeRouter.
- Update Footer links and copyright.

- [ ] **Step 4: Commit Task 4**
```bash
git add src/app/landing/
git commit -m "feat(landing): redesign landing page with BeeRouter theme and honeycomb flow animation"
```

---

### Task 5: Login Page & Auth Modal Redesign

**Files:**
- Modify: `src/app/login/page.js`
- Modify: `src/shared/components/OAuthModal.js`
- Modify: `src/shared/components/ModelSelectModal.js`

**Interfaces:**
- Consumes: `globals.css` tokens, `Card`, `Button`, `Input`.
- Produces: Dark obsidian auth card with glowing BeeRouter header and Bumblebee action buttons.

- [ ] **Step 1: Update `src/app/login/page.js`**
- Set title to **BeeRouter** with vector bee icon.
- Style the card with `bg-surface border-border shadow-[var(--shadow-elevated)]`.
- Update login button to primary yellow with high contrast text.

- [ ] **Step 2: Update `OAuthModal.js` and `ModelSelectModal.js`**
- Ensure modal headers, search inputs, provider badges, and confirm buttons match the Bee theme.

- [ ] **Step 3: Commit Task 5**
```bash
git add src/app/login/page.js src/shared/components/OAuthModal.js src/shared/components/ModelSelectModal.js
git commit -m "feat(auth): style login page and auth modals with BeeRouter obsidian & gold aesthetic"
```

---

### Task 6: Dashboard Pages Polish & Recharts Themes

**Files:**
- Modify: `src/shared/components/UsageStats.js`
- Modify: `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js`
- Modify: `src/app/(dashboard)/dashboard/quota/page.js`
- Modify: `src/app/(dashboard)/dashboard/combos/page.js`

**Interfaces:**
- Consumes: Recharts library, `Card`, `Badge`.
- Produces: Usage charts with yellow/amber gradients, rate limit pills, status countdown bars.

- [ ] **Step 1: Update `UsageStats.js` and chart colors**
- Change Recharts gradient stops: `#FFC700` at 0% to `#F59E0B` at 100% with transparent area fills.
- Update metric cards with bright yellow highlights.

- [ ] **Step 2: Update `EndpointPageClient.js` rate limit chips and tunnel pills**
- Style rate limit badges with monospace dark pills and amber border accents.
- Update tunnel status indicators with pulsing green / amber dots.

- [ ] **Step 3: Commit Task 6**
```bash
git add src/shared/components/UsageStats.js src/app/\(dashboard\)/dashboard/endpoint/EndpointPageClient.js src/app/\(dashboard\)/dashboard/quota/ src/app/\(dashboard\)/dashboard/combos/
git commit -m "feat(dashboard): update charts and metric cards with BeeRouter amber gradients"
```

---

### Task 7: Build Verification & End-to-End Visual Check

**Files:**
- Run build check and verify all files.

- [ ] **Step 1: Run Next.js build check**
Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 2: Verify git status and clean branch state**
Run: `git status`
Expected: Working tree clean, all changes committed.

- [ ] **Step 3: Final Commit (if any adjustments)**
```bash
git commit -m "chore: finalize BeeRouter UI redesign build verification"
```
