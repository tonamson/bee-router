import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  isValidApiKey: vi.fn(),
  getProviderCredentials: vi.fn(),
  getModelInfo: vi.fn(),
  getComboModels: vi.fn(),
  handleChatCore: vi.fn(),
  runWithApiKeyLimits: vi.fn(),
}));

// Keep real handleChat/dispatch/single-model code, replacing only boundaries
// that access local state, accounts, provider transports, or optional modules.
vi.mock("open-sse/index.js", () => ({}));
vi.mock("@/lib/localDb", () => ({ getSettings: mocks.getSettings }));
vi.mock("../../src/sse/services/auth.js", () => ({
  extractApiKey: request => request.headers.get("authorization")?.replace(/^Bearer /, "") || null,
  isValidApiKey: mocks.isValidApiKey,
  getProviderCredentials: mocks.getProviderCredentials,
  markAccountUnavailable: vi.fn(),
  clearAccountError: vi.fn(),
}));
vi.mock("../../src/sse/services/model.js", () => ({
  getModelInfo: mocks.getModelInfo,
  getComboModels: mocks.getComboModels,
}));
vi.mock("open-sse/handlers/chatCore.js", () => ({ handleChatCore: mocks.handleChatCore }));
vi.mock("@/lib/apiKeyLimits.js", () => ({ runWithApiKeyLimits: mocks.runWithApiKeyLimits }));
vi.mock("../../src/sse/services/tokenRefresh.js", () => ({
  checkAndRefreshToken: async (_provider, credentials) => credentials,
  updateProviderCredentials: vi.fn(),
}));
vi.mock("../../src/sse/services/antigravityQuota.js", () => ({
  handleAntigravityQuotaError: vi.fn(), clearAntigravityStrikes: vi.fn(), clearAntigravityQuotaStrikes: vi.fn(),
}));
vi.mock("@/lib/headroom/detect", () => ({ DEFAULT_HEADROOM_URL: "http://localhost:9999" }));
vi.mock("@/lib/pxpipe/loader.js", () => ({ getTransform: vi.fn() }));
vi.mock("@/lib/pxpipe/events.js", () => ({ appendPxpipeEvent: vi.fn() }));
vi.mock("@/lib/tokenSave/events.js", () => ({ recordTokenSaveLayers: vi.fn() }));
vi.mock("open-sse/services/projectId.js", () => ({ getProjectIdForConnection: vi.fn() }));

import { handleChat } from "../../src/sse/handlers/chat.js";

const requestFor = (model, authenticated = true) => new Request("http://localhost/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "anthropic-beta": "context-1m-2025-08-07",
    ...(authenticated ? { authorization: "Bearer test-key" } : {}),
  },
  body: JSON.stringify({ model, messages: [{ role: "user", content: "hello" }], max_tokens: 1024 }),
});

describe("real chat handler model context routing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSettings.mockResolvedValue({ requireApiKey: true });
    mocks.isValidApiKey.mockResolvedValue(true);
    mocks.getComboModels.mockResolvedValue(null);
    mocks.getModelInfo.mockResolvedValue({ provider: "claude", model: "claude-sonnet-4.5" });
    mocks.getProviderCredentials.mockResolvedValue({ connectionId: "test-connection", accessToken: "test-token" });
    mocks.runWithApiKeyLimits.mockImplementation((_key, dispatch) => dispatch());
    mocks.handleChatCore.mockImplementation(async () => ({ success: true, response: new Response("provider reply") }));
  });

  it.each([
    ["cc/claude-sonnet-4.5", "claude-sonnet-4.5"],
    ["cc/claude-sonnet-4.5[1m]", "claude-sonnet-4.5[1m]"],
  ])("routes %s through the real handler with requested credential model %s", async (model, requestedModel) => {
    const response = await handleChat(requestFor(model));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("provider reply");
    expect(mocks.getComboModels).toHaveBeenCalledWith("cc/claude-sonnet-4.5");
    expect(mocks.getModelInfo).toHaveBeenCalledWith("cc/claude-sonnet-4.5");
    expect(mocks.getProviderCredentials).toHaveBeenCalledWith(
      "claude", expect.any(Set), "claude-sonnet-4.5", { requestedModel },
    );
    const coreInput = mocks.handleChatCore.mock.calls[0][0];
    expect(coreInput.body.model).toBe("claude/claude-sonnet-4.5");
    expect(coreInput.clientRawRequest.headers["anthropic-beta"]).toBe("context-1m-2025-08-07");
    expect(coreInput.apiKey).toBe("test-key");
    expect(mocks.runWithApiKeyLimits).toHaveBeenCalledWith("test-key", expect.any(Function));
  });

  it("denies unauthenticated requests before model resolution and provider dispatch", async () => {
    const response = await handleChat(requestFor("cc/claude-sonnet-4.5[1m]", false));
    expect(response.status).toBe(401);
    expect((await response.json()).error.message).toBe("Missing API key");
    expect(mocks.runWithApiKeyLimits).not.toHaveBeenCalled();
    expect(mocks.getModelInfo).not.toHaveBeenCalled();
    expect(mocks.getProviderCredentials).not.toHaveBeenCalled();
    expect(mocks.handleChatCore).not.toHaveBeenCalled();
  });

  it("returns API-key limit denial without selecting accounts or contacting chatCore", async () => {
    mocks.runWithApiKeyLimits.mockResolvedValue(new Response("limit reached", { status: 429 }));
    const response = await handleChat(requestFor("cc/claude-sonnet-4.5"));
    expect(response.status).toBe(429);
    expect(await response.text()).toBe("limit reached");
    expect(mocks.getModelInfo).not.toHaveBeenCalled();
    expect(mocks.getProviderCredentials).not.toHaveBeenCalled();
    expect(mocks.handleChatCore).not.toHaveBeenCalled();
  });
});
