# Design Spec: Split-Screen Cyber Login Page Redesign

- **Date**: 2026-08-19
- **Author**: Antigravity & User
- **Status**: Approved
- **Target File**: `src/app/login/page.js`

---

## 1. Overview & Goals

Redesign the BeeRouter login experience (`/login`) from a basic centered card into a modern, high-tech **Split-Screen Cyber UI** that matches the design language of the new Landing Page (`#0D0E12`, `#FFC700`, `#16181F`, neon gradients, glowing borders, and honeycomb ambient effects).

### Core Goals:
1. **Visual Consistency**: Match the developer-first, high-tech aesthetic established across the landing page and dashboard.
2. **Preserve 100% Authentication Functionality**: Retain password login, SAML SSO, OIDC SSO, dual auth modes, rate-limit retry timer, reset hint messages, and forced password change workflow (`mustChangePassword`).
3. **Enhanced Usability**:
   - Add a direct `Back to Home` navigation link.
   - Add password visibility toggle (Show/Hide).
   - Display live gateway status and feature highlights on the left showcase panel.
   - Smooth responsive behavior (desktop split screen $\rightarrow$ seamless centered mobile view).

---

## 2. Layout Architecture

### 2.1 Desktop Layout ($\ge 1024\text{px}$)
Split-screen structure with two complementary panels:
- **Left Panel (Brand & Showcase - ~45% width)**:
  - Fixed background with amber radial glow (`#FFC700`/10) and subtle honeycomb matrix pattern.
  - Brand header with official logo (`/logo.png?v=2`), title `BeeRouter`, and `v1.0 Open Source` badge.
  - Value proposition headline: *"Sub-millisecond AI Traffic Gateway"*.
  - Three live capability pills:
    1. `⚡ Sub-millisecond Overhead`: Local memory proxy engine.
    2. `🛡️ 99.99% Reliability`: Automatic failover cascades across OpenAI, Anthropic, Gemini, and DeepSeek.
    3. `🔒 100% Local SQLite Vault`: Zero cloud telemetry, credentials encrypted on device.
  - Quickstart command box with copy button (`npx @tonamson2/bee-router`).
- **Right Panel (Authentication Form - ~55% width)**:
  - Top bar containing `← Back to Home` button pointing to `/`.
  - Centered glassmorphic login card with refined border glow on focus.
  - Dynamic authentication modes (SAML/OIDC SSO, Password, Forced Password Change).
  - Clean footer with MIT License and GitHub links.

### 2.2 Mobile & Tablet Layout ($< 1024\text{px}$)
- Left panel is hidden.
- Right panel expands to full width with background glow and centered glassmorphism card.
- Top bar displays both the BeeRouter mini logo and the `Back to Home` button.

---

## 3. Component Details & Authentication State Handling

### 3.1 Initial Loading State
- While `hasPassword === null`, render a sleek amber spinner with text `"Connecting to Hive gateway..."`.

### 3.2 SSO Authentication (OIDC & SAML)
- If `oidcConfigured` or `samlConfigured` is enabled, render high-contrast 1-click SSO button(s) with provider icon and customizable label.
- If both SSO and Password are active (`authMode === "both"`), render a clean separator `"Or sign in with password"`.

### 3.3 Password Authentication
- Password input with:
  - Toggle button to show/hide plaintext password.
  - Clear error message banner with icon.
  - Rate-limiting countdown (`Wait Xs`) when locked.
  - Default password hint pill (`Default: 123456`).
  - Forgot password hint explaining how to reset password via host CLI.

### 3.4 Forced Password Change (`mustChangePassword`)
- When user logs in remotely or initial change is required, switch form to New Password setup mode with explanation banner.

---

## 4. Verification & Testing Plan

1. **Build Verification**: Run `npm run build` to ensure zero compilation or bundling errors.
2. **Visual & Responsive Verification**:
   - Check desktop split-screen view ($\ge 1024\text{px}$).
   - Check mobile responsive view ($< 1024\text{px}$).
   - Check password show/hide toggle behavior.
   - Check "Back to Home" navigation link.
3. **Auth Flow Verification**:
   - Test password submit with standard and invalid inputs.
   - Verify error display and rate limit timer rendering.
