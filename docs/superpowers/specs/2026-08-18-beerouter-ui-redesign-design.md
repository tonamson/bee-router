# BeeRouter UI Redesign Specification

- **Date:** 2026-08-18
- **Topic:** Full UI/UX Redesign — Transformation from BeeRouter to BeeRouter (Bumblebee & Honey Theme)
- **Status:** Approved by User

---

## 1. Executive Summary & Brand Identity

### 1.1 Overview
This specification details the comprehensive redesign of the frontend application from **BeeRouter** into **BeeRouter**. The project transitions the brand identity, visual style, color palette, navigation hierarchy, component primitives, and all pages to a **Vibrant Bumblebee & Modern Obsidian** theme.

### 1.2 Core Brand Attributes
- **Product Name:** BeeRouter
- **Tagline:** *The Smartest AI Hive — Buzzing-Fast AI Routing & Unified Proxy*
- **Visual Identity:** Modern Cyber Bee & Hexagonal Honeycomb Matrix.
- **Tone & Aesthetic:** High craft (tasteful design), high contrast, vibrant bumblebee yellow accents over deep obsidian glass surfaces, crisp Material Symbols vector icons, and smooth micro-interactions.

---

## 2. Design System & Design Tokens

### 2.1 Color Palette (`src/app/globals.css`)
The color system is organized around the **Bumblebee Yellow** and **Honey Amber** scale, paired with neutral obsidian surfaces for dark mode and warm creamy honeycomb for light mode.

#### Brand Scale (Bumblebee & Honey)
- `--color-brand-50`: `#FFFBEB` (Pollen light)
- `--color-brand-100`: `#FEF3C7` (Soft honey cream)
- `--color-brand-200`: `#FDE68A` (Pastel honey)
- `--color-brand-300`: `#FCD34D` (Bright bee yellow)
- `--color-brand-400`: `#FBBF24` (Amber gold)
- `--color-brand-500` *(Primary)*: `#FFC700` (Bumblebee Yellow — Core Brand Primary)
- `--color-brand-600`: `#F59E0B` (Honey Amber — Hover & Gradient)
- `--color-brand-700`: `#D97706` (Deep Honey Amber)
- `--color-brand-800`: `#B45309` (Honey Bronze)
- `--color-brand-900`: `#78350F` (Dark Beeswax)

#### Dark Mode Surface Tokens (Default & Primary Vibe)
- `--color-bg`: `#0D0E12` (Deep Obsidian Base)
- `--color-bg-alt`: `#12141A` (Subtle Alternative Base)
- `--color-surface`: `#16181F` (Honeycomb Flat Surface)
- `--color-surface-2`: `#1F222B` (Elevated Card / Dropdown Surface)
- `--color-surface-3`: `#2A2D39` (Interactive / Active Surface)
- `--color-sidebar`: `rgba(18, 20, 26, 0.90)` (Translucent Frosted Sidebar)
- `--color-border`: `#282B37` (Crisp Metallic Border)
- `--color-border-subtle`: `#1E202A` (Subtle Internal Divider)
- `--color-text`: `#F4F4F5`
- `--color-text-main`: `#F4F4F5`
- `--color-text-muted`: `#9CA3AF`
- `--color-text-subtle`: `#6B7280`

#### Light Mode Surface Tokens
- `--color-bg`: `#FDFCF7` (Warm Creamy Honey Base)
- `--color-bg-alt`: `#F7F5EE`
- `--color-surface`: `#FFFFFF`
- `--color-surface-2`: `#F4F2E9`
- `--color-surface-3`: `#E8E5DA`
- `--color-sidebar`: `rgba(247, 245, 238, 0.90)`
- `--color-border`: `#EAE6DC`
- `--color-border-subtle`: `#F2EFE8`
- `--color-text-main`: `#18181B`
- `--color-text-muted`: `#64748B`

#### Shadows & Glow Effects
- `--shadow-soft`: `0 1px 2px 0 rgba(0,0,0,0.3)`
- `--shadow-warm`: `0 2px 14px -2px rgba(255, 199, 0, 0.25)`
- `--shadow-honey-glow`: `0 0 20px -2px rgba(255, 199, 0, 0.28)`
- `--shadow-elevated`: `0 12px 32px -4px rgba(0, 0, 0, 0.55)`
- `--shadow-focus`: `0 0 0 3px rgba(255, 199, 0, 0.25)`

---

## 3. Navigation & Layout Architecture

### 3.1 Sidebar Navigation (`src/shared/components/Sidebar.js`)
- **Brand Header:**
  - BeeRouter Vector Logo (Cyber Bee in glowing amber hexagon).
  - Text: **BeeRouter** with version badge and online indicator pill.
- **Clean Menu Items (Icons: Material Symbols vector only, no emojis, clean names):**
  1. `key` — **Endpoint & Keys** (`/dashboard/endpoint`)
  2. `dns` — **Providers** (`/dashboard/providers`)
  3. `perm_media` — **Media Providers** (`/dashboard/media-providers`)
  4. `layers` — **Combos & Routing** (`/dashboard/combos`)
  5. `bar_chart` — **Usage & Stats** (`/dashboard/usage`)
  6. `data_usage` — **Quota Tracker** (`/dashboard/quota`)
  7. `savings` — **Token Saver** (`/dashboard/token-saver`)
  8. `lan` — **Proxy Pools** (`/dashboard/proxy-pools`)
  9. `extension` — **Skills** (`/dashboard/skills`)
  10. `terminal` — **CLI Tools** (`/dashboard/cli-tools`)
  11. `dvr` — **Console Log** (`/dashboard/console-log`)
  12. `translate` — **Translator** (`/dashboard/translator`)
  13. `settings` — **Settings** (`/dashboard/profile`)
- **Removals & Cleanup:**
  - Completely remove `9Remote` button and `NineRemotePromoModal`.
  - Completely remove `9English` external link.
  - Remove all leftover references to bee-router/9remote.

### 3.2 Top Header (`src/shared/components/Header.js`)
- Breadcrumb separators styled with subtle mini hexagons (`⬡`).
- Quick search bar (`⌘K`) with obsidian surface and golden focus ring.
- Hive status pill indicator (`🟢 Hive Active: X Providers Connected`).
- Theme toggle with smooth sun/moon animation and honey yellow accents.

---

## 4. Component Primitives Craft

1. **Button (`Button.js`):**
   - `primary`: `bg-brand-500 hover:bg-brand-400 text-black font-bold shadow-[0_2px_14px_rgba(255,199,0,0.3)] active:scale-[0.98]`
   - `secondary`: `bg-surface-2 hover:bg-surface-3 text-text-main border border-border hover:border-brand-500/40`
   - `ghost`: `text-text-muted hover:text-brand-400 hover:bg-brand-500/10`
2. **Card (`Card.js`):**
   - Obsidian surface (`#16181F`), rounded `14px`, border `#282B37`.
   - Hover effect: `hover:border-brand-500/40 hover:shadow-[var(--shadow-honey-glow)] transition-all`.
3. **Badge (`Badge.js`):**
   - Success / Active: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
   - Warning / Honey: `bg-brand-500/15 text-brand-400 border border-brand-500/30`
   - Danger: `bg-rose-500/10 text-rose-400 border border-rose-500/20`
4. **Inputs & Toggles (`Input.js`, `Toggle.js`):**
   - Dark obsidian background, crisp border, amber glow focus ring.
   - Toggle active state: `bg-brand-500` with white/black toggle knob.
5. **Charts (Recharts in `UsageStats.js` and analytics):**
   - Area & Bar gradients: Bumblebee `#FFC700` $\to$ Honey Amber `#F59E0B` $\to$ Transparent.
   - Dark glass tooltip with yellow border highlight.

---

## 5. Landing Page & Auth Flow Redesign

### 5.1 Landing Page (`src/app/landing/`)
- **Theme:** Deep obsidian background (`#0D0E12`) with subtle honeycomb grid and ambient golden orbs.
- **Hero & Flow Animation:** 
  - Dynamic interactive flow animation: Client Requests $\to$ BeeRouter Hive Core (glowing amber hexagon) $\to$ AI Providers (Claude, OpenAI, Gemini, Codex, DeepSeek).
  - Gold particle stream representing token traffic.
- **Navigation & CTA:**
  - BeeRouter Vector Logo.
  - "Start Free" / "Open Dashboard" button in Bumblebee Yellow.
  - Features, How it works, and Get Started cards updated with obsidian glassmorphism and golden icons.

### 5.2 Login Page (`src/app/login/page.js`)
- Centered obsidian glass card with glowing BeeRouter Vector Logo.
- Slogan: *"Enter the Hive — Sign in to manage your AI Infrastructure"*.
- Sleek inputs with golden focus states and prominent yellow login action button.

---

## 6. Implementation Scope & File Checklist

| Area | File Path | Action |
|------|-----------|--------|
| **Theme & Tokens** | `src/app/globals.css` | Update color scale, dark/light variables, honey glow shadows |
| **Config & Metadata** | `src/shared/constants/config.js` | Rename APP_CONFIG to BeeRouter, update URLs |
| **Layout & SEO** | `src/app/layout.js`, `src/app/manifest.js` | Update title, description, favicon paths |
| **Vector Assets** | `public/favicon.svg`, `public/icons/*` | Create new Cyber Bee SVG favicon and PWA icons |
| **Navigation** | `src/shared/components/Sidebar.js` | Update menu items, add Bee logo, remove 9Remote & 9English |
| **Header** | `src/shared/components/Header.js` | Update breadcrumbs, badges, honey accents |
| **Core Primitives** | `src/shared/components/{Card, Button, Badge, Input, Toggle, Modal, Loading}.js` | Update styling, borders, focus rings, shadows |
| **Cleanup** | `src/shared/components/NineRemoteButton.js`, `NineRemotePromoModal.js` | Delete unused files |
| **Landing Page** | `src/app/landing/**/*` | Update Hero, FlowAnimation, Navigation, Features, Footer |
| **Login Page** | `src/app/login/page.js` | Update branding, auth card styling, inputs, buttons |
| **Dashboard Pages** | `src/app/(dashboard)/dashboard/**/*` | Verify and adjust charts, copy chips, and status pills |

---

## 7. Verification & Quality Gates
1. **Visual Regression & Polish:** Ensure high contrast, crisp borders, no clipped elements, and responsive design across all viewports.
2. **Backward Compatibility:** All existing backend APIs, proxy routing, OAuth flows, and CLI tunnels must continue functioning without disruption.
3. **Dark / Light Mode Integrity:** Seamless switching with optimal readability in both modes.
