import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;
let getAdapter;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bee-router-clear-usage-"));
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

async function seedTwoKeys() {
  const now = Date.now();
  await db.saveRequestUsage({
    timestamp: new Date(now - 60_000).toISOString(),
    provider: "openai",
    model: "gpt-4",
    connectionId: "c1",
    apiKey: "sk-key-aaa-111",
    tokens: { prompt_tokens: 100, completion_tokens: 50 },
    endpoint: "/v1/chat/completions",
    status: "ok",
  });
  await db.saveRequestUsage({
    timestamp: new Date(now - 30_000).toISOString(),
    provider: "openai",
    model: "gpt-4",
    connectionId: "c1",
    apiKey: "sk-key-bbb-222",
    tokens: { prompt_tokens: 200, completion_tokens: 100 },
    endpoint: "/v1/chat/completions",
    status: "ok",
  });
}

describe("clear usage", () => {
  it("exports clearAllUsage and clearUsageByApiKey", () => {
    expect(typeof db.clearAllUsage).toBe("function");
    expect(typeof db.clearUsageByApiKey).toBe("function");
  });

  it("clearUsageByApiKey removes that key only and rebuilds daily stats", async () => {
    await seedTwoKeys();

    const before = await db.getUsageHistory();
    expect(before.length).toBeGreaterThanOrEqual(2);

    const result = await db.clearUsageByApiKey("sk-key-aaa-111");
    expect(result.deleted).toBeGreaterThanOrEqual(1);

    const hist = await db.getUsageHistory();
    expect(hist.every((r) => r.apiKeyMasked !== "sk-key-a***")).toBe(true);
    expect(hist.some((r) => (r.tokens?.prompt_tokens || 0) === 200)).toBe(true);

    const statsAll = await db.getUsageStats("all");
    expect(statsAll.totalPromptTokens).toBe(200);
    expect(statsAll.totalCompletionTokens).toBe(100);
    expect(statsAll.totalRequests).toBe(1);

    const stats24h = await db.getUsageStats("24h");
    expect(stats24h.totalPromptTokens).toBe(200);
    expect(stats24h.totalCompletionTokens).toBe(100);
  });

  it("clearAllUsage wipes history, daily, requestDetails, logs, counters", async () => {
    await seedTwoKeys();
    const adapter = await getAdapter();
    adapter.run(
      `INSERT INTO requestDetails(id, timestamp, provider, model, connectionId, status, data) VALUES(?, ?, ?, ?, ?, ?, ?)`,
      ["rd-1", "2026-08-17T10:00:00.000Z", "openai", "gpt-4", "c1", "ok", "{}"],
    );

    const result = await db.clearAllUsage();
    expect(result.deleted).toBeGreaterThanOrEqual(1);

    expect(await db.getUsageHistory()).toEqual([]);
    const stats = await db.getUsageStats("all");
    expect(stats.totalRequests).toBe(0);
    expect(stats.totalPromptTokens).toBe(0);
    expect(stats.totalCompletionTokens).toBe(0);
    expect(await db.getRecentLogs(50)).toEqual([]);

    const leftover = adapter.get(`SELECT COUNT(*) AS c FROM requestDetails`);
    expect(leftover.c).toBe(0);
    const daily = adapter.get(`SELECT COUNT(*) AS c FROM usageDaily`);
    expect(daily.c).toBe(0);
    const lifetime = adapter.get(`SELECT value FROM _meta WHERE key = 'totalRequestsLifetime'`);
    expect(Number(lifetime?.value || 0)).toBe(0);
  });
});
