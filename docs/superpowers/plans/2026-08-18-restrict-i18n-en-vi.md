# Restrict i18n to English and Vietnamese Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict application multilingual (i18n) support to only English (`en`) and Vietnamese (`vi`), removing 33 unused literal translation files, 9 deprecated README translations, and cleaning up UI switchers and configuration.

**Architecture:** Update `src/i18n/config.js` and `src/shared/constants/locales.js` to define only `en` and `vi` as supported locales with safe fallback. Purge unused JSON assets from `public/i18n/literals/` and markdown files from `i18n/`. Adapt `LanguageSwitcher.js` component to render the 2 supported languages cleanly.

**Tech Stack:** Next.js, React, JavaScript (ESM/Node.js).

## Global Constraints

- Supported locales are strictly `["en", "vi"]` with default `en`.
- Fallback any legacy or unsupported locale safely to `DEFAULT_LOCALE` (`en`).
- Preserve `public/i18n/literals/vi.json` intact.
- Preserve `i18n/README.vi.md` intact.

---

### Task 1: Update i18n Configuration and Constants

**Files:**
- Modify: `src/i18n/config.js`
- Modify: `src/shared/constants/locales.js`
- Test: `node -e "import('./src/i18n/config.js').then(m => { console.log(m.LOCALES, m.normalizeLocale('zh'), m.normalizeLocale('vi')); })"`

**Interfaces:**
- Consumes: None
- Produces:
  - `LOCALES`: `["en", "vi"]`
  - `DEFAULT_LOCALE`: `"en"`
  - `LOCALE_COOKIE`: `"locale"`
  - `LOCALE_NAMES`: `{ en: "English", vi: "Tiếng Việt" }`
  - `normalizeLocale(locale: string): string`
  - `isSupportedLocale(locale: string): boolean`
  - `LOCALE_FLAGS`: `{ en: "🇺🇸", vi: "🇻🇳" }`

- [ ] **Step 1: Update `src/i18n/config.js`**

Replace `src/i18n/config.js` with:
```javascript
export const LOCALES = ["en", "vi"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "locale";

export const LOCALE_NAMES = {
  en: "English",
  vi: "Tiếng Việt",
};

export function normalizeLocale(locale) {
  if (locale === "vi" || (typeof locale === "string" && locale.startsWith("vi"))) {
    return "vi";
  }
  return DEFAULT_LOCALE;
}

export function isSupportedLocale(locale) {
  return LOCALES.includes(locale);
}
```

- [ ] **Step 2: Update `src/shared/constants/locales.js`**

Replace `src/shared/constants/locales.js` with:
```javascript
// Centralized locale display flags (shared across UI components)
export const LOCALE_FLAGS = {
  en: "🇺🇸",
  vi: "🇻🇳",
};
```

- [ ] **Step 3: Run node evaluation to verify config and normalization**

Run:
```bash
node --input-type=module -e "import { LOCALES, normalizeLocale, isSupportedLocale } from './src/i18n/config.js'; import { LOCALE_FLAGS } from './src/shared/constants/locales.js'; if (LOCALES.length !== 2 || normalizeLocale('zh') !== 'en' || normalizeLocale('vi-VN') !== 'vi' || !isSupportedLocale('vi') || isSupportedLocale('ja') || !LOCALE_FLAGS.vi) throw new Error('Config verification failed'); console.log('Config verification passed');"
```
Expected: `Config verification passed`

- [ ] **Step 4: Commit changes**

```bash
git add src/i18n/config.js src/shared/constants/locales.js
git commit -m "refactor(i18n): restrict supported locales to en and vi"
```

---

### Task 2: Purge Deprecated Translation Literals in `public/i18n/literals`

**Files:**
- Delete: 33 json files in `public/i18n/literals/` (`ar.json`, `bn.json`, `cs.json`, `da.json`, `de.json`, `el.json`, `es.json`, `fa.json`, `fi.json`, `fr.json`, `he.json`, `hi.json`, `hu.json`, `id.json`, `it.json`, `ja.json`, `km.json`, `ko.json`, `nl.json`, `no.json`, `pl.json`, `pt-BR.json`, `pt-PT.json`, `ro.json`, `ru.json`, `sv.json`, `th.json`, `tl.json`, `tr.json`, `uk.json`, `ur.json`, `zh-CN.json`, `zh-TW.json`)
- Preserve: `public/i18n/literals/vi.json`

**Interfaces:**
- Consumes: `public/i18n/literals/`
- Produces: Only `vi.json` exists in `public/i18n/literals/`

- [ ] **Step 1: Delete non-vi translation json files**

Run:
```bash
find public/i18n/literals -type f -name "*.json" ! -name "vi.json" -delete
```

- [ ] **Step 2: Verify only `vi.json` remains in `public/i18n/literals`**

Run:
```bash
ls public/i18n/literals
```
Expected: `vi.json`

- [ ] **Step 3: Commit deletion**

```bash
git add public/i18n/literals
git commit -m "chore(i18n): remove unused translation literal JSON files"
```

---

### Task 3: Clean Up READMEs and Translation Scripts

**Files:**
- Delete: `i18n/README.es.md`, `i18n/README.fa_IR.md`, `i18n/README.fr.md`, `i18n/README.id-ID.md`, `i18n/README.ja-JP.md`, `i18n/README.pt-BR.md`, `i18n/README.ru.md`, `i18n/README.th.md`, `i18n/README.zh-CN.md`, `README.zh-CN.md`
- Preserve: `i18n/README.vi.md`
- Modify: `README.md:20`
- Modify: `scripts/translate-readme.js:14-18`

**Interfaces:**
- Consumes: None
- Produces: Cleaned documentation and single-target translation script

- [ ] **Step 1: Delete deprecated README translations**

Run:
```bash
rm -f i18n/README.es.md i18n/README.fa_IR.md i18n/README.fr.md i18n/README.id-ID.md i18n/README.ja-JP.md i18n/README.pt-BR.md i18n/README.ru.md i18n/README.th.md i18n/README.zh-CN.md README.zh-CN.md
```

- [ ] **Step 2: Update language links banner in `README.md`**

In `README.md`, update line 20:
From:
```markdown
[🇧🇷 Português (Brasil)](./i18n/README.pt-BR.md) • [🇻🇳 Tiếng Việt](./i18n/README.vi.md) • [🇨🇳 中文](./i18n/README.zh-CN.md) • [🇯🇵 日本語](./i18n/README.ja-JP.md) • [🇷🇺 Русский](./i18n/README.ru.md) • [🇹🇭 ไทย](./i18n/README.th.md) • [🇮🇷 فارسی](./i18n/README.fa_IR.md) • [🇮🇩 Indonesia](./i18n/README.id-ID.md) • [🇪🇸 Español](./i18n/README.es.md) • [🇫🇷 Français](./i18n/README.fr.md)
```
To:
```markdown
[🇻🇳 Tiếng Việt](./i18n/README.vi.md)
```

- [ ] **Step 3: Update `scripts/translate-readme.js`**

In `scripts/translate-readme.js`, replace lines 14-18:
```javascript
const SUPPORTED_LANGUAGES = {
  vi: 'Vietnamese'
};
```

- [ ] **Step 4: Verify remaining files in `i18n/`**

Run:
```bash
ls i18n
```
Expected: `README.vi.md`

- [ ] **Step 5: Commit changes**

```bash
git add i18n README.md scripts/translate-readme.js
git rm -f README.zh-CN.md 2>/dev/null || true
git commit -m "docs(i18n): remove deprecated translations and update README links"
```

---

### Task 4: Adapt `LanguageSwitcher` Component

**Files:**
- Modify: `src/shared/components/LanguageSwitcher.js`

**Interfaces:**
- Consumes: `LOCALES`, `LOCALE_COOKIE`, `normalizeLocale` from `@/i18n/config`, `reloadTranslations` from `@/i18n/runtime`
- Produces: Clean 2-item language selector modal

- [ ] **Step 1: Update `LanguageSwitcher.js`**

Update `src/shared/components/LanguageSwitcher.js`:
```javascript
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LOCALES, LOCALE_COOKIE, normalizeLocale } from "@/i18n/config";
import { reloadTranslations } from "@/i18n/runtime";

function getLocaleFromCookie() {
  if (typeof document === "undefined") return "en";
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith(`${LOCALE_COOKIE}=`));
  const value = cookie ? decodeURIComponent(cookie.split("=")[1]) : "en";
  return normalizeLocale(value);
}

// Locale display names and flags
const getLocaleInfo = (locale) => {
  const locales = {
    en: { name: "English", flag: "🇺🇸" },
    vi: { name: "Tiếng Việt", flag: "🇻🇳" },
  };
  return locales[locale] || { name: locale, flag: "🌐" };
};

export default function LanguageSwitcher({ className = "", isOpen: controlledOpen, onClose, hideTrigger = false }) {
  const [locale, setLocale] = useState("en");
  const [isPending, setIsPending] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const modalRef = useRef(null);

  const isControlled = typeof controlledOpen === "boolean";
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (value, nextLocale = locale) => {
    if (isControlled) {
      if (!value && onClose) onClose(nextLocale);
    } else {
      setInternalOpen(value);
    }
  };

  useEffect(() => {
    setLocale(getLocaleFromCookie());
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSetLocale = async (nextLocale) => {
    if (nextLocale === locale || isPending) return;

    setIsPending(true);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      
      // Reload translations without full page reload
      await reloadTranslations();
      setLocale(nextLocale);
      setIsOpen(false, nextLocale);
    } catch (err) {
      console.error("Failed to set locale:", err);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={className}>
      {/* Trigger button */}
      {!hideTrigger && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:text-text-main hover:bg-surface/60 transition-colors"
          title="Language"
          data-i18n-skip="true"
        >
          <span className="material-symbols-outlined text-[20px]">language</span>
          <span className="text-sm font-medium">{getLocaleInfo(locale).name}</span>
          <span className="text-lg">{getLocaleInfo(locale).flag}</span>
        </button>
      )}

      {/* Portal modal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-i18n-skip="true">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal content */}
          <div
            ref={modalRef}
            className="relative w-full bg-surface border border-black/10 dark:border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-w-md flex flex-col"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-3 border-b border-black/5 dark:border-white/5">
              <h2 className="text-lg font-semibold text-text-main">Select Language</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                {LOCALES.map((item) => {
                  const active = locale === item;
                  const info = getLocaleInfo(item);
                  return (
                    <button
                      key={item}
                      onClick={() => handleSetLocale(item)}
                      disabled={isPending}
                      className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl text-sm font-medium transition-colors w-full border ${
                        active
                          ? "bg-primary/15 text-primary border-primary ring-1 ring-primary"
                          : "border-black/5 dark:border-white/5 text-text-main hover:bg-black/5 dark:hover:bg-white/5"
                      } ${isPending ? "opacity-70 cursor-wait" : ""}`}
                      title={info.name}
                    >
                      <span className="text-3xl">{info.flag}</span>
                      <span className="text-center font-medium">{info.name}</span>
                      {active && (
                        <span className="material-symbols-outlined text-base text-primary">check</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/shared/components/LanguageSwitcher.js
git commit -m "refactor(ui): update LanguageSwitcher layout for 2-locale selection"
```

---

### Task 5: Integration Verification & Build Test

**Files:**
- Test: All modified files and API endpoints

- [ ] **Step 1: Run comprehensive locale config and API verification script**

Run:
```bash
node --input-type=module -e "
import { LOCALES, DEFAULT_LOCALE, normalizeLocale, isSupportedLocale } from './src/i18n/config.js';
import { LOCALE_FLAGS } from './src/shared/constants/locales.js';
import fs from 'node:fs';

console.log('Testing LOCALES:', LOCALES);
if (LOCALES.length !== 2 || !LOCALES.includes('en') || !LOCALES.includes('vi')) throw new Error('LOCALES mismatch');

console.log('Testing normalizeLocale:');
if (normalizeLocale('en') !== 'en') throw new Error('en normalization failed');
if (normalizeLocale('vi') !== 'vi') throw new Error('vi normalization failed');
if (normalizeLocale('vi-VN') !== 'vi') throw new Error('vi-VN normalization failed');
if (normalizeLocale('zh-CN') !== 'en') throw new Error('zh-CN fallback failed');
if (normalizeLocale('fr') !== 'en') throw new Error('fr fallback failed');

console.log('Testing isSupportedLocale:');
if (!isSupportedLocale('en') || !isSupportedLocale('vi') || isSupportedLocale('zh-CN')) throw new Error('isSupportedLocale failed');

console.log('Testing LOCALE_FLAGS:');
if (LOCALE_FLAGS.en !== '🇺🇸' || LOCALE_FLAGS.vi !== '🇻🇳' || Object.keys(LOCALE_FLAGS).length !== 2) throw new Error('LOCALE_FLAGS mismatch');

console.log('Checking literals directory:');
const literals = fs.readdirSync('public/i18n/literals');
if (literals.length !== 1 || literals[0] !== 'vi.json') throw new Error('public/i18n/literals has unexpected files: ' + literals.join(', '));

console.log('All verification assertions passed!');
"
```
Expected: `All verification assertions passed!`

- [ ] **Step 2: Run npm lint or build check if available**

Run:
```bash
npm run build --dry-run || npm test || node -c src/i18n/config.js
```
Expected: Command exits with status 0.

- [ ] **Step 3: Final git status check**

Run:
```bash
git status
```
Expected: Clean working tree on modified i18n files.
