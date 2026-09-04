/**
 * Producer→consumer contract. tests/unit/antigravity-quota-weekly.test.js
 * exercises the real getAntigravityUsage but stops at its return value;
 * tests/unit/antigravity-quota-routing.test.js mocks getAntigravityUsage
 * entirely. Neither notices when the producer's key space stops matching what
 * the router looks up. This file mocks only the network.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProviderConnections: vi.fn(),
  getSettings: vi.fn(),
  resolveConnectionProxyConfig: vi.fn(),
  proxyAwareFetch: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  getProviderConnections: mocks.getProviderConnections,
  getSettings: mocks.getSettings,
  getProxyPools: vi.fn(),
  validateApiKey: vi.fn(),
  updateProviderConnection: vi.fn(),
}));
vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: mocks.resolveConnectionProxyConfig,
  pickProxyPoolId: vi.fn(),
}));
vi.mock("@/shared/constants/providers.js", () => ({
  FREE_PROVIDERS: {},
  resolveProviderId: (provider) => provider,
}));
vi.mock("@/sse/utils/logger.js", () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn() }));
vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: mocks.proxyAwareFetch,
}));

const { getAntigravityQuotaCache, handleAntigravityQuotaError, resetAntigravityQuotaStateForTests } =
  await import("@/sse/services/antigravityQuota.js");
const { getProviderCredentials } = await import("@/sse/services/auth.js");

const FIVE_H_RESET = "2026-09-04T14:00:00.000Z";
const WEEKLY_RESET = "2026-09-08T00:00:00.000Z";

// Shaped after tests/fixtures/antigravity-quota-summary.json (Task 1).
const SUMMARY = {
  groups: [
    {
      displayName: "Gemini models",
      buckets: [
        { bucketId: "gemini-5h", window: "five_hour", remainingFraction: 0.4, resetTime: FIVE_H_RESET },
        { bucketId: "gemini-weekly", window: "weekly", remainingFraction: 0.9, resetTime: WEEKLY_RESET },
      ],
    },
    {
      displayName: "Claude and GPT models",
      buckets: [
        { bucketId: "3p-5h", window: "five_hour", remainingFraction: 0, resetTime: FIVE_H_RESET },
        { bucketId: "3p-weekly", window: "weekly", remainingFraction: 0.7, resetTime: WEEKLY_RESET },
      ],
    },
  ],
};

const MODELS = {
  models: {
    "gemini-3.7-flash-high": {
      displayName: "Gemini 3.7 Flash (High)",
      quotaInfo: { remainingFraction: 0.85, resetTime: FIVE_H_RESET },
    },
  },
};

function respond(body) {
  return { ok: true, status: 200, json: async () => body, text: async () => "{}" };
}

beforeEach(() => {
  vi.clearAllMocks();
  getAntigravityQuotaCache().clear();
  resetAntigravityQuotaStateForTests();
  mocks.resolveConnectionProxyConfig.mockResolvedValue({});
  mocks.getSettings.mockResolvedValue({});
  mocks.proxyAwareFetch.mockImplementation(async (url) => {
    const href = String(url || "");
    if (href.includes(":loadCodeAssist")) {
      return respond({ cloudaicompanionProject: "project-1", currentTier: { name: "Pro" } });
    }
    if (href.includes(":retrieveUserQuotaSummary")) return respond(SUMMARY);
    return respond(MODELS);
  });
});

describe("Antigravity quota producer→consumer contract", () => {
  it("uses the exhausted 3p 5h pool's reset time on the first 429", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    try {
      const result = await handleAntigravityQuotaError(
        "ag-a", 429, "claude-opus-4-6-thinking", "token", {},
      );
      expect(result).toBe(Date.parse(FIVE_H_RESET));
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not block a Gemini model whose pool still has quota", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    try {
      const result = await handleAntigravityQuotaError(
        "ag-b", 429, "gemini-3.7-flash-high", "token", {},
      );
      // 40% remaining → optimistic reading → strike path, no immediate block.
      expect(result).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  // Task 5: pre-filter now pool-aware via readModelQuota (was it.skip in Task 4).
  it("skips the account whose pool is exhausted and picks the next one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    mocks.getProviderConnections.mockResolvedValue([
      { id: "ag-a", email: "a@example.com", isActive: true, accessToken: "t-a" },
      { id: "ag-b", email: "b@example.com", isActive: true, accessToken: "t-b" },
    ]);
    try {
      await handleAntigravityQuotaError("ag-a", 429, "claude-opus-4-6-thinking", "token", {});
      const creds = await getProviderCredentials(
        "antigravity",
        null,
        "claude-opus-4-6-thinking",
      );
      expect(creds?.connectionId).toBe("ag-b");
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports the pool reset time when every account is exhausted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00.000Z"));
    mocks.getProviderConnections.mockResolvedValue([
      { id: "ag-a", email: "a@example.com", isActive: true, accessToken: "t-a" },
    ]);
    try {
      await handleAntigravityQuotaError("ag-a", 429, "claude-opus-4-6-thinking", "token", {});
      const creds = await getProviderCredentials(
        "antigravity",
        null,
        "claude-opus-4-6-thinking",
      );
      expect(creds).toEqual(
        expect.objectContaining({ allRateLimited: true, retryAfter: FIVE_H_RESET }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
