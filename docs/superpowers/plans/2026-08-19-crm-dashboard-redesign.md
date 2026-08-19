# CRM Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize and elevate the BeeRouter CRM dashboard interface with an Obsidian-theme Linear/Vercel design system, clean KPI analytics, and refined navigation.

**Architecture:** Update global design tokens, extract unified UI primitives (cards, metrics, badges), refactor the shell (Sidebar & Dashboard Layout), and polish the Usage/Analytics pages.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS / Vanilla CSS Variables, Lucide React Icons.

## Global Constraints
- Do not break existing API calls, event handlers, or telemetry tracking.
- Maintain full dark mode and light mode compatibility.
- Ensure high accessibility and responsive layout across desktop breakpoints.

---

### Task 1: Design Tokens & CSS Variables Polish

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: CSS variables for surfaces (`--bg-surface`, `--bg-elevated`, `--border-subtle`, `--accent-primary`, `--accent-hover`)

- [x] **Step 1: Check existing CSS variables and themes**
- [x] **Step 2: Update `src/app/globals.css` with Linear-inspired Obsidian & Amber color tokens**
- [x] **Step 3: Verify CSS builds cleanly without errors**

---

### Task 2: Refactor Shell Navigation (Sidebar & Header)

**Files:**
- Modify: `src/shared/components/Sidebar.js`
- Modify: `src/shared/components/DashboardLayout.js`

**Interfaces:**
- Consumes: Navigation config and update status
- Produces: Grouped sidebar navigation with modern icons, active pill indicators, and header breadcrumbs

- [x] **Step 1: Update `Sidebar.js` to group links into Gateway, Analytics & Usage, Routing, and System**
- [x] **Step 2: Modernize update banner and version info in Sidebar**
- [x] **Step 3: Update `DashboardLayout.js` header with clean breadcrumb and status indicators**
- [x] **Step 4: Verify navigation links and mobile drawer behavior**

---

### Task 3: Modernize Core KPI Cards & Usage Analytics Views

**Files:**
- Modify: `src/app/(dashboard)/dashboard/usage/page.js`
- Modify: `src/app/(dashboard)/dashboard/usage/components/UsageChart.js`
- Modify: `src/app/(dashboard)/dashboard/analytics/page.js`

**Interfaces:**
- Consumes: `/api/usage` & `/api/analytics` data
- Produces: Polished metric cards (with % delta, formatted numbers) and clean gradient charts

- [x] **Step 1: Refactor KPI metrics cards with crisp borders and delta badge formatting**
- [x] **Step 2: Streamline `UsageChart.js` with smooth amber/obsidian styling and tooltips**
- [x] **Step 3: Verify data loading, empty states, and timeframe filtering**

---

### Task 4: Polish Quotas & Providers Grid Views

**Files:**
- Modify: `src/app/(dashboard)/dashboard/quota/page.js`
- Modify: `src/app/(dashboard)/dashboard/providers/page.js`

**Interfaces:**
- Consumes: Providers and quota config APIs
- Produces: Enterprise data-dense cards with status indicators and action buttons

- [x] **Step 1: Update Quotas view with clean progress indicators and usage bars**
- [x] **Step 2: Refactor Providers cards with latency indicators, model tags, and action menus**
- [x] **Step 3: End-to-end visual review of dashboard views**
