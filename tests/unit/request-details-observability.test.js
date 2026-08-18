// Details tab stays empty when Grok traffic is already in usageHistory.
// Root cause: observability gate treats merged default false as an explicit
// opt-out, and ENABLE_REQUEST_LOGS (file debug logs) hijacks the same gate.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
const originalRequestLogs = process.env.ENABLE_REQUEST_LOGS;
const originalObservability = process.env.OBSERVABILITY_ENABLED;
let tempDir;
let db;
let detailsRepo;

async function flush(ms = 80) {
  await new Promise((r) => setTimeout(r, ms));
}

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bee-router-obs-"));
  process.env.DATA_DIR = tempDir;
  delete process.env.ENABLE_REQUEST_LOGS;
  delete process.env.OBSERVABILITY_ENABLED;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  detailsRepo = await import("@/lib/db/repos/requestDetailsRepo.js");
  await db.initDb();
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (originalRequestLogs === undefined) delete process.env.ENABLE_REQUEST_LOGS;
  else process.env.ENABLE_REQUEST_LOGS = originalRequestLogs;
  if (originalObservability === undefined) delete process.env.OBSERVABILITY_ENABLED;
  else process.env.OBSERVABILITY_ENABLED = originalObservability;
});

beforeEach(async () => {
  delete process.env.ENABLE_REQUEST_LOGS;
  delete process.env.OBSERVABILITY_ENABLED;
  detailsRepo.__test__.resetObservabilityConfig();
  const adapter = await (await import("@/lib/db/driver.js")).getAdapter();
  adapter.run("DELETE FROM requestDetails");
  adapter.run("DELETE FROM usageHistory");
  adapter.run("DELETE FROM settings");
});

describe("request details observability gate", () => {
  it("unset enableObservability still persists a detail (merged default must not opt out)", async () => {
    await db.updateSettings({ observabilityBatchSize: 1 });
    detailsRepo.__test__.resetObservabilityConfig();

    await db.saveRequestDetail({
      id: "det-unset",
      provider: "grok-cli",
      model: "grok-4.6",
      status: "success",
      tokens: { prompt_tokens: 10, completion_tokens: 2 },
    });
    await flush();

    const res = await db.getRequestDetails({ provider: "grok-cli" });
    expect(res.pagination.totalItems).toBe(1);
    expect(res.details[0].model).toBe("grok-4.6");
  });

  it("ENABLE_REQUEST_LOGS=false does not disable requestDetails (different feature)", async () => {
    process.env.ENABLE_REQUEST_LOGS = "false";
    await db.updateSettings({ enableObservability: true, observabilityBatchSize: 1 });
    detailsRepo.__test__.resetObservabilityConfig();

    await db.saveRequestDetail({
      id: "det-filelog",
      provider: "grok-cli",
      model: "grok-4.6",
      status: "success",
    });
    await flush();

    const res = await db.getRequestDetails({});
    expect(res.pagination.totalItems).toBe(1);
  });

  it("explicit enableObservability=false still no-ops save", async () => {
    await db.updateSettings({ enableObservability: false, observabilityBatchSize: 1 });
    detailsRepo.__test__.resetObservabilityConfig();

    await db.saveRequestDetail({
      id: "det-off",
      provider: "grok-cli",
      model: "grok-4.6",
      status: "success",
    });
    await flush();

    const res = await db.getRequestDetails({});
    expect(res.pagination.totalItems).toBe(0);
  });

  it("usageHistory rows appear on details tab when requestDetails is empty", async () => {
    await db.saveRequestUsage({
      provider: "grok-cli",
      model: "grok-4.6",
      tokens: { prompt_tokens: 100, completion_tokens: 5 },
      status: "ok",
    });

    const res = await db.getRequestDetails({ provider: "grok-cli" });
    expect(res.pagination.totalItems).toBeGreaterThanOrEqual(1);
    expect(res.details[0].provider).toBe("grok-cli");
    expect(res.details[0].model).toBe("grok-4.6");
  });

  it("providers filter lists usageHistory-only providers", async () => {
    await db.saveRequestUsage({
      provider: "grok-cli",
      model: "grok-4.6",
      tokens: { prompt_tokens: 1, completion_tokens: 1 },
      status: "ok",
    });
    const providers = await db.getDistinctProviders();
    expect(providers).toContain("grok-cli");
  });
});
