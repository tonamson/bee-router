// The retired Cloudflare handler is replaced by the local SSE/Next endpoint.
// Exercise the real route and handler with only external boundaries mocked.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(), credentials: vi.fn(), validateKey: vi.fn(), model: vi.fn(),
  core: vi.fn(), markUnavailable: vi.fn(), clearError: vi.fn(), usage: vi.fn(),
  limits: vi.fn(), refresh: vi.fn(), updateCredentials: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({ getSettings: mocks.settings }));
vi.mock("@/lib/usageDb.js", () => ({ saveRequestUsage: mocks.usage }));
vi.mock("@/lib/apiKeyLimits.js", () => ({ runWithApiKeyLimits: mocks.limits }));
vi.mock("../../src/sse/services/auth.js", () => ({
  getProviderCredentials: mocks.credentials,
  markAccountUnavailable: mocks.markUnavailable,
  clearAccountError: mocks.clearError,
  isValidApiKey: mocks.validateKey,
  extractApiKey: (request) => {
    const header = request.headers.get("authorization");
    return header?.startsWith("Bearer ") ? header.slice(7) : null;
  },
}));
vi.mock("../../src/sse/services/model.js", () => ({ getModelInfo: mocks.model }));
vi.mock("../../open-sse/handlers/embeddingsCore.js", () => ({ handleEmbeddingsCore: mocks.core }));
vi.mock("../../src/sse/services/tokenRefresh.js", () => ({
  checkAndRefreshToken: mocks.refresh, updateProviderCredentials: mocks.updateCredentials,
}));
vi.mock("../../src/sse/utils/logger.js", () => ({
  request: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), maskKey: vi.fn(),
}));

import { OPTIONS, POST } from "../../src/app/api/v1/embeddings/route.js";

const model = "openai/text-embedding-3-small";
const account = { connectionId: "account-a", connectionName: "Account A", apiKey: "provider-key" };
const resultBody = { object: "list", data: [{ object: "embedding", index: 0, embedding: [0.1, 0.2] }] };

function request(body = { model, input: "hello" }, authorization = "Bearer client-key") {
  const headers = { "Content-Type": "application/json" };
  if (authorization) headers.Authorization = authorization;
  return new Request("http://localhost/v1/embeddings", {
    method: "POST", headers, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.settings.mockResolvedValue({ requireApiKey: true });
  mocks.validateKey.mockResolvedValue(true);
  mocks.model.mockResolvedValue({ provider: "openai", model: "text-embedding-3-small" });
  mocks.credentials.mockResolvedValue(account);
  mocks.refresh.mockImplementation(async (_provider, credentials) => credentials);
  mocks.limits.mockImplementation(async (_key, run) => run());
  mocks.usage.mockResolvedValue(undefined);
  mocks.markUnavailable.mockResolvedValue({ shouldFallback: false });
  mocks.core.mockResolvedValue({ success: true, response: Response.json(resultBody) });
});

describe("local embeddings route", () => {
  it("answers CORS preflight without authenticating or running an upstream request", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(mocks.validateKey).not.toHaveBeenCalled();
    expect(mocks.core).not.toHaveBeenCalled();
  });

  it.each([null, "Token client-key"])("rejects missing Bearer authentication: %s", async (authorization) => {
    const response = await POST(request(undefined, authorization));
    expect(response.status).toBe(401);
    expect((await response.json()).error.message).toMatch(/missing api key/i);
    expect(mocks.credentials).not.toHaveBeenCalled();
    expect(mocks.core).not.toHaveBeenCalled();
  });

  it("rejects an invalid key before running limits or fetching credentials", async () => {
    mocks.validateKey.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect((await response.json()).error.message).toMatch(/invalid api key/i);
    expect(mocks.limits).not.toHaveBeenCalled();
    expect(mocks.credentials).not.toHaveBeenCalled();
  });

  it("allows local mode when API-key enforcement is disabled", async () => {
    mocks.settings.mockResolvedValue({ requireApiKey: false });
    expect((await POST(request(undefined, null))).status).toBe(200);
    expect(mocks.validateKey).not.toHaveBeenCalled();
    expect(mocks.limits).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it("enforces API-key limits before fetching credentials", async () => {
    mocks.limits.mockResolvedValue(Response.json({ error: "limit" }, { status: 429 }));
    expect((await POST(request())).status).toBe(429);
    expect(mocks.credentials).not.toHaveBeenCalled();
    expect(mocks.core).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/v1/embeddings", { method: "POST", body: "{bad" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toMatch(/invalid json/i);
    expect(mocks.core).not.toHaveBeenCalled();
  });

  it.each([
    [{ input: "hello" }, /missing model/i],
    [{ model }, /missing required field: input/i],
  ])("rejects incomplete body %#", async (body, message) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toMatch(message);
    expect(mocks.core).not.toHaveBeenCalled();
  });

  it("rejects an unresolved model", async () => {
    mocks.model.mockResolvedValue({ provider: null, model: null });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toMatch(/invalid model format/i);
    expect(mocks.credentials).not.toHaveBeenCalled();
  });

  it.each(["hello", ["hello", "world"]])("passes input to the real handler and core: %j", async (input) => {
    const response = await POST(request({ model, input }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(resultBody);
    expect(mocks.core).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      body: { model, input }, modelInfo: { provider: "openai", model: "text-embedding-3-small" },
      credentials: account,
    }));
    expect(mocks.refresh).toHaveBeenCalledWith("openai", account);
  });

  it("runs success and refreshed-credential callbacks for the selected account", async () => {
    await POST(request());
    const args = mocks.core.mock.calls[0][0];
    await args.onRequestSuccess();
    await args.onCredentialsRefreshed({ accessToken: "refreshed-token" });
    expect(mocks.clearError).toHaveBeenCalledWith("account-a", account, "text-embedding-3-small");
    expect(mocks.updateCredentials).toHaveBeenCalledWith("account-a", expect.objectContaining({
      accessToken: "refreshed-token", testStatus: "active",
    }));
  });

  it("returns a retry delay when every account is rate limited", async () => {
    mocks.credentials.mockResolvedValue({
      allRateLimited: true, lastErrorCode: 429, lastError: "Rate limited",
      retryAfter: new Date(Date.now() + 60000).toISOString(), retryAfterHuman: "1 minute",
    });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(mocks.core).not.toHaveBeenCalled();
  });

  it("returns no-credentials error without reaching upstream", async () => {
    mocks.credentials.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toMatch(/no credentials/i);
  });

  it("propagates non-retryable core errors without rotating accounts", async () => {
    mocks.core.mockResolvedValue({ success: false, status: 400, error: "invalid input", response: Response.json({ error: "invalid input" }, { status: 400 }) });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid input" });
    expect(mocks.credentials).toHaveBeenCalledTimes(1);
  });

  it("excludes a failed account before retrying another account", async () => {
    const second = { ...account, connectionId: "account-b" };
    mocks.credentials.mockResolvedValueOnce(account).mockResolvedValueOnce(second);
    mocks.core.mockResolvedValueOnce({ success: false, status: 429, error: "rate limit", response: new Response(null, { status: 429 }) });
    mocks.markUnavailable.mockResolvedValueOnce({ shouldFallback: true });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.credentials).toHaveBeenNthCalledWith(2, "openai", new Set(["account-a"]), "text-embedding-3-small");
    expect(mocks.core.mock.calls[1][0].credentials.connectionId).toBe("account-b");
  });

  it("returns the last upstream error when the account fallback is exhausted", async () => {
    mocks.credentials.mockResolvedValueOnce(account).mockResolvedValueOnce(null);
    mocks.core.mockResolvedValueOnce({ success: false, status: 429, error: "rate limit", response: new Response(null, { status: 429 }) });
    mocks.markUnavailable.mockResolvedValueOnce({ shouldFallback: true });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect((await response.json()).error.message).toBe("rate limit");
  });
});
