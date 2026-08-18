import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("token-save events", () => {
  let tmp;
  let prevDataDir;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "token-save-"));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = tmp;
    vi.resetModules();
  });

  afterEach(() => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("records layer savings and aggregates", async () => {
    const { recordTokenSaveLayers, getTokenSaveStats } = await import("../../src/lib/tokenSave/events.js");
    recordTokenSaveLayers({
      provider: "openai",
      model: "gpt-4o",
      rtk: { bytesBefore: 4000, bytesAfter: 1000, hits: [{ filter: "git-diff" }] },
      lite: { bytesBefore: 1000, bytesAfter: 800, hits: ["whitespace"] },
      caveman: null,
    });
    const stats = await getTokenSaveStats({ timelineDays: 2, recentLimit: 10 });
    expect(stats.windows.all.requests).toBe(1);
    expect(stats.windows.all.compressed).toBe(1);
    expect(stats.windows.all.bytesSaved).toBe(3200);
    expect(stats.windows.all.byLayer.rtk.hits).toBe(1);
    expect(stats.recent[0].model).toBe("gpt-4o");
    // 800 tok × $2.50 / 1M (gpt-4o input)
    expect(stats.windows.all.tokensSavedEst).toBe(800);
    expect(stats.windows.all.costSavedEst).toBeCloseTo(0.002, 6);
    expect(stats.windows.all.byLayer.rtk.costSavedEst).toBeCloseTo(0.001875, 6);
    expect(stats.recent[0].costSavedEst).toBeCloseTo(0.002, 6);
  });

  it("buckets timeline on local date not UTC", async () => {
    const { recordTokenSaveLayers, getTokenSaveStats } = await import("../../src/lib/tokenSave/events.js");
    recordTokenSaveLayers({
      provider: "openai",
      model: "gpt-4o",
      rtk: { bytesBefore: 400, bytesAfter: 0, hits: [{ filter: "git-diff" }] },
    });
    const stats = await getTokenSaveStats({ timelineDays: 2, recentLimit: 5 });
    const today = new Date();
    const localKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const utcKey = today.toISOString().slice(0, 10);
    const localRow = stats.timeline.find((d) => d.date === localKey);
    expect(localRow?.tokensSavedEst).toBe(100);
    if (localKey !== utcKey) {
      const utcRow = stats.timeline.find((d) => d.date === utcKey);
      expect(utcRow?.tokensSavedEst || 0).toBe(0);
    }
  });

  it("marks tokens unpriced when model unknown", async () => {
    const { recordTokenSaveLayers, getTokenSaveStats } = await import("../../src/lib/tokenSave/events.js");
    recordTokenSaveLayers({
      provider: "nope",
      model: "totally-unknown-model-xyz",
      rtk: { bytesBefore: 400, bytesAfter: 0, hits: [{ filter: "x" }] },
    });
    const stats = await getTokenSaveStats({ timelineDays: 1, recentLimit: 5 });
    expect(stats.windows.all.tokensSavedEst).toBe(100);
    expect(stats.windows.all.costSavedEst).toBe(0);
    expect(stats.windows.all.unpricedTokens).toBe(100);
  });

  it("clearTokenSaveEvents wipes events so Est. Token Save is 0", async () => {
    const { recordTokenSaveLayers, getTokenSaveStats, clearTokenSaveEvents } = await import("../../src/lib/tokenSave/events.js");
    recordTokenSaveLayers({
      provider: "openai",
      model: "gpt-4o",
      rtk: { bytesBefore: 4000, bytesAfter: 1000, hits: [{ filter: "git-diff" }] },
    });
    expect((await getTokenSaveStats({ recentLimit: 5 })).windows.all.tokensSavedEst).toBe(750);
    clearTokenSaveEvents();
    const after = await getTokenSaveStats({ recentLimit: 5 });
    expect(after.windows.all.tokensSavedEst).toBe(0);
    expect(after.windows.all.requests).toBe(0);
    expect(after.recent).toEqual([]);
  });

  it("clearTokenSaveEventsByApiKey removes only that key", async () => {
    const { recordTokenSaveLayers, getTokenSaveStats, clearTokenSaveEventsByApiKey } = await import("../../src/lib/tokenSave/events.js");
    recordTokenSaveLayers({
      provider: "openai", model: "gpt-4o", apiKey: "sk-aaa",
      rtk: { bytesBefore: 4000, bytesAfter: 1000, hits: [{ filter: "a" }] },
    });
    recordTokenSaveLayers({
      provider: "openai", model: "gpt-4o", apiKey: "sk-bbb",
      rtk: { bytesBefore: 800, bytesAfter: 0, hits: [{ filter: "b" }] },
    });
    const wiped = clearTokenSaveEventsByApiKey("sk-aaa");
    expect(wiped.deleted).toBe(1);
    const after = await getTokenSaveStats({ recentLimit: 5 });
    expect(after.windows.all.tokensSavedEst).toBe(200);
    expect(after.recent).toHaveLength(1);
    expect(after.recent[0].apiKey).toBe("sk-bbb");
  });
});

describe("token-save timeline chart markup", () => {
  it("gives bar columns a definite height so % bars paint", () => {
    const src = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../../src/app/(dashboard)/dashboard/analytics/token-save/TokenSaveAnalyticsClient.js"),
      "utf8",
    );
    // % height on a flex-col wrapper with auto height collapses to 0px.
    expect(src).toMatch(/className=\{?"[^"]*\bh-full\b[^"]*"\}?\s+title=\{\`\$\{d\.date\}/);
  });
});
