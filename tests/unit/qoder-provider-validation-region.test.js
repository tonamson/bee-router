import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProviderConnectionById: vi.fn(),
  updateProviderConnection: vi.fn(),
}));
vi.mock("@/lib/localDb", () => mocks);
vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: vi.fn(async () => ({ connectionProxyEnabled: false })),
}));

import { testSingleConnection } from "@/app/api/providers/[id]/test/testUtils.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200 })));
});
afterEach(() => vi.unstubAllGlobals());

describe("Qoder provider validation region", () => {
  it.each([
    ["qoder", "https://openapi.qoder.sh/api/v1/jobToken/exchange"],
    ["qoder-cn", "https://openapi.qoder.com.cn/api/v1/jobToken/exchange"],
  ])("exchanges %s PAT credentials through the correct host", async (provider, exchangeUrl) => {
    mocks.getProviderConnectionById.mockResolvedValue({
      id: "connection-1", provider, authType: "apikey", apiKey: "pt-fixture",
    });
    const result = await testSingleConnection("connection-1");
    expect(result.valid).toBe(true);
    expect(fetch).toHaveBeenCalledWith(exchangeUrl, expect.objectContaining({ method: "POST" }));
    expect(mocks.updateProviderConnection).toHaveBeenCalledWith("connection-1", expect.objectContaining({ testStatus: "active" }));
  });
});
