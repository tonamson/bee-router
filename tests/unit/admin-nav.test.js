import { describe, it, expect } from "vitest";
import {
  ADMIN_NAV_GROUPS,
  PALETTE_ACTIONS,
  getActiveGroupId,
  getPaletteItems,
  filterPaletteItems,
} from "../../src/shared/constants/adminNav.js";

const REQUIRED_HREFS = [
  "/dashboard/endpoint",
  "/dashboard/providers",
  "/dashboard/media-providers/embedding",
  "/dashboard/media-providers/image",
  "/dashboard/media-providers/video",
  "/dashboard/media-providers/tts",
  "/dashboard/media-providers/stt",
  "/dashboard/media-providers/web",
  "/dashboard/combos",
  "/dashboard/proxy-pools",
  "/dashboard/usage",
  "/dashboard/quota",
  "/dashboard/token-saver",
  "/dashboard/analytics/keys",
  "/dashboard/analytics/token-save",
  "/dashboard/analytics/pricing",
  "/dashboard/cli-tools",
  "/dashboard/console-log",
  "/dashboard/translator",
  "/dashboard/profile",
];

describe("ADMIN_NAV_GROUPS", () => {
  it("lists each required href exactly once", () => {
    const hrefs = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toEqual(expect.arrayContaining(REQUIRED_HREFS));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toHaveLength(REQUIRED_HREFS.length);
  });

  it("uses the five locked group ids and labels", () => {
    expect(ADMIN_NAV_GROUPS.map((g) => [g.id, g.label])).toEqual([
      ["hive", "Hive"],
      ["providers", "Providers"],
      ["routing", "Routing"],
      ["usage", "Usage"],
      ["tools", "Tools"],
    ]);
  });
});

describe("getActiveGroupId", () => {
  it("treats /dashboard and /dashboard/endpoint as hive", () => {
    expect(getActiveGroupId("/dashboard")).toBe("hive");
    expect(getActiveGroupId("/dashboard/endpoint")).toBe("hive");
  });

  it("does not treat other /dashboard/* routes as hive", () => {
    expect(getActiveGroupId("/dashboard/providers")).toBe("providers");
    expect(getActiveGroupId("/dashboard/usage")).toBe("usage");
  });

  it("uses longest href prefix", () => {
    expect(getActiveGroupId("/dashboard/providers/claude")).toBe("providers");
    expect(getActiveGroupId("/dashboard/media-providers/tts")).toBe("providers");
    expect(getActiveGroupId("/dashboard/analytics/keys/abc")).toBe("usage");
    expect(getActiveGroupId("/dashboard/cli-tools/claude")).toBe("tools");
  });
});

describe("getPaletteItems", () => {
  it("includes every nav href plus four actions stay separate", () => {
    const items = getPaletteItems({ enableTranslator: true });
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toEqual(expect.arrayContaining(REQUIRED_HREFS));
    expect(PALETTE_ACTIONS.map((a) => a.id)).toEqual([
      "theme",
      "copy-base-url",
      "changelog",
      "logout",
    ]);
  });

  it("omits translator when enableTranslator is false", () => {
    const items = getPaletteItems({ enableTranslator: false });
    expect(items.some((i) => i.href === "/dashboard/translator")).toBe(false);
    expect(getPaletteItems({ enableTranslator: true }).some((i) => i.href === "/dashboard/translator")).toBe(true);
  });
});

describe("filterPaletteItems", () => {
  it("matches label or href case-insensitively", () => {
    const items = getPaletteItems({ enableTranslator: true });
    const hits = filterPaletteItems(items, "QUOTA");
    expect(hits.map((i) => i.href)).toContain("/dashboard/quota");
  });

  it("returns [] when nothing matches", () => {
    const items = getPaletteItems({ enableTranslator: true });
    expect(filterPaletteItems(items, "zzz-no-such-page")).toEqual([]);
  });
});
