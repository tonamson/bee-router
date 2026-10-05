import { describe, it, beforeAll, afterEach, vi, expect } from "vitest";
import { buildKimchiAuthUrl, KimchiService } from "../../src/lib/oauth/services/kimchi.js";
import { normalizeKimchiModel } from "../../open-sse/services/kimchiModels.js";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
import assert from "node:assert/strict";

// Load the registry entry once for the suite so a load failure is reported
// next to the failing test instead of cascading as "undefined" in every
// later assertion.
let kimchiEntry;

describe("kimchi registry entry", () => {
  beforeAll(async () => {
    kimchiEntry = (await import("../../open-sse/providers/registry/kimchi.js")).default;
  });

  it("is a free-tier provider with browser OAuth and API-key authentication", () => {
    assert.equal(kimchiEntry.id, "kimchi");
    assert.equal(kimchiEntry.category, "freeTier");
    assert.equal(kimchiEntry.hasOAuth, true);
    assert.deepEqual(kimchiEntry.authModes, ["oauth", "apikey"]);
  });

  it("points at the OpenAI-compatible gateway with an authenticated UA", () => {
    assert.equal(
      kimchiEntry.transport.baseUrl,
      "https://llm.kimchi.dev/openai/v1/chat/completions",
    );
    // UA must be a non-empty string the gateway can identify; the value
    // itself is owned by the Kimchi CLI release and may change upstream.
    const ua = kimchiEntry.transport.headers["User-Agent"];
    assert.ok(typeof ua === "string" && ua.length > 0, `User-Agent missing: ${ua}`);
  });

  it("uses Bearer auth", () => {
    assert.deepEqual(kimchiEntry.transport.auth, {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    });
  });

  it("exposes the upstream static models", () => {
    const ids = kimchiEntry.models.map((m) => m.id);
    assert.ok(ids.includes("kimi-k2.7"));
    assert.ok(ids.includes("minimax-m3"));
    assert.ok(ids.includes("nemotron-3-ultra-fp4"));
    assert.ok(ids.length >= 5, `expected >= 5 static models, got ${ids.length}`);
  });

  it("passes through models not in the static list", () => {
    assert.equal(kimchiEntry.passthroughModels, true);
  });
});

describe("kimchi oauth", () => {
  it("builds the cli-auth URL with encoded callback + state", () => {
    const url = buildKimchiAuthUrl("http://127.0.0.1:4321/callback", "abc123");
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://app.kimchi.dev");
    assert.equal(parsed.pathname, "/cli-auth");
    assert.equal(parsed.searchParams.get("callback"), "http://127.0.0.1:4321/callback");
    assert.equal(parsed.searchParams.get("state"), "abc123");
  });

  it("rejects a callback whose state does not match", async () => {
    const service = new KimchiService();
    const validation = vi.spyOn(service, "validateToken").mockResolvedValue({ valid: true });
    await assert.rejects(
      () => service._handleCallback({ token: "castai_v1_x", state: "wrong" }, "expected"),
      /restart/i,
    );
    expect(validation).not.toHaveBeenCalled();
  });

  it("accepts a callback with matching state and returns the token", async () => {
    const service = new KimchiService();
    const validation = vi.spyOn(service, "validateToken").mockResolvedValue({ valid: true });
    const res = await service._handleCallback({ token: "castai_v1_x", state: "match" }, "match");
    expect(validation).toHaveBeenCalledWith("castai_v1_x");
    assert.equal(res.token, "castai_v1_x");
  });
});

describe("kimchiModels", () => {
  it("maps Kimchi metadata entries to bee-router model shape", () => {
    const raw = [{
      slug: "glm-5.2-fp8",
      display_name: "GLM 5.2",
      reasoning: true,
      limits: { context_window: 1048576, max_output_tokens: 1048576 },
    }];
    const models = raw.map(normalizeKimchiModel);
    assert.equal(models.length, 1);
    expect(models[0]).toMatchObject({
      id: "glm-5.2-fp8",
      name: "GLM 5.2",
      contextLength: 1048576,
      maxOutputTokens: 1048576,
      reasoning: true,
      capabilities: { reasoning: true },
    });
  });

  it("falls back to slug as name when display_name is empty", () => {
    const models = [{ slug: "kimi-k2.7", display_name: "", reasoning: false, limits: {} }].map(normalizeKimchiModel);
    assert.equal(models[0].name, "kimi-k2.7");
    assert.equal(models[0].contextLength, undefined);
    assert.equal(models[0].reasoning, false);
  });

  it("rejects malformed metadata entries", () => {
    assert.equal(normalizeKimchiModel(null), null);
    assert.equal(normalizeKimchiModel({}), null);
  });
});

describe("kimchi validateToken", () => {
  async function validateStatus(status) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status }));
    return new KimchiService().validateToken("castai_v1_x");
  }

  it("200 → valid", async () => {
    assert.deepEqual(await validateStatus(200), { valid: true });
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      method: "GET", headers: { Authorization: "Bearer castai_v1_x", Accept: "application/json" },
    }));
  });
  it("401 → invalid, expired message", async () => {
    const r = await validateStatus(401);
    assert.equal(r.valid, false);
    assert.match(r.error, /invalid or expired/i);
  });
  it("403 → invalid, scope message", async () => {
    const r = await validateStatus(403);
    assert.equal(r.valid, false);
    assert.match(r.error, /scope/i);
  });
  it("unknown / network error → fail-open valid", async () => {
    assert.equal((await validateStatus(500)).valid, true);
    assert.equal((await validateStatus(0)).valid, true);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    assert.deepEqual(await new KimchiService().validateToken("token"), { valid: true });
  });
  it("rejects a matching-state callback when token validation fails", async () => {
    const service = new KimchiService();
    vi.spyOn(service, "validateToken").mockResolvedValue({ valid: false, error: "expired" });
    await assert.rejects(() => service._handleCallback({ token: "token", state: "state" }, "state"), /expired/);
  });
});

// ── OAuth dedup logic (pure clone of connectionsRepo matcher) ──
// Mimics the find() predicate in createProviderConnection for OAuth
// connections, so we can test the IdP-collision fix in isolation.
function findExistingOAuth(all, incoming) {
  const incomingEmail = incoming.email;
  const incomingUsername = incoming.providerSpecificData?.username;
  const incomingWs = incoming.providerSpecificData?.chatgptAccountId;
  return all.find((c) => {
    if (c.authType !== "oauth" || c.email !== incomingEmail) return false;
    const existingWs = c.providerSpecificData?.chatgptAccountId;
    if (incomingWs && existingWs) return incomingWs === existingWs;
    if (incomingWs && !existingWs) return false;
    if (!incomingWs && existingWs) return false;
    const existingUsername = c.providerSpecificData?.username;
    if (incomingUsername && existingUsername) {
      return incomingUsername === existingUsername;
    }
    if (incomingUsername || existingUsername) return false;
    return true;
  });
}

describe("kimchi OAuth dedup", () => {
  const google = { authType: "oauth", email: "x@y.com", providerSpecificData: { username: "google-oauth2|123" } };
  const hf = { authType: "oauth", email: "x@y.com", providerSpecificData: { username: "huggingface|456" } };
  const legacy = { authType: "oauth", email: "x@y.com", providerSpecificData: {} };
  const other = { authType: "oauth", email: "z@y.com", providerSpecificData: { username: "google-oauth2|789" } };

  it("different email never matches", () => {
    assert.equal(findExistingOAuth([other], google), undefined);
  });

  it("same email + same username = dedup (re-login same IdP)", () => {
    const found = findExistingOAuth([google], { ...google });
    assert.equal(found, google);
  });

  it("same email + different username = NO match (cross-IdP, the bug)", () => {
    assert.equal(findExistingOAuth([google], hf), undefined);
  });

  it("legacy row without username matches incoming without username (backward compat)", () => {
    assert.equal(findExistingOAuth([legacy], { ...legacy }), legacy);
  });

  it("incoming without username does not match legacy row with username", () => {
    assert.equal(findExistingOAuth([google], { ...legacy }), undefined);
  });

  it("workspaces still dedupe on workspace ID when both sides have one", () => {
    const ws1 = { authType: "oauth", email: "a@b.com", providerSpecificData: { chatgptAccountId: "ws1" } };
    const ws1dup = { authType: "oauth", email: "a@b.com", providerSpecificData: { chatgptAccountId: "ws1" } };
    const ws2 = { authType: "oauth", email: "a@b.com", providerSpecificData: { chatgptAccountId: "ws2" } };
    assert.equal(findExistingOAuth([ws1], ws1dup), ws1);
    assert.equal(findExistingOAuth([ws1], ws2), undefined);
  });
});
