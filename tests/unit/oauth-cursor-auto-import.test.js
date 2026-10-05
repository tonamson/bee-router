import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fsPromises from "fs/promises";

const mocks = vi.hoisted(() => ({ native: vi.fn(), better: vi.fn(), exec: vi.fn(), close: vi.fn(), values: new Map() }));
vi.mock("next/server", () => ({ NextResponse: { json: (body, init) => ({ status: init?.status || 200, body }) } }));
vi.mock("os", () => ({ homedir: () => "/mock/home" }));
vi.mock("fs/promises", () => ({ access: vi.fn(), constants: { R_OK: 4 } }));
vi.mock("node:sqlite", () => ({ DatabaseSync: class { constructor(...args) { return mocks.native(...args); } } }));
vi.mock("better-sqlite3", () => ({ default: class { constructor(...args) { return mocks.better(...args); } } }));
vi.mock("child_process", () => {
  const execFile = (...args) => mocks.exec(...args);
  execFile[Symbol.for("nodejs.util.promisify.custom")] = (...args) => new Promise((resolve, reject) => {
    mocks.exec(...args, (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr }));
  });
  return { execFile };
});

const macPath = "/mock/home/Library/Application Support/Cursor/User/globalStorage/state.vscdb";
const insidersPath = "/mock/home/Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb";
let GET;
const originalPlatform = process.platform;
const originalNode = process.versions.node;
const originalAppData = process.env.APPDATA;
const originalLocalAppData = process.env.LOCALAPPDATA;

beforeEach(async () => {
  vi.resetAllMocks();
  mocks.values.clear();
  Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
  Object.defineProperty(process.versions, "node", { value: "24.0.0", configurable: true });
  const openDb = () => ({ prepare: () => ({ get: (key) => mocks.values.has(key) ? { value: mocks.values.get(key) } : undefined }), close: mocks.close });
  mocks.native.mockImplementation(openDb);
  mocks.better.mockImplementation(openDb);
  mocks.exec.mockImplementation((_command, _args, _options, callback) => callback(new Error("ENOENT")));
  vi.mocked(fsPromises.access).mockImplementation(async (candidate) => { if (candidate !== macPath) throw new Error("ENOENT"); });
  GET = (await import("../../src/app/api/oauth/cursor/auto-import/route.js")).GET;
});

afterEach(() => {
  Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
  Object.defineProperty(process.versions, "node", { value: originalNode, configurable: true });
  if (originalAppData === undefined) delete process.env.APPDATA;
  else process.env.APPDATA = originalAppData;
  if (originalLocalAppData === undefined) delete process.env.LOCALAPPDATA;
  else process.env.LOCALAPPDATA = originalLocalAppData;
});

describe("GET /api/oauth/cursor/auto-import", () => {
  it("reports both stable and Insiders macOS paths when neither exists", async () => {
    vi.mocked(fsPromises.access).mockRejectedValue(new Error("ENOENT"));
    const response = await GET();
    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain(macPath);
    expect(response.body.error).toContain(insidersPath);
    expect(mocks.native).not.toHaveBeenCalled();
  });

  it("reads exact credentials with native read-only SQLite on Node 24", async () => {
    mocks.values.set("cursorAuth/accessToken", "test-token");
    mocks.values.set("storage.serviceMachineId", "test-machine-id");
    const response = await GET();
    expect(response.body).toEqual({ found: true, accessToken: "test-token", machineId: "test-machine-id" });
    expect(mocks.native).toHaveBeenCalledWith(macPath, { readOnly: true });
    expect(mocks.better).not.toHaveBeenCalled();
    expect(mocks.exec).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it("probes Insiders when the stable macOS database is absent", async () => {
    vi.mocked(fsPromises.access).mockImplementation(async (candidate) => { if (candidate !== insidersPath) throw new Error("ENOENT"); });
    mocks.values.set("cursorAuth/accessToken", "insiders-token");
    mocks.values.set("storage.serviceMachineId", "insiders-machine");
    const response = await GET();
    expect(response.body.found).toBe(true);
    expect(response.body.accessToken).toBe("insiders-token");
    expect(mocks.native).toHaveBeenCalledWith(insidersPath, { readOnly: true });
  });

  it("unwraps JSON strings and accepts the known alternate credential keys", async () => {
    mocks.values.set("cursorAuth/token", '"json-token"');
    mocks.values.set("telemetry.machineId", '"json-machine-id"');
    const response = await GET();
    expect(response.body).toEqual({ found: true, accessToken: "json-token", machineId: "json-machine-id" });
  });

  it("prefers current exact keys over alternate keys", async () => {
    mocks.values.set("cursorAuth/accessToken", "current-token");
    mocks.values.set("cursorAuth/token", "old-token");
    mocks.values.set("storage.serviceMachineId", "current-machine");
    mocks.values.set("storage.machineId", "old-machine");
    const response = await GET();
    expect(response.body.accessToken).toBe("current-token");
    expect(response.body.machineId).toBe("current-machine");
  });

  it("offers manual entry for missing credentials instead of importing unrelated fuzzy keys", async () => {
    mocks.values.set("cursorAuth/someOtherAccessTokenKey", "unrelated-token");
    mocks.values.set("storage.someMachineId", "unrelated-machine");
    const response = await GET();
    expect(response.body).toEqual({ found: false, windowsManual: true, dbPath: macPath });
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it("falls back to sqlite3 CLI without loading the unsafe addon on Node 24", async () => {
    mocks.native.mockImplementation(() => { throw new Error("SQLITE_CANTOPEN"); });
    mocks.exec.mockImplementation((command, args, _options, callback) => {
      expect(command).toBe("sqlite3");
      expect(args.slice(0, 2)).toEqual(["-readonly", macPath]);
      const key = args.at(-1).match(/WHERE key='([^']+)'/)[1];
      callback(null, key === "cursorAuth/accessToken" ? '"cli-token"\n' : key === "storage.serviceMachineId" ? "cli-machine\n" : "", "");
    });
    const response = await GET();
    expect(response.body).toEqual({ found: true, accessToken: "cli-token", machineId: "cli-machine" });
    expect(mocks.better).not.toHaveBeenCalled();
  });

  it.each(["20.0.0", "22.5.0", "22.11.0", "23.0.0", "23.1.0"])("uses the read-only addon on Node %s without native read-only support", async (version) => {
    Object.defineProperty(process.versions, "node", { value: version, configurable: true });
    mocks.values.set("cursorAuth/accessToken", "addon-token");
    mocks.values.set("storage.serviceMachineId", "addon-machine");
    const response = await GET();
    expect(response.body.found).toBe(true);
    expect(response.body.accessToken).toBe("addon-token");
    expect(mocks.native).not.toHaveBeenCalled();
    expect(mocks.better).toHaveBeenCalledWith(macPath, { readonly: true, fileMustExist: true });
  });

  it.each(["22.12.0", "23.2.0"])("uses read-only native SQLite on Node %s", async (version) => {
    Object.defineProperty(process.versions, "node", { value: version, configurable: true });
    mocks.values.set("cursorAuth/accessToken", "native-token");
    mocks.values.set("storage.serviceMachineId", "native-machine");
    const response = await GET();
    expect(response.body.accessToken).toBe("native-token");
    expect(mocks.native).toHaveBeenCalledWith(macPath, { readOnly: true });
    expect(mocks.better).not.toHaveBeenCalled();
  });

  it("offers manual import when neither SQLite strategy can open the database", async () => {
    mocks.native.mockImplementation(() => { throw new Error("SQLITE_CANTOPEN"); });
    const response = await GET();
    expect(response.body).toEqual({ found: false, windowsManual: true, dbPath: macPath });
  });

  it("closes the SQLite handle even when the credential query fails", async () => {
    mocks.native.mockReturnValue({ prepare: () => { throw new Error("missing itemTable"); }, close: mocks.close });
    const response = await GET();
    expect(response.body.found).toBe(false);
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it("probes Linux casing variants and rejects leftover config without an installed IDE", async () => {
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    vi.mocked(fsPromises.access).mockImplementation(async (candidate) => { if (candidate !== "/mock/home/.config/cursor/User/globalStorage/state.vscdb") throw new Error("ENOENT"); });
    const response = await GET();
    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain("does not appear to be installed");
    expect(mocks.native).not.toHaveBeenCalled();
  });

  it("imports Linux credentials when the desktop launcher establishes the IDE is installed", async () => {
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    vi.mocked(fsPromises.access).mockImplementation(async (candidate) => {
      if (!["/mock/home/.config/Cursor/User/globalStorage/state.vscdb", "/mock/home/.local/share/applications/cursor.desktop"].includes(candidate)) throw new Error("ENOENT");
    });
    mocks.values.set("cursorAuth/accessToken", "linux-token");
    mocks.values.set("storage.serviceMachineId", "linux-machine");
    const response = await GET();
    expect(response.body).toEqual({ found: true, accessToken: "linux-token", machineId: "linux-machine" });
  });

  it("probes Windows AppData and LocalAppData installations", async () => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });
    process.env.APPDATA = "/windows/Roaming";
    process.env.LOCALAPPDATA = "/windows/Local";
    const localPath = "/windows/Local/Programs/Cursor/User/globalStorage/state.vscdb";
    vi.mocked(fsPromises.access).mockImplementation(async (candidate) => { if (candidate !== localPath) throw new Error("ENOENT"); });
    mocks.values.set("cursorAuth/accessToken", "windows-token");
    mocks.values.set("storage.serviceMachineId", "windows-machine");
    const response = await GET();
    expect(response.body.found).toBe(true);
    expect(mocks.native).toHaveBeenCalledWith(localPath, { readOnly: true });
    expect(fsPromises.access).toHaveBeenCalledWith("/windows/Roaming/Cursor - Insiders/User/globalStorage/state.vscdb", 4);
  });
});
