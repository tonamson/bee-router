# Comprehensive Vietnamese Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide 100% comprehensive Vietnamese localization coverage across the entire application by upgrading runtime i18n to translate attributes (placeholders, titles) and expanding the Vietnamese dictionary (`public/i18n/literals/vi.json`) across all modules.

**Architecture:** Enhance `src/i18n/runtime.js` to process and observe both text nodes and element attributes (`placeholder`, `title`, `aria-label`) with original attribute caching. Expand `public/i18n/literals/vi.json` with accurate, natural translations for Landing Page, Navigation, Dashboard, Providers, Token Saver, Endpoint, CLI Tools, Usage, Profile/SSO, and Auth.

**Tech Stack:** Next.js, React, DOM MutationObserver, TreeWalker, JSON.

## Global Constraints

- Technical terms (`API Key`, `Provider`, `Token`, `Model`, `Endpoint`, `CLI`, `Proxy`, `Fallback`, `RTK`, `OIDC`, `SAML`, `MITM`) are preserved in standard industry terminology.
- All JSON keys in `public/i18n/literals/vi.json` must be sorted alphabetically.
- Runtime translation must support seamless instant switching between `en` and `vi` without page reload.
- Elements with `data-i18n-skip="true"` and tags like `script`, `style`, `code`, `pre` must never be modified.

---

### Task 1: Enhance Runtime i18n to Translate Element Attributes

**Files:**
- Modify: `src/i18n/runtime.js`
- Test: Node/DOM evaluation test script

**Interfaces:**
- Consumes: `DEFAULT_LOCALE`, `LOCALE_COOKIE`, `normalizeLocale` from `./config`
- Produces: Enhanced `initRuntimeI18n()`, `translate()`, `reloadTranslations()` supporting attributes (`placeholder`, `title`, `aria-label`)

- [ ] **Step 1: Update `src/i18n/runtime.js` to translate element attributes**

Update `src/i18n/runtime.js` to process attributes and observe attribute mutations:
```javascript
"use client";

import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale } from "./config";

let translationMap = {};
let currentLocale = DEFAULT_LOCALE;
let reloadCallbacks = [];

// Read locale from cookie
function getLocaleFromCookie() {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith(`${LOCALE_COOKIE}=`));
  const value = cookie ? decodeURIComponent(cookie.split("=")[1]) : DEFAULT_LOCALE;
  return normalizeLocale(value);
}

// Load translation map
async function loadTranslations(locale) {
  if (locale === "en") {
    translationMap = {};
    return;
  }
  
  try {
    const response = await fetch(`/i18n/literals/${locale}.json`);
    translationMap = await response.json();
  } catch (err) {
    console.error("Failed to load translations:", err);
    translationMap = {};
  }
}

// Translate text - exported for use in components
export function translate(text) {
  if (!text || typeof text !== "string") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (currentLocale === "en") return text;
  return translationMap[trimmed] || text;
}

// Get current locale - exported for use in components
export function getCurrentLocale() {
  return currentLocale;
}

// Register callback for locale changes
export function onLocaleChange(callback) {
  reloadCallbacks.push(callback);
  return () => {
    reloadCallbacks = reloadCallbacks.filter(cb => cb !== callback);
  };
}

function shouldSkipElement(element) {
  if (!element) return true;
  let cur = element;
  while (cur) {
    if (cur.hasAttribute && cur.hasAttribute("data-i18n-skip")) {
      return true;
    }
    cur = cur.parentElement;
  }
  const tagName = element.tagName?.toLowerCase();
  const skipTags = ["script", "style", "code", "pre"];
  return skipTags.includes(tagName);
}

// Process text node
function processTextNode(node) {
  if (!node.nodeValue || !node.nodeValue.trim()) return;
  const parent = node.parentElement;
  if (!parent || shouldSkipElement(parent)) return;

  const tagName = parent.tagName?.toLowerCase();
  const skipParentTags = [
    "colgroup", "table", "thead", "tbody", "tfoot", "tr",
    "select", "datalist", "optgroup"
  ];
  if (skipParentTags.includes(tagName)) return;

  if (!node._originalText) {
    node._originalText = node.nodeValue;
  }

  const original = node._originalText;
  const translated = currentLocale === "en" ? original : translate(original);

  if (translated !== node.nodeValue) {
    node.nodeValue = translated;
  }
}

// Process element attributes (placeholder, title, aria-label)
function processElementAttributes(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE || shouldSkipElement(element)) return;

  const attrs = ["placeholder", "title", "aria-label"];
  for (const attr of attrs) {
    if (element.hasAttribute(attr)) {
      const propKey = `_original_${attr}`;
      if (!element[propKey]) {
        element[propKey] = element.getAttribute(attr);
      }
      const original = element[propKey];
      if (original && original.trim()) {
        const translated = currentLocale === "en" ? original : translate(original);
        if (translated !== element.getAttribute(attr)) {
          element.setAttribute(attr, translated);
        }
      }
    }
  }
}

// Process all text nodes and attributes in element
function processElement(element) {
  if (!element) return;
  if (element.nodeType === Node.ELEMENT_NODE) {
    processElementAttributes(element);
  }

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  const nodesToProcess = [];
  while ((node = walker.nextNode())) {
    nodesToProcess.push(node);
  }
  nodesToProcess.forEach(processTextNode);

  if (element.querySelectorAll) {
    const elementsWithAttrs = element.querySelectorAll("[placeholder], [title], [aria-label]");
    elementsWithAttrs.forEach(processElementAttributes);
  }
}

// Initialize runtime i18n
export async function initRuntimeI18n() {
  if (typeof window === "undefined") return;

  currentLocale = getLocaleFromCookie();
  await loadTranslations(currentLocale);

  processElement(document.body);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processElement(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
          }
        });
      } else if (mutation.type === "attributes") {
        if (mutation.target.nodeType === Node.ELEMENT_NODE) {
          processElementAttributes(mutation.target);
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label"],
  });
}

// Reload translations when locale changes
export async function reloadTranslations() {
  currentLocale = getLocaleFromCookie();
  await loadTranslations(currentLocale);

  reloadCallbacks.forEach(callback => callback());
  processElement(document.body);
}
```

- [ ] **Step 2: Syntax verification**

Run:
```bash
node -c src/i18n/runtime.js
```
Expected: Exits with code 0.

- [ ] **Step 3: Commit changes**

```bash
git add src/i18n/runtime.js
git commit -m "feat(i18n): extend runtime engine to translate placeholder, title, and aria-label attributes"
```

---

### Task 2: Add Vietnamese Translations for Landing Page & App Navigation

**Files:**
- Modify: `public/i18n/literals/vi.json`

**Interfaces:**
- Consumes: Current `public/i18n/literals/vi.json`
- Produces: Expanded `vi.json` containing all Landing page and Navigation text strings.

- [ ] **Step 1: Update `public/i18n/literals/vi.json` with Landing Page & Navigation strings**

Add translations for:
- Hero headlines, badges, subtitles, CTA buttons (*"Never stop coding"*, *"Save 20-40% tokens with RTK + auto-fallback to FREE & cheap AI models"*, *"Connect All AI Code Tools"*, *"Get Started Free"*, *"View on GitHub"*, *"Open Dashboard"*, etc.)
- Features section (*"Zero Configuration"*, *"Cost Optimization"*, *"Intelligent Routing"*, *"Multi-Account Balance"*, *"High Availability"*, etc.)
- Flow Animation and "How It Works" steps (*"Your CLI Tool"*, *"Smart Router"*, *"Quota tracking & Token compression"*, *"Upstream AI Providers"*, etc.)
- Navigation & Footer (*"Quick Start"*, *"Features"*, *"Setup Guide"*, *"Website"*, *"Documentation"*, *"Privacy Policy"*, *"Terms of Service"*, *"All rights reserved"*).

- [ ] **Step 2: Verify JSON formatting**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('public/i18n/literals/vi.json', 'utf8')); console.log('Valid JSON');"
```
Expected: `Valid JSON`

- [ ] **Step 3: Commit changes**

```bash
git add public/i18n/literals/vi.json
git commit -m "feat(i18n): add comprehensive Vietnamese translations for Landing Page and Navigation"
```

---

### Task 3: Add Vietnamese Translations for Dashboard, Providers & Usage Analytics

**Files:**
- Modify: `public/i18n/literals/vi.json`

**Interfaces:**
- Consumes: `public/i18n/literals/vi.json`
- Produces: Expanded `vi.json` covering Dashboard overview metrics, Providers management, Codex import, and Usage Analytics.

- [ ] **Step 1: Update `public/i18n/literals/vi.json` with Dashboard, Providers, and Usage strings**

Add translations for:
- Metric cards: *"Total Requests"*, *"Total Tokens Saved"*, *"Cost Reduction"*, *"Active Providers"*, *"Healthy Providers"*, *"Average Latency"*, *"Error Rate"*.
- Providers page: *"Add Provider"*, *"Edit Provider"*, *"Provider Name"*, *"Base URL"*, *"API Key"*, *"Custom Headers"*, *"Test Connection"*, *"Connection Successful"*, *"Connection Failed"*, *"Bulk Import Codex Accounts"*, *"Upload JSON / YAML file"*, *"Models Available"*, *"Enable Provider"*, *"Disable Provider"*.
- Usage & Analytics: *"Quota Limits"*, *"Usage Overview"*, *"Token Consumption"*, *"Reset Schedule"*, *"Daily Limit"*, *"Monthly Limit"*, *"Remaining Quota"*, *"Requests per minute"*, *"Tokens per minute"*.

- [ ] **Step 2: Verify JSON formatting and key sorting**

Run:
```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/i18n/literals/vi.json', 'utf8'));
const sorted = {};
Object.keys(data).sort().forEach(k => { sorted[k] = data[k]; });
fs.writeFileSync('public/i18n/literals/vi.json', JSON.stringify(sorted, null, 2) + '\n');
console.log('JSON sorted and verified. Total keys:', Object.keys(sorted).length);
"
```
Expected: `JSON sorted and verified. Total keys: >300`

- [ ] **Step 3: Commit changes**

```bash
git add public/i18n/literals/vi.json
git commit -m "feat(i18n): add Vietnamese translations for Dashboard, Providers, and Usage Analytics"
```

---

### Task 4: Add Vietnamese Translations for Token Saver, Endpoint, Profile/SSO & Auth

**Files:**
- Modify: `public/i18n/literals/vi.json`

**Interfaces:**
- Consumes: `public/i18n/literals/vi.json`
- Produces: Fully comprehensive `vi.json` covering all remaining modules.

- [ ] **Step 1: Update `public/i18n/literals/vi.json` with Token Saver, Endpoint, Profile, SSO & Auth strings**

Add translations for:
- Token Saver: *"RTK Compression"*, *"Headroom Proxy"*, *"Start Proxy"*, *"Stop Proxy"*, *"Install Extras"*, *"Caveman Mode"*, *"Ponytail Mode"*, *"Pxpipe Streaming Compression"*, *"Cut filler in history + keep grammar on reply"*, *"Max history cut + telegraphic reply"*, *"YAGNI extremist, deletion first"*.
- Endpoint & CLI Tools: *"Access Anywhere"*, *"Share Endpoint"*, *"Use in Cursor/Cline"*, *"Encrypted via Cloudflare"*, *"Start Tunnel"*, *"Stop Tunnel"*, *"Remote URL"*, *"MITM Server"*, *"Port"*, *"SSL Certificate"*.
- Profile & Settings: *"Change Password"*, *"Current Password"*, *"New Password"*, *"Confirm Password"*, *"Database Backup"*, *"Export Database"*, *"Import Database"*, *"Outbound Proxy"*, *"HTTP/HTTPS Proxy URL"*, *"No Proxy Domains"*.
- SSO (SAML & OIDC): *"Sign in with OIDC"*, *"OIDC Issuer URL"*, *"Client ID"*, *"Client Secret"*, *"Sign in with SAML SSO"*, *"SAML EntryPoint"*, *"SAML Issuer"*, *"SAML Certificate"*, *"Identity Provider Metadata"*, *"Test SSO Configuration"*.
- Auth & Setup: *"Welcome back"*, *"Sign in to your account"*, *"Initial Setup Wizard"*, *"Create Administrator Account"*, *"Password must be at least 8 characters"*.

- [ ] **Step 2: Format and sort `public/i18n/literals/vi.json`**

Run:
```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/i18n/literals/vi.json', 'utf8'));
const sorted = {};
Object.keys(data).sort().forEach(k => { sorted[k] = data[k]; });
fs.writeFileSync('public/i18n/literals/vi.json', JSON.stringify(sorted, null, 2) + '\n');
console.log('Final vi.json verified. Total keys:', Object.keys(sorted).length);
"
```
Expected: `Final vi.json verified. Total keys: >450`

- [ ] **Step 3: Commit changes**

```bash
git add public/i18n/literals/vi.json
git commit -m "feat(i18n): complete Vietnamese translation dictionary for Token Saver, Endpoint, SSO, and Auth"
```

---

### Task 5: Integration Verification & Coverage Testing

**Files:**
- Test: `public/i18n/literals/vi.json`, `src/i18n/runtime.js`

- [ ] **Step 1: Run comprehensive dictionary validation script**

Run:
```bash
node --input-type=module -e "
import fs from 'node:fs';

const viRaw = fs.readFileSync('public/i18n/literals/vi.json', 'utf8');
const vi = JSON.parse(viRaw);
const keys = Object.keys(vi);

console.log('Total translated keys in vi.json:', keys.length);
if (keys.length < 350) throw new Error('Expected at least 350 translated keys, got ' + keys.length);

// Check key critical phrases
const criticalPhrases = [
  'Dashboard', 'Providers', 'Usage', 'Token Saver', 'Endpoint',
  'Connect All AI Code Tools', 'Save 20-40% tokens with RTK',
  'Total Requests', 'Total Tokens Saved', 'Cost Reduction',
  'Change Password', 'Sign in with SAML SSO', 'Sign in with OIDC'
];

for (const phrase of criticalPhrases) {
  if (!vi[phrase]) throw new Error('Missing translation for: ' + phrase);
}

console.log('All critical phrases successfully mapped in vi.json!');
"
```
Expected: `All critical phrases successfully mapped in vi.json!`

- [ ] **Step 2: Run build/syntax check**

Run:
```bash
node -c src/i18n/runtime.js && node -c src/i18n/config.js
```
Expected: Exits with code 0.

- [ ] **Step 3: Check git status**

Run:
```bash
git status
```
Expected: Clean working tree.
