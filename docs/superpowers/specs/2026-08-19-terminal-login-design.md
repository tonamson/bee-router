# Design Spec: High-Tech Terminal Deck Login Page

- **Date**: 2026-08-19
- **Author**: Antigravity & User
- **Status**: Approved
- **Target File**: `src/app/login/page.js`

---

## 1. Overview & Goals

Replace the split-screen login layout with a centered **High-Tech Developer Terminal Deck UI** (`/login`). This design embraces a command-line interface aesthetic (macOS/Linux terminal window with window controls, CLI prompt streams, monospaced typography, and amber cyber highlights) while retaining 100% of BeeRouter's authentication mechanics.

### Core Goals:
1. **Developer-First Aesthetic**: Modern, centered terminal deck featuring window controls (red/yellow/green dots), CLI-style prompts, and status feeds.
2. **Preserve 100% Auth Capabilities**:
   - Password login with rate-limiting countdown, reset hint, and default password pill (`123456`).
   - Show/Hide password toggle visibility button.
   - OIDC SSO and SAML SSO 1-click authentication triggers.
   - Forced password change flow (`mustChangePassword`).
   - Initial loading probe (`hasPassword === null`).
3. **100% English Copy & Accurate Brand Assets**:
   - Use official `/logo.png?v=2` image.
   - Accurate `@tonamson2/bee-router` npm package references.

---

## 2. Layout & UI Structure

### 2.1 Outer Shell
- Centered container on `#0D0E12` background with animated honeycomb ambient aura and golden radial glow.
- Top bar with:
  - `← Back to Home` link on top-left.
  - `⚡ Gateway Live • Port 20128` status badge on top-right.

### 2.2 Terminal Window (`max-w-xl` ~560px)
- **Window Header**:
  - 3 macOS window buttons (`#FF5F56`, `#FFBD2E`, `#27C93F`).
  - Terminal title: `bash — bee-router auth v1.0` with lock icon.
  - Connection tag: `local:20128`.
- **Window Body**:
  - Header with official logo (`/logo.png?v=2`), version badge `v1.0`, and system stream lines:
    ```bash
    > Initializing encrypted local session...
    > Hive gateway ready on http://localhost:20128
    > Mode: Local SQLite Vault [Encrypted]
    ```
  - SSO Buttons (if SAML/OIDC configured) with terminal styled borders.
  - Form prompt: `user@bee-router:~$ auth --key`
  - Input field with Show/Hide toggle, monospaced font, amber focus ring.
  - Submit Button: `[ Authenticate ↵ ]` in bold golden amber (`bg-[#FFC700] hover:bg-[#FFD633] text-black`).
  - Error/Rate-limit output in CLI format (`[!] Error: ...`, `[!] Rate limit: Retry in Xs`).
  - Reset hint and default password pill (`Default key: 123456`).
  - Forced change form (`user@bee-router:~$ passwd --new`).
- **Window Footer**:
  - Quick CLI copy box (`$ npx @tonamson2/bee-router`).
  - Copyright line: `BeeRouter Open Source AI Gateway • MIT License`.

---

## 3. Verification & Testing Plan

1. **Build Verification**: Run `npm run build` to confirm zero compilation or static generation errors.
2. **Feature Testing**:
   - Password authentication with valid/invalid inputs.
   - Show/Hide password toggle function.
   - Rate limit timer countdown behavior.
   - Back to Home navigation link to `/`.
   - Copyable CLI command button.
