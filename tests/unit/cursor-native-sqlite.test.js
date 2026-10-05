import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";

const fixture = vi.hoisted(() => ({ home: "" }));
vi.mock("os", () => ({ homedir: () => fixture.home }));

describe.runIf(Number(process.versions.node.split(".")[0]) >= 24)("Cursor native SQLite import", () => {
  it("extracts credentials from a real SQLite file without modifying it", async () => {
    fixture.home = fs.mkdtempSync("/private/tmp/cursor-native-");
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
    try {
      const dbPath = path.join(fixture.home, "Library/Application Support/Cursor/User/globalStorage/state.vscdb");
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const { DatabaseSync } = await import("node:sqlite");
      const seed = new DatabaseSync(dbPath);
      seed.exec("CREATE TABLE itemTable (key TEXT PRIMARY KEY, value TEXT)");
      const insert = seed.prepare("INSERT INTO itemTable(key, value) VALUES (?, ?)");
      insert.run("cursorAuth/accessToken", JSON.stringify("fixture-access-token"));
      insert.run("storage.serviceMachineId", "fixture-machine-id");
      seed.close();
      const before = fs.readFileSync(dbPath);
      const { GET } = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
      const response = await GET();
      expect(await response.json()).toEqual({ found: true, accessToken: "fixture-access-token", machineId: "fixture-machine-id" });
      expect(fs.readFileSync(dbPath)).toEqual(before);
      expect(fs.readdirSync(path.dirname(dbPath))).toEqual(["state.vscdb"]);
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
      fs.rmSync(fixture.home, { recursive: true, force: true });
    }
  });
});
