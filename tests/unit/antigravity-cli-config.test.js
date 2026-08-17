import { describe, expect, it } from "vitest";
import {
  applyAntigravitySettings,
  has9RouterConfig,
  normalizeGeminiBaseUrl,
  parseRouterEnv,
  removeShellBlock,
  resetAntigravitySettings,
  buildAgyInternalChatBody,
  resolveAgyRouteModel,
  isAgyWrapper,
  serializeAgyWrapper,
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
      model: "Gemini 3.1 Pro",
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
      routeModel: "ag/gemini-3.7-flash-medium",
    });
    const env = parseRouterEnv(envText);
    expect(env.GEMINI_API_KEY).toBe("sk_test");
    expect(env.GOOGLE_GEMINI_BASE_URL).toBe("http://127.0.0.1:20128");
    expect(env.NINEROUTER_PREV_MODEL).toBe("Gemini 3.7 Flash (High)");
    expect(envText).toContain('NINEROUTER_PREV_MODEL="Gemini 3.7 Flash (High)"');
    expect(resolveAgyRouteModel("gemini-3.1-pro", { NINEROUTER_MODEL: "ag/gemini-3.7-flash-medium" }))
      .toBe("ag/gemini-3.7-flash-medium");
    const internal = buildAgyInternalChatBody(
      { model: "gemini-3.6-flash", stream: true, request: { contents: [] } },
      { NINEROUTER_MODEL: "ag/gemini-3.7-flash-high" },
    );
    expect(internal.stream).toBeUndefined();
    expect(internal.model).toBe("ag/gemini-3.7-flash-high");
    expect(internal.userAgent).toBe("antigravity");
    expect(has9RouterConfig({ modelProvider: "gemini" }, env)).toBe(true);

    const first = upsertShellBlock("export PATH=1\n", "/tmp/9router.env");
    const second = upsertShellBlock(first, "/tmp/9router.env");
    expect(second.match(/9router-agy-begin/g)).toHaveLength(1);
    expect(removeShellBlock(second)).not.toContain("9router-agy-begin");
  });

  it("wrapper sources env then execs real binary", () => {
    const script = serializeAgyWrapper({
      envPath: "/tmp/9router.env",
      realBin: "/tmp/agy.real",
    });
    expect(isAgyWrapper(script)).toBe(true);
    expect(script).toContain('. "/tmp/9router.env"');
    expect(script).toContain('exec "/tmp/agy.real" "$@"');
  });
});
