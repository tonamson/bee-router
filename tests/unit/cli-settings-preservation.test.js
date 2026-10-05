import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  files: new Map(),
  getApiKeys: vi.fn(),
}));

vi.mock("os", () => ({ default: { homedir: () => "/private/tmp/bee-cli-fixture", platform: () => "darwin" } }));
vi.mock("@/lib/db", () => ({ getApiKeys: state.getApiKeys }));
vi.mock("better-sqlite3", () => ({ default: function () { throw new Error("unavailable"); } }));
vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    access: vi.fn(async (file) => {
      if (!state.files.has(file)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }),
    readFile: vi.fn(async (file) => {
      if (!state.files.has(file)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
      return state.files.get(file);
    }),
    writeFile: vi.fn(async (file, content) => state.files.set(file, content)),
    rm: vi.fn(async (file) => state.files.delete(file)),
  },
}));

import { POST as applyPi } from "@/app/api/cli-tools/pi-settings/route.js";
import { POST as applyOmp, DELETE as removeOmp } from "@/app/api/cli-tools/omp-settings/route.js";

const piPath = "/private/tmp/bee-cli-fixture/.pi/agent/models.json";
const ompPath = "/private/tmp/bee-cli-fixture/.omp/agent/models.yml";
const request = (body) => ({ json: async () => body });

beforeEach(() => {
  state.files.clear();
  state.getApiKeys.mockReset();
  state.getApiKeys.mockResolvedValue([{ key: "sk-dashboard", isActive: true }]);
});

describe("Pi CLI settings", () => {
  it("creates a BeeRouter provider with a real key on first apply", async () => {
    const response = await applyPi(request({ baseUrl: "http://localhost:20128", model: "ag/gemini-pro" }));
    expect(response.status).toBe(200);
    const config = JSON.parse(state.files.get(piPath));
    expect(config.providers["bee-router"]).toMatchObject({
      baseUrl: "http://localhost:20128/v1",
      apiKey: "sk-dashboard",
      api: "openai-completions",
      models: [{ id: "ag/gemini-pro" }],
    });
    expect(config.providers["9router"]).toBeUndefined();
  });

  it("preserves the provider's existing key and custom settings when changing models", async () => {
    state.files.set(piPath, JSON.stringify({ providers: {
      other: { apiKey: "sk-other" },
      "bee-router": { apiKey: "sk-saved", api: "openai-responses", authHeader: true },
    } }));
    const response = await applyPi(request({ baseUrl: "http://localhost:20128/v1", model: "cx/gpt-6" }));
    expect(response.status).toBe(200);
    const config = JSON.parse(state.files.get(piPath));
    expect(config.providers["bee-router"]).toMatchObject({ apiKey: "sk-saved", api: "openai-responses", authHeader: true });
    expect(config.providers.other).toEqual({ apiKey: "sk-other" });
    expect(state.getApiKeys).not.toHaveBeenCalled();
  });
});

describe("Oh My Pi CLI provider preservation", () => {
  const otherProvider = "  custom-provider:\n    baseUrl: https://example.test/v1\n    apiKey: sk-other\n";

  it("replaces the complete managed block and preserves adjacent providers", async () => {
    state.files.set(ompPath, "providers:\n  bee-router:\n    baseUrl: http://old.test/v1\n    discovery:\n      type: proxy\n" + otherProvider);
    const response = await applyOmp(request({ baseUrl: "http://localhost:20128", apiKey: "sk-current" }));
    expect(response.status).toBe(200);
    const config = state.files.get(ompPath);
    expect(config).toContain(otherProvider.trimEnd());
    expect(config).not.toContain("old.test");
    expect(config.match(/^  bee-router:/gm)).toHaveLength(1);
    expect(config).toContain("    apiKey: sk-current");
  });

  it("removes all nested managed fields and preserves adjacent providers on reset", async () => {
    state.files.set(ompPath, "providers:\n  bee-router:\n    baseUrl: http://old.test/v1\n    discovery:\n      type: proxy\n" + otherProvider);
    const response = await removeOmp();
    expect(response.status).toBe(200);
    expect(state.files.get(ompPath)).toBe("providers:\n" + otherProvider);
  });
});
