import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseQuotaData } from "../../src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js";

const SUMMARY_GROUPS = {
  groups: [
    {
      displayName: "Gemini models",
      buckets: [
        {
          bucketId: "gemini-5h",
          displayName: "Five Hour Limit",
          window: "five_hour",
          remainingFraction: 0.4,
          resetTime: "2026-08-21T12:00:00Z",
        },
        {
          bucketId: "gemini-weekly",
          displayName: "Weekly Limit",
          window: "weekly",
          remainingFraction: 0.9,
          resetTime: "2026-08-25T00:00:00Z",
        },
      ],
    },
    {
      displayName: "Claude and GPT models",
      buckets: [
        {
          bucketId: "3p-5h",
          displayName: "Five Hour Limit",
          window: "5h",
          remainingFraction: 1,
          resetTime: "2026-08-21T12:00:00Z",
        },
        {
          bucketId: "3p-weekly",
          displayName: "Weekly Limit",
          window: "weekly",
          remainingFraction: 0.7,
          resetTime: "2026-08-25T00:00:00Z",
        },
        {
          displayName: "Weekly Limit",
          window: "weekly",
          remainingFraction: 0.5,
          resetTime: "2026-08-25T00:00:00Z",
        },
      ],
    },
  ],
};

const MODEL_QUOTAS = {
  models: {
    "gemini-3.7-flash-high": {
      displayName: "Gemini 3.7 Flash (High)",
      quotaInfo: { remainingFraction: 0.85, resetTime: "2026-08-21T12:00:00Z" },
    },
    "gemini-3.7-flash-tiered": {
      displayName: "Gemini 3.7 Flash",
      quotaInfo: { remainingFraction: 0.85, resetTime: "2026-08-21T12:00:00Z" },
    },
    tab_flash_lite_preview: {
      quotaInfo: { remainingFraction: 1 },
    },
    chat_20706: {
      quotaInfo: { remainingFraction: 1 },
    },
  },
};

function mockByUrl(handlers) {
  return vi.fn(async (url) => {
    const json = handlers(String(url || ""));
    return {
      ok: json.ok !== false,
      status: json.status || 200,
      json: async () => json.body ?? {},
      text: async () => "{}",
    };
  });
}

const proxyAwareFetch = mockByUrl((url) => {
  if (url.includes(":loadCodeAssist")) {
    return { body: { cloudaicompanionProject: "project-1", currentTier: { name: "Pro" } } };
  }
  if (url.includes(":retrieveUserQuotaSummary")) {
    return { body: SUMMARY_GROUPS };
  }
  return { body: MODEL_QUOTAS };
});

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch,
}));

describe("Antigravity weekly quota from retrieveUserQuotaSummary", () => {
  beforeEach(() => proxyAwareFetch.mockClear());

  it("exposes Gemini and Claude/GPT weekly pools so dashboard/quota can render them", async () => {
    const { getAntigravityUsage } = await import("../../open-sse/services/usage/google.js");

    const usage = await getAntigravityUsage("access-token", {});

    expect(usage.quotas["gemini-weekly"]).toMatchObject({
      used: 100,
      total: 1000,
      remainingPercentage: 90,
      displayName: "Gemini weekly",
    });
    expect(usage.quotas["3p-weekly"]).toMatchObject({
      used: 300,
      total: 1000,
      remainingPercentage: 70,
      displayName: "Claude + GPT weekly",
    });
    expect(usage.quotas["gemini-5h"]).toMatchObject({
      remainingPercentage: 40,
      displayName: "Gemini 5h",
    });
    expect(usage.quotas["3p-5h"]).toMatchObject({
      remainingPercentage: 100,
      displayName: "Claude + GPT 5h",
    });
    expect(usage.quotas["gemini-3.7-flash-high"]).toBeUndefined();
    expect(usage.quotas).not.toHaveProperty("undefined");
    expect(usage.message).toBeUndefined();
  });

  it("keeps per-model 5h bars when the weekly summary endpoint fails", async () => {
    proxyAwareFetch.mockImplementation(async (url) => {
      const href = String(url || "");
      if (href.includes(":loadCodeAssist")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ cloudaicompanionProject: "project-1", currentTier: { name: "Pro" } }),
          text: async () => "{}",
        };
      }
      if (href.includes(":retrieveUserQuotaSummary")) {
        return { ok: false, status: 404, json: async () => ({}), text: async () => "{}" };
      }
      return {
        ok: true,
        status: 200,
        json: async () => MODEL_QUOTAS,
        text: async () => "{}",
      };
    });

    const { getAntigravityUsage } = await import("../../open-sse/services/usage/google.js");
    const usage = await getAntigravityUsage("access-token", {});

    expect(usage.quotas["gemini-3.7-flash-high"]).toMatchObject({ remainingPercentage: 85 });
    expect(usage.quotas["gemini-weekly"]).toBeUndefined();
  });

  it("keeps weekly pools when fetchAvailableModels is forbidden", async () => {
    proxyAwareFetch.mockImplementation(async (url) => {
      const href = String(url || "");
      if (href.includes(":loadCodeAssist")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ cloudaicompanionProject: "project-1", currentTier: { name: "Pro" } }),
          text: async () => "{}",
        };
      }
      if (href.includes(":retrieveUserQuotaSummary")) {
        return {
          ok: true,
          status: 200,
          json: async () => SUMMARY_GROUPS,
          text: async () => "{}",
        };
      }
      return { ok: false, status: 403, json: async () => ({}), text: async () => "{}" };
    });

    const { getAntigravityUsage } = await import("../../open-sse/services/usage/google.js");
    const usage = await getAntigravityUsage("access-token", {});

    expect(usage.quotas["gemini-weekly"]).toMatchObject({ remainingPercentage: 90 });
    expect(usage.quotas["gemini-3.7-flash-high"]).toBeUndefined();
    expect(usage.message).toBeUndefined();
  });

  it("lists weekly pools before per-model 5h bars on dashboard/quota", () => {
    const rows = parseQuotaData("antigravity", {
      quotas: {
        "gemini-3.7-flash-high": {
          displayName: "Gemini 3.7 Flash (High)",
          used: 150,
          total: 1000,
        },
        "gemini-weekly": {
          displayName: "Gemini weekly",
          used: 100,
          total: 1000,
          window: "weekly",
        },
        "gemini-5h": {
          displayName: "Gemini 5h",
          used: 600,
          total: 1000,
          window: "5h",
        },
        "3p-weekly": {
          displayName: "Claude + GPT weekly",
          used: 300,
          total: 1000,
          window: "weekly",
        },
      },
    });
    expect(rows.map((row) => row.modelKey)).toEqual([
      "gemini-5h",
      "gemini-weekly",
      "3p-weekly",
      "gemini-3.7-flash-high",
    ]);
  });
});
