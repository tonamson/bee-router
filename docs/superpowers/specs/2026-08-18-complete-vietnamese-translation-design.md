# Design Spec: Comprehensive Vietnamese Translation Coverage

## 1. Overview
This design outlines the complete localization coverage for the Vietnamese language (`vi`) across the entire **mrouter** (9Router / BeeRouter) web application. It upgrades the client-side runtime translation engine to support attribute translations (placeholders, titles, aria-labels) and expands the Vietnamese dictionary (`public/i18n/literals/vi.json`) to comprehensively cover the Landing page, Dashboard, Providers, Token Saver, Endpoint, CLI Tools, Usage/Analytics, Profile/SSO, and Auth/Login pages.

---

## 2. Goals & Non-Goals

### Goals
- Comprehensive coverage of all UI texts, labels, descriptions, button labels, toasts, modals, and input placeholders in Vietnamese.
- Preserve standard technical terminology (API Key, Provider, Token, Model, Endpoint, CLI, Proxy, Fallback, RTK, OIDC, SAML, Webhook).
- Enhance `src/i18n/runtime.js` to dynamically translate attributes (`placeholder`, `title`, `aria-label`) on elements during initial scan and dynamic mutations.
- Maintain reversible, high-performance DOM manipulation with zero page reload required.
- Maintain clean, alphabetical key sorting in `public/i18n/literals/vi.json` for maintainability.

### Non-Goals
- Changing the existing runtime i18n architecture to heavy external libraries.
- Translating code blocks, logs, or raw JSON payloads (which must remain in original formatting).

---

## 3. Detailed Architecture & Design

### 3.1 Runtime i18n Enhancement (`src/i18n/runtime.js`)
Currently, `runtime.js` only processes `Node.TEXT_NODE`. We will enhance it to:
1. **Attribute Translations**:
   - Translate `placeholder`, `title`, and `aria-label` attributes on HTML elements (`HTMLInputElement`, `HTMLTextAreaElement`, `HTMLButtonElement`, etc.).
   - Cache original values on DOM nodes (`_originalPlaceholder`, `_originalTitle`, `_originalAriaLabel`) to enable dynamic switching back to English without reload.
2. **Dynamic Mutation Support**:
   - Update `MutationObserver` to observe attribute changes and translate newly added elements or altered attributes.
3. **Skip Directives**:
   - Strictly honor `data-i18n-skip="true"` and skip tags (`script`, `style`, `code`, `pre`).

### 3.2 Vietnamese Dictionary Architecture (`public/i18n/literals/vi.json`)
The dictionary will be expanded across 9 major application modules:
1. **Landing Page**:
   - Navigation links, Hero headlines, subheadings, CTA buttons, Flow Animation steps, Feature cards, "How It Works" steps, Footer navigation.
2. **App Shell & Layout**:
   - Sidebar navigation items, Header actions, Breadcrumbs, Status indicators, Theme toggles.
3. **Dashboard Overview**:
   - Metric cards (Total Requests, Total Tokens, Cost Saved, Active Providers), charts, period selectors, quick actions.
4. **Providers & Models**:
   - Provider lists, status badges, Add/Edit Provider modal, Codex bulk import modal, model selectors, connection testing feedback.
5. **Token Saver & Optimization**:
   - RTK compression controls, Headroom Proxy controls & install dialogs, Caveman compression modes, Ponytail, Pxpipe streaming settings.
6. **Endpoint, MITM & CLI Tools**:
   - Cloudflare tunnel controls, remote endpoint URLs, Cursor / Cline / Claude Code connection copy guides, MITM configuration.
7. **Usage & Analytics**:
   - Provider quota progress bars, usage graphs, reset cycles, quota alerts.
8. **Profile, Settings & SSO**:
   - Password changes, Database export/import, Outbound proxy configuration, OIDC and SAML 2.0 Identity Provider setup guides and test modals.
9. **Authentication & Onboarding**:
   - Login form, validation messages, initial admin account setup wizard.

---

## 4. Quality & Terminology Standards
- Technical terms kept as industry standard:
  - `API Key`, `Provider`, `Token`, `Model`, `Endpoint`, `CLI`, `Proxy`, `Fallback`, `RTK`, `Headroom`, `OIDC`, `SAML`, `MITM`.
- Natural, professional Vietnamese phrasing for user guidance:
  - e.g., *"Save 20-40% tokens with RTK"* -> *"Tiết kiệm 20-40% token với RTK"*
  - e.g., *"Connect All AI Code Tools"* -> *"Kết nối toàn bộ công cụ AI Code"*
  - e.g., *"Test Connection"* -> *"Kiểm tra kết nối"*
  - e.g., *"Copy to clipboard"* -> *"Sao chép vào clipboard"*

---

## 5. Verification & Testing Plan
1. **Extraction & Coverage Verification**:
   - Verify every UI string in `src/app/` and `src/shared/` has an exact match in `vi.json`.
2. **Attribute Translation Verification**:
   - Verify input fields (e.g. `Search providers...`, `Enter API key...`) display translated placeholders when locale is `vi`.
3. **Dynamic Switch Verification**:
   - Switch between `vi` and `en` without refreshing the page. Verify all text and placeholders change cleanly in both directions.
4. **Build & Lint Verification**:
   - Verify valid JSON formatting and clean Next.js build.
