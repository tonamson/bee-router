import { MEDIA_PROVIDER_KINDS } from "./providers.js";

export const VISIBLE_MEDIA_KIND_IDS = ["embedding", "image", "video", "tts", "stt"];

export const PALETTE_ACTIONS = [
  { id: "theme", label: "Toggle theme" },
  { id: "copy-base-url", label: "Copy base URL" },
  { id: "changelog", label: "Open changelog" },
  { id: "logout", label: "Log out" },
];

const mediaItems = VISIBLE_MEDIA_KIND_IDS.map((id) => {
  const kind = MEDIA_PROVIDER_KINDS.find((k) => k.id === id);
  return { href: `/dashboard/media-providers/${id}`, label: kind?.label || id };
});

export const ADMIN_NAV_GROUPS = [
  {
    id: "hive",
    label: "Hive",
    items: [{ href: "/dashboard/endpoint", label: "Endpoint & Keys" }],
  },
  {
    id: "providers",
    label: "Providers",
    items: [
      { href: "/dashboard/providers", label: "Providers" },
      ...mediaItems,
      { href: "/dashboard/media-providers/web", label: "Web Fetch & Search" },
    ],
  },
  {
    id: "routing",
    label: "Routing",
    items: [
      { href: "/dashboard/combos", label: "Combos & Routing" },
      { href: "/dashboard/proxy-pools", label: "Proxy Pools" },
    ],
  },
  {
    id: "usage",
    label: "Usage",
    items: [
      { href: "/dashboard/usage", label: "Usage & Stats" },
      { href: "/dashboard/quota", label: "Quota Tracker" },
      { href: "/dashboard/token-saver", label: "Token Saver" },
      { href: "/dashboard/analytics/keys", label: "API Keys" },
      { href: "/dashboard/analytics/token-save", label: "Token Save" },
      { href: "/dashboard/analytics/pricing", label: "Pricing" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { href: "/dashboard/cli-tools", label: "CLI Tools" },
      { href: "/dashboard/console-log", label: "Console Log" },
      { href: "/dashboard/translator", label: "Translator", flag: "translator" },
      { href: "/dashboard/profile", label: "Settings" },
    ],
  },
];

export function getActiveGroupId(pathname) {
  if (!pathname) return null;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint")) {
    return "hive";
  }
  let best = null;
  let bestLen = -1;
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (hit && item.href.length > bestLen) {
        best = group.id;
        bestLen = item.href.length;
      }
    }
  }
  return best;
}

export function getPaletteItems({ enableTranslator = false } = {}) {
  const items = [];
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.flag === "translator" && !enableTranslator) continue;
      items.push({
        groupId: group.id,
        groupLabel: group.label,
        href: item.href,
        label: item.label,
      });
    }
  }
  return items;
}

export function filterPaletteItems(items, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
  );
}
