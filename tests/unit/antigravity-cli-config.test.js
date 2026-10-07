import { describe, expect, it } from "vitest";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import {
  applyAntigravitySettings,
  hasBeeRouterConfig,
  normalizeGeminiBaseUrl,
  parseRouterEnv,
  removeShellBlock,
  resetAntigravitySettings,
  buildAgyInternalChatBody,
  resolveAgyRouteModel,
  isAgyWrapper,
  serializeAgyWrapper,
  serializeRouterEnv,
  toAgyCatalogModel,
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
    expect(env.BEE_ROUTER_PREV_MODEL).toBe("Gemini 3.7 Flash (High)");
    expect(envText).toContain("BEE_ROUTER_PREV_MODEL='Gemini 3.7 Flash (High)'");
    expect(parseRouterEnv('BEE_ROUTER_MODEL="ag/legacy"\n').BEE_ROUTER_MODEL).toBe("ag/legacy");
    expect(resolveAgyRouteModel("gemini-3.1-pro", { BEE_ROUTER_MODEL: "ag/gemini-3.7-flash-medium" }))
      .toBe("ag/gemini-3.7-flash-medium");
    const internal = buildAgyInternalChatBody(
      { model: "gemini-3.6-flash", stream: true, request: { contents: [] } },
      { BEE_ROUTER_MODEL: "ag/gemini-3.7-flash-high" },
    );
    expect(internal.stream).toBeUndefined();
    expect(internal.model).toBe("ag/gemini-3.7-flash-high");
    expect(internal.userAgent).toBe("antigravity");
    expect(hasBeeRouterConfig({ modelProvider: "gemini" }, env)).toBe(true);

    const first = upsertShellBlock("export PATH=1\n", "/tmp/bee-router.env");
    const second = upsertShellBlock(first, "/tmp/bee-router.env");
    expect(second.match(/bee-router-agy-begin/g)).toHaveLength(1);
    expect(removeShellBlock(second)).not.toContain("bee-router-agy-begin");
  });

  it("wrapper sources env then execs real binary", () => {
    const script = serializeAgyWrapper({
      envPath: "/tmp/bee-router.env",
      realBin: "/tmp/bee-router/agy",
    });
    expect(isAgyWrapper(script)).toBe(true);
    expect(script).toContain(". '/tmp/bee-router.env'");
    expect(script).toContain(`exec '/tmp/bee-router/agy' "$@"`);
  });

  it("env values are literal when sourced by sh (no command substitution)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agy-env-"));
    const marker = path.join(dir, "pwned");
    const hostile = `k$(touch ${marker})\`touch ${marker}\`'"\\$HOME`;
    const envPath = path.join(dir, "bee-router.env");
    const envText = serializeRouterEnv({ apiKey: hostile, baseUrl: "http://127.0.0.1:20128", routeModel: "ag/x" });
    fs.writeFileSync(envPath, envText);
    const out = execFileSync("/bin/sh", ["-c", 'set -a; . "$1"; printf %s "$GEMINI_API_KEY"', "sh", envPath]).toString();
    expect(out).toBe(hostile);
    expect(fs.existsSync(marker)).toBe(false);
    expect(parseRouterEnv(envText).GEMINI_API_KEY).toBe(hostile);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("maps bee-router model ids to agy catalog labels", () => {
    expect(toAgyCatalogModel("ag/gemini-3.8-flash-medium")).toBe("Gemini 3.8 Flash (Medium)");
    expect(toAgyCatalogModel("gemini/gemini-3.1-pro-high")).toBe("Gemini 3.1 Pro (High)");
    expect(toAgyCatalogModel("ag/gemini-3.7-flash")).toBe("Gemini 3.7 Flash");
    expect(toAgyCatalogModel("gemini/gemini-2.5-pro")).toBe("Gemini 3.1 Pro");
    expect(toAgyCatalogModel("cc/claude-sonnet-5")).toBe("Gemini 3.1 Pro");
    expect(applyAntigravitySettings({}, { model: "ag/gemini-3.8-flash-medium" }).model)
      .toBe("Gemini 3.8 Flash (Medium)");
  });
});
