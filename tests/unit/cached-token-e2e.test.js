// End-to-end: a cache-bearing request flows through canonicalizeUsage →
// saveRequestUsage → getUsageStats, proving cached tokens are persisted,
// aggregated, and cost is computed correctly (the bug this branch fixes).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { canonicalizeUsage } from "../../open-sse/utils/usageTracking.js";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bee-router-cached-e2e-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  await db.initDb();
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("cached-token end-to-end (persist + aggregate + cost)", () => {
  it("Claude cache usage: canonical prompt is inclusive, cached persisted, cost correct", async () => {
    for (const model of ["claude-sonnet-4-6", "claude-sonnet-4.6"]) {
      expect(await db.getPricingForModel("anthropic", model)).toMatchObject({ cached: 0.3, cache_creation: 3.75 });
    }
    // Raw Claude usage (cache-EXCLUSIVE prompt): input 100, cache_read 200, cache_creation 30, output 50
    const canonical = canonicalizeUsage({
      prompt_tokens: 100,
      completion_tokens: 50,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 30,
    });
    expect(canonical.prompt_tokens).toBe(330); // inclusive

    for (const model of ["claude-sonnet-4-6", "claude-sonnet-4.6"]) {
      await db.saveRequestUsage({
        provider: "anthropic",
        model,
        connectionId: "c-cache",
        tokens: canonical,
        endpoint: "/v1/messages",
        status: "ok",
      });
    }

    const stats = await db.getUsageStats("24h");
    expect(stats.totalCachedTokens).toBe(400);
    expect(stats.totalPromptTokens).toBe(660);
    expect(stats.byProvider.anthropic.cachedTokens).toBe(400);

    // Cost: nonCached=330-200-30=100 @3 + cached 200 @0.30 + creation 30 @3.75 + output 50 @15
    const expected = (100 * 3 + 200 * 0.3 + 30 * 3.75 + 50 * 15) / 1_000_000;
    const hist = await db.getUsageHistory({ provider: "anthropic" });
    expect(hist.length).toBe(2);
    for (const entry of hist) {
      expect(entry.cost).toBeCloseTo(expected, 12);
      expect(entry.tokens.cached_tokens).toBe(200);
      expect(entry.tokens.cache_creation_input_tokens).toBe(30);
    }
  });

  it("canonical pricing wins over dotted aliases while user overrides remain effective", async () => {
    const { rekeyByCanonical } = await import("open-sse/providers/pricing.js");
    for (const entries of [
      [["test-1-2", { input: 3 }], ["test-1.2", { input: 99 }]],
      [["test-1.2", { input: 99 }], ["test-1-2", { input: 3 }]],
    ]) {
      expect(rekeyByCanonical(Object.fromEntries(entries))["test-1-2"].input).toBe(3);
    }
    await db.updatePricing({ anthropic: { "vendor/claude-sonnet-4.6": { cache_creation: 4 } } });
    expect((await db.getPricing())._canonical["claude-sonnet-4-6"].cache_creation).toBe(4);
    expect((await db.getPricingForModel("anthropic", "claude-sonnet-4-6")).cache_creation).toBe(4);
    await db.resetPricing("anthropic", "vendor/claude-sonnet-4.6");
  });

  it("independent real chat completions with identical cache usage are persisted separately", async () => {
    const { saveUsageStats } = await import("open-sse/handlers/chatCore/requestDetail.js");
    const timestamp = new Date().toISOString();
    const clock = vi.spyOn(Date.prototype, "toISOString").mockReturnValue(timestamp);
    try {
      for (let i = 0; i < 10; i++) {
        saveUsageStats({ provider: "chat-parallel", model: "cache-model", connectionId: "shared-account", silent: true,
          tokens: { prompt_tokens: 100, completion_tokens: 50, cache_read_input_tokens: 200, cache_creation_input_tokens: 30 } });
      }
      await vi.waitFor(async () => {
        const history = await db.getUsageHistory({ provider: "chat-parallel" });
        expect(history).toHaveLength(10);
        expect(history.every((entry) => entry.tokens.cached_tokens === 200 && entry.tokens.prompt_tokens === 330)).toBe(true);
      });
    } finally {
      clock.mockRestore();
    }
  });

  it("OpenAI cache usage: inclusive prompt passes through, cached counted once", async () => {
    const canonical = canonicalizeUsage({
      prompt_tokens: 1000,        // already includes cached
      completion_tokens: 200,
      cached_tokens: 600,
    });
    expect(canonical.prompt_tokens).toBe(1000);
    expect(canonical.cached_tokens).toBe(600);

    await db.saveRequestUsage({
      provider: "openai",
      model: "gpt-4o",
      connectionId: "c-oai",
      tokens: canonical,
      endpoint: "/v1/chat/completions",
      status: "ok",
    });

    const hist = await db.getUsageHistory({ provider: "openai" });
    expect(hist[0].tokens.prompt_tokens).toBe(1000);
    expect(hist[0].tokens.cached_tokens).toBe(600);
  });
});
