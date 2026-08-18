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

  const current = node.nodeValue;
  if (!node._originalText) {
    node._originalText = current;
  } else if (current !== node._originalText) {
    const prevTranslated = currentLocale === "en" ? node._originalText : translate(node._originalText);
    if (current !== prevTranslated) {
      // React replaced this text (e.g. "—" → "$0.00"). Stale first-paint cache must not win.
      node._originalText = current;
    }
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
      const current = element.getAttribute(attr);
      if (!element[propKey]) {
        element[propKey] = current;
      } else if (current !== element[propKey]) {
        const prevTranslated = currentLocale === "en" ? element[propKey] : translate(element[propKey]);
        if (current !== prevTranslated) {
          element[propKey] = current;
        }
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
