import { beforeEach, describe, expect, it, vi } from "vitest";

const { getApiKeys } = vi.hoisted(() => ({ getApiKeys: vi.fn() }));
vi.mock("@/lib/db", () => ({ getApiKeys }));
import { resolveCliApiKey } from "@/app/api/cli-tools/resolveApiKey.js";

beforeEach(() => {
  getApiKeys.mockReset();
  getApiKeys.mockResolvedValue([
    { key: "sk-inactive", isActive: false },
    { key: "sk-db-key", isActive: true },
  ]);
});

describe("CLI tool API key resolution", () => {
  it("uses an explicit trimmed key without reading the DB", async () => {
    expect(await resolveCliApiKey("  sk-real-key  ")).toBe("sk-real-key");
    expect(getApiKeys).not.toHaveBeenCalled();
  });

  it.each(["", "   ", null, undefined, "sk_9router", " sk_bee-router ", 123])(
    "resolves empty or legacy placeholder input %j to the first active key",
    async (key) => {
      expect(await resolveCliApiKey(key)).toBe("sk-db-key");
    },
  );

  it("returns an empty key when no active key exists", async () => {
    getApiKeys.mockResolvedValue([{ key: "sk-disabled", isActive: false }]);
    expect(await resolveCliApiKey("sk_bee-router")).toBe("");
  });

  it("returns an empty key when the DB cannot be read", async () => {
    getApiKeys.mockRejectedValue(new Error("DB unavailable"));
    expect(await resolveCliApiKey(null)).toBe("");
  });
});
