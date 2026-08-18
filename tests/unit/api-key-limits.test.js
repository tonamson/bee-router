import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;
let limits;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bee-router-key-limits-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  await db.initDb();
  limits = await import("@/lib/apiKeyLimits.js");
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

async function makeKey(name, fields) {
  const created = await db.createApiKey(name, "machine-test");
  if (fields) await db.updateApiKey(created.id, fields);
  return db.getApiKeyById(created.id);
}

describe("API key limits", () => {
  it("treats 0 as unlimited for concurrency", async () => {
    const key = await makeKey("unlimited", { concurrency: 0 });
    const a = await limits.acquireApiKeySlot(key.key);
    const b = await limits.acquireApiKeySlot(key.key);
    expect(a).toBeNull();
    expect(b).toBeNull();
    limits.releaseApiKeySlot(key.key);
    limits.releaseApiKeySlot(key.key);
  });

  it("rejects over concurrency and frees on release", async () => {
    const key = await makeKey("conc-1", { concurrency: 1 });
    expect(await limits.acquireApiKeySlot(key.key)).toBeNull();
    const blocked = await limits.acquireApiKeySlot(key.key);
    expect(blocked).toBeTruthy();
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error.code).toBe("key_concurrency");
    limits.releaseApiKeySlot(key.key);
    expect(await limits.acquireApiKeySlot(key.key)).toBeNull();
    limits.releaseApiKeySlot(key.key);
  });

  it("rejects daily request cap for that key only", async () => {
    const a = await makeKey("day-a", { dailyRequests: 1 });
    const b = await makeKey("day-b", { dailyRequests: 1 });
    await db.saveRequestUsage({
      timestamp: new Date().toISOString(),
      provider: "openai",
      model: "gpt-4",
      apiKey: a.key,
      tokens: { prompt_tokens: 10, completion_tokens: 5 },
      endpoint: "/v1/chat/completions",
      status: "ok",
    });
    const blocked = await limits.acquireApiKeySlot(a.key);
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe("key_daily_request_limit");
    expect(await limits.acquireApiKeySlot(b.key)).toBeNull();
    limits.releaseApiKeySlot(b.key);
  });

  it("rejects daily token cap", async () => {
    const key = await makeKey("tok-a", { dailyTokens: 50 });
    await db.saveRequestUsage({
      timestamp: new Date().toISOString(),
      provider: "openai",
      model: "gpt-4",
      apiKey: key.key,
      tokens: { prompt_tokens: 40, completion_tokens: 20 },
      endpoint: "/v1/chat/completions",
      status: "ok",
    });
    const blocked = await limits.acquireApiKeySlot(key.key);
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe("key_daily_token_limit");
  });
});
