import { describe, expect, it } from "vitest";
import {
  applyAntigravitySettings,
  has9RouterConfig,
  normalizeGeminiBaseUrl,
  parseRouterEnv,
  removeShellBlock,
  resetAntigravitySettings,
  serializeRouterEnv,
  upsertShellBlock,
} from "../../src/lib/antigravityCliConfig.js";

const EXISTING = {
  colorScheme: "dark",
  model: "Gemini 3.7 Flash (High)",
  trustedWorkspaces: ["/tmp/project"],
  hooks: { SessionStart: [] },
};

describe("antigravityCliConfig", () => {
  it("merges modelProvider without dropping existing keys", () => {
    const next = applyAntigravitySettings(EXISTING, { model: "gemini/gemini-2.5-pro" });
    expect(next).toMatchObject({
      colorScheme: "dark",
      modelProvider: "gemini",
      model: "gemini/gemini-2.5-pro",
      trustedWorkspaces: ["/tmp/project"],
    });
    expect(next.hooks).toEqual({ SessionStart: [] });
  });

  it("reset restores previous model and drops modelProvider", () => {
    const applied = applyAntigravitySettings(EXISTING, { model: "cc/claude-sonnet-5" });
    const reset = resetAntigravitySettings(applied, { previousModel: EXISTING.model });
    expect(reset.modelProvider).toBeUndefined();
    expect(reset.model).toBe("Gemini 3.7 Flash (High)");
    expect(reset.trustedWorkspaces).toEqual(["/tmp/project"]);
  });

  it("strips /v1 and /v1beta from Gemini base URL", () => {
    expect(normalizeGeminiBaseUrl("http://localhost:20128/v1/")).toBe("http://127.0.0.1:20128");
    expect(normalizeGeminiBaseUrl("http://127.0.0.1:20128/v1beta")).toBe("http://127.0.0.1:20128");
  });

  it("round-trips env and upserts a shell source block once", () => {
    const envText = serializeRouterEnv({
      apiKey: "sk_test",
      baseUrl: "http://127.0.0.1:20128",
      previousModel: "Gemini 3.7 Flash (High)",
    });
    const env = parseRouterEnv(envText);
    expect(env.GEMINI_API_KEY).toBe("sk_test");
    expect(env.GOOGLE_GEMINI_BASE_URL).toBe("http://127.0.0.1:20128");
    expect(has9RouterConfig({ modelProvider: "gemini" }, env)).toBe(true);

    const first = upsertShellBlock("export PATH=1\n", "/tmp/9router.env");
    const second = upsertShellBlock(first, "/tmp/9router.env");
    expect(second.match(/9router-agy-begin/g)).toHaveLength(1);
    expect(removeShellBlock(second)).not.toContain("9router-agy-begin");
  });
});
