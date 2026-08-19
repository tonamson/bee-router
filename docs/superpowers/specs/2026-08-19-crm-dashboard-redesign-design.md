# Design Spec: Enterprise CRM Dashboard Redesign

**Date:** 2026-08-19  
**Status:** Approved  
**Style:** Enterprise Modern (Linear / Vercel aesthetic)

---

## 1. Objective & Scope

Refactor and modernize the internal BeeRouter CRM & Dashboard UI to achieve an enterprise-grade developer experience:
- **Clean Aesthetic:** Obsidian dark & warm cream base, refined subtle 1px borders, crisp typography, and honey amber accents.
- **Improved Information Architecture:** Organized navigation hierarchy across Gateway, Analytics, Routing, and System tools.
- **Data-Dense & Actionable Dashboard:** Enhanced KPI metric cards (delta %, trends), modern responsive charts, clean filterable tables.
- **Consistent Reusable Primitives:** Unified buttons, badges, inputs, metrics, and card surfaces across all dashboard views.

---

## 2. Design System & Tokens

### 2.1 Color Palette
- **Backgrounds:**
  - Dark: Deep Obsidian (`#0D0E12`), Subsurface (`#12141A`), Elevated (`#16181F`)
  - Light: Warm Cream (`#FDFCF7`), Subsurface (`#F7F5EE`), Elevated (`#FFFFFF`)
- **Borders & Dividers:** Subtle 1px borders (`#282B37` in dark, `#E5E7EB` in light).
- **Accents:** Bumblebee Yellow / Amber (`#FFC700` primary, `#F59E0B` hover).
- **Status Indicators:** Success (`#22C55E`), Warning (`#F59E0B`), Danger (`#EF4444`), Info (`#3B82F6`).

### 2.2 Typography & Numbers
- High legibility sans-serif for UI labels and headings.
- Tabular figures / monospace formatting for numbers, token counts, latency, and currency metrics.

---

## 3. Architecture & Key Components

### 3.1 Shell & Navigation Layout
- **Sidebar:** Grouped navigation sections (`GATEWAY`, `ANALYTICS & USAGE`, `ROUTING & CONFIG`, `SYSTEM & TOOLS`) with collapsible states, badge counters, and active indicators.
- **Top Header:** Breadcrumb trail, quick environment/status indicator, update available pill, theme toggle, and search shortcut (`⌘K`).

### 3.2 Metric & KPI Cards
- Crisp cards with subtle border highlight on hover.
- Primary metric with unit/currency, secondary trend percentage (e.g. `+12.4% vs last week`), and micro sparklines where applicable.

### 3.3 Analytics & Charts
- Clean charts (using lightweight SVGs / modern chart integration) with amber/gold gradients, seamless tooltips, and timeframe selectors (1h, 24h, 7d, 30d).

### 3.4 Data Grids & Tables
- Sticky table headers, subtle row hover highlighting, status badges, and action dropdowns.

---

## 4. Implementation Strategy (Modular Incremental)

1. **Tokens & Shell Polish:** Update CSS variables and refine `Sidebar.js`, `DashboardLayout.js`, and header navigation.
2. **Component Primitives:** Standardize `MetricCard`, `Table`, `Badge`, `Card`, and `Button` components.
3. **Core Dashboard Pages Refactor:**
   - Overview & Usage (`/dashboard`, `/dashboard/usage`)
   - Analytics & Quotas (`/dashboard/analytics`, `/dashboard/quota`)
   - Providers & Endpoints (`/dashboard/providers`, `/dashboard/endpoint`)
4. **Verification & Regression Testing:** Ensure zero breaking changes to existing API connections, real-time polling, and configuration handlers.
