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

