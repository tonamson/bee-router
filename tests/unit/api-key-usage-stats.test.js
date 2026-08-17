import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;
let getAdapter;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-key-usage-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  ({ getAdapter } = await import("@/lib/db/driver.js"));
  await db.initDb();
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

async function seedKeys() {
  const adapter = await getAdapter();
  adapter.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`,
    ["key-a-id", "sk-key-aaa-111", "Alpha", "m1", 1, new Date().toISOString()]
  );
  adapter.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`,
    ["key-b-id", "sk-key-bbb-222", "Beta", "m1", 1, new Date().toISOString()]
  );
  adapter.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`,
    ["key-c-id", "sk-key-ccc-333", "Unused", "m1", 1, new Date().toISOString()]
  );

  const now = Date.now();
  await db.saveRequestUsage({
    timestamp: new Date(now - 60_000).toISOString(),
    provider: "openai",
    model: "gpt-4",
    connectionId: "c1",
    apiKey: "sk-key-aaa-111",
    tokens: { prompt_tokens: 100, completion_tokens: 50, cached_tokens: 10 },
    endpoint: "/v1/chat/completions",
    status: "ok",
    cost: 0.01,
  });
  await db.saveRequestUsage({
    timestamp: new Date(now - 30_000).toISOString(),
    provider: "anthropic",
    model: "claude-3",
    connectionId: "c1",
    apiKey: "sk-key-bbb-222",
    tokens: { prompt_tokens: 200, completion_tokens: 100 },
    endpoint: "/v1/messages",
    status: "ok",
    cost: 0.02,
  });
}

describe("API key usage analyst", () => {
  it("isolates stats and chart per key", async () => {
    await seedKeys();

    const a = await db.getUsageStatsForApiKey("sk-key-aaa-111", "24h");
    expect(a.totalPromptTokens).toBe(100);
    expect(a.totalCompletionTokens).toBe(50);
    expect(a.totalCachedTokens).toBe(10);
    expect(a.totalRequests).toBe(1);
    expect(a.byModel["gpt-4 (openai)"]?.requests).toBe(1);
    expect(Object.keys(a.byProvider)).toEqual(["openai"]);
    const histA = await db.getUsageHistoryForApiKey("sk-key-aaa-111", "24h", { page: 1, pageSize: 20 });
    expect(histA.items.length).toBe(1);
    expect(histA.totalItems).toBe(1);

    const b = await db.getUsageStatsForApiKey("sk-key-bbb-222", "7d");
    expect(b.totalPromptTokens).toBe(200);
    expect(b.totalRequests).toBe(1);
    expect(b.byEndpoint["/v1/messages|claude-3|anthropic"]?.requests).toBe(1);

    const unused = await db.getUsageStatsForApiKey("sk-key-ccc-333", "7d");
    expect(unused.totalRequests).toBe(0);
    expect(unused.totalPromptTokens).toBe(0);
    const histUnused = await db.getUsageHistoryForApiKey("sk-key-ccc-333", "7d");
    expect(histUnused.items).toEqual([]);
    expect(histUnused.totalItems).toBe(0);

    const none = await db.getUsageStatsForApiKey("", "7d");
    expect(none.totalRequests).toBe(0);

    const chartA = await db.getChartData("24h", { apiKey: "sk-key-aaa-111" });
    const chartB = await db.getChartData("24h", { apiKey: "sk-key-bbb-222" });
    const tokensA = chartA.reduce((s, d) => s + d.tokens, 0);
    const tokensB = chartB.reduce((s, d) => s + d.tokens, 0);
    expect(tokensA).toBe(150);
    expect(tokensB).toBe(300);

    const chart7A = await db.getChartData("7d", { apiKey: "sk-key-aaa-111" });
    const chart7B = await db.getChartData("7d", { apiKey: "sk-key-bbb-222" });
    expect(chart7A.reduce((s, d) => s + d.tokens, 0)).toBe(150);
    expect(chart7B.reduce((s, d) => s + d.tokens, 0)).toBe(300);
  });

  it("does not put raw api keys on byApiKey object keys and sets apiKeyId", async () => {
    const stats = await db.getUsageStats("24h");
    const keys = Object.keys(stats.byApiKey);
    expect(keys.some((k) => k.includes("sk-key-aaa-111"))).toBe(false);
    expect(keys.some((k) => k.includes("sk-key-bbb-222"))).toBe(false);

    const values = Object.values(stats.byApiKey);
    const alpha = values.find((v) => v.apiKeyId === "key-a-id");
    expect(alpha).toBeTruthy();
    expect(alpha.apiKeyMasked).toBe("sk-key-a***");
    expect(JSON.stringify(stats.byApiKey)).not.toContain("sk-key-aaa-111");
  });

  it("paginates request history", async () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      await db.saveRequestUsage({
        timestamp: new Date(now - i * 1000).toISOString(),
        provider: "openai",
        model: "gpt-4",
        apiKey: "sk-key-aaa-111",
        tokens: { prompt_tokens: 1, completion_tokens: 1 },
        endpoint: "/v1/chat/completions",
        status: "ok",
      });
    }
    const p1 = await db.getUsageHistoryForApiKey("sk-key-aaa-111", "24h", { page: 1, pageSize: 2 });
    const p2 = await db.getUsageHistoryForApiKey("sk-key-aaa-111", "24h", { page: 2, pageSize: 2 });
    expect(p1.pageSize).toBe(2);
    expect(p1.items.length).toBe(2);
    expect(p2.items.length).toBe(2);
    expect(p1.totalItems).toBeGreaterThanOrEqual(6);
    expect(p1.totalPages).toBeGreaterThanOrEqual(3);
    expect(p1.items[0].timestamp).not.toBe(p2.items[0].timestamp);
  });
});
