# Design Spec: Restrict i18n to English and Vietnamese Only

## 1. Overview
This design outlines the cleanup and restriction of multilingual (i18n) support across the **mrouter** (9Router) project, preserving only **English (`en`)** and **Vietnamese (`vi`)**. All other languages (33 translation JSONs, 9 translated README docs, and associated configurations) will be removed to reduce repository bloat, simplify maintenance, and streamline the UI.

---

## 2. Goals & Non-Goals
### Goals
- Support exclusively English (`en` - default) and Vietnamese (`vi`).
- Gracefully handle existing user cookies containing deprecated locales by falling back to `en`.
- Clean up all unused translation literal files (`public/i18n/literals/*.json`).
- Clean up all deprecated README translations in `i18n/` and root `README.zh-CN.md`.
- Update `README.md` language link bar and translation scripts.
- Adjust the `LanguageSwitcher` modal dialog for a balanced 2-language layout.

### Non-Goals
- Modifying core runtime translation engine (`src/i18n/runtime.js` / DOM mutation observer).
- Modifying third-party TTS provider voice language listings (which are independent of UI i18n).

---

## 3. Detailed Changes

### 3.1 Configuration & Constants
- **`src/i18n/config.js`**:
  - `LOCALES`: `["en", "vi"]`
  - `DEFAULT_LOCALE`: `"en"`
  - `LOCALE_NAMES`:
    ```javascript
    export const LOCALE_NAMES = {
      en: "English",
      vi: "Tiếng Việt",
    };
    ```
  - `normalizeLocale(locale)`:
    ```javascript
    export function normalizeLocale(locale) {
      if (locale === "vi" || locale?.startsWith("vi")) {
        return "vi";
      }
      return DEFAULT_LOCALE;
    }
    ```
  - `isSupportedLocale(locale)`: `LOCALES.includes(locale)`

- **`src/shared/constants/locales.js`**:
  - `LOCALE_FLAGS`:
    ```javascript
    export const LOCALE_FLAGS = {
      en: "🇺🇸",
      vi: "🇻🇳",
    };
    ```

### 3.2 UI Components
- **`src/shared/components/LanguageSwitcher.js`**:
  - Update `getLocaleInfo` to retain only `en` and `vi` definitions.
  - Adjust the modal popup styling (max-width, grid / flex layout) to neatly display the 2 language choices side by side without excessive empty space.

### 3.3 File Deletions & Cleanups
- **`public/i18n/literals/`**:
  - Keep: `vi.json`
  - Remove: 33 JSON files (`ar.json`, `bn.json`, `cs.json`, `da.json`, `de.json`, `el.json`, `es.json`, `fa.json`, `fi.json`, `fr.json`, `he.json`, `hi.json`, `hu.json`, `id.json`, `it.json`, `ja.json`, `km.json`, `ko.json`, `nl.json`, `no.json`, `pl.json`, `pt-BR.json`, `pt-PT.json`, `ro.json`, `ru.json`, `sv.json`, `th.json`, `tl.json`, `tr.json`, `uk.json`, `ur.json`, `zh-CN.json`, `zh-TW.json`).
- **`i18n/`**:
  - Keep: `i18n/README.vi.md`
  - Remove: `README.es.md`, `README.fa_IR.md`, `README.fr.md`, `README.id-ID.md`, `README.ja-JP.md`, `README.pt-BR.md`, `README.ru.md`, `README.th.md`, `README.zh-CN.md`.
- **Root Directory**:
  - Remove: `README.zh-CN.md`.

### 3.4 Documentation & Translation Scripts
- **`README.md`**:
  - Update language banner at line 20 to only include `[🇻🇳 Tiếng Việt](./i18n/README.vi.md)`.
- **`scripts/translate-readme.js`**:
  - Update `SUPPORTED_LANGUAGES`:
    ```javascript
    const SUPPORTED_LANGUAGES = {
      vi: 'Vietnamese',
    };
    ```

---

## 4. Verification & Testing
1. **Config & API Check**:
   - Verify `GET` and `POST` to `/api/locale` with valid (`vi`, `en`) and invalid locales (e.g. `zh-CN`, `fr`). Invalid locales should be rejected or normalized to `en`.
2. **UI Verification**:
   - Open Language Switcher modal on Header / Profile.
   - Verify only English and Tiếng Việt are displayed with correct flags (`🇺🇸`, `🇻🇳`).
   - Switch to `vi`, verify translations load from `/i18n/literals/vi.json`.
   - Switch back to `en`, verify instant switch back to English without error.
3. **Build & Asset Check**:
   - Run linter/type checks and test build to ensure no broken imports or missing asset references.
