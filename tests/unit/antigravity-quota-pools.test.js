import { describe, expect, it } from "vitest";
import {
  antigravityPoolIdsForModel,
  readModelQuota,
} from "../../open-sse/services/usage/google.js";

describe("antigravityPoolIdsForModel", () => {
  it("maps Gemini model ids to the Gemini pools", () => {
    expect(antigravityPoolIdsForModel("gemini-3.7-flash-high")).toEqual([
      "gemini-5h",
      "gemini-weekly",
    ]);
    expect(antigravityPoolIdsForModel("gemini-3.1-flash-image")).toEqual([
      "gemini-5h",
      "gemini-weekly",
    ]);
  });

  it("maps Claude and GPT model ids to the third-party pools", () => {
    expect(antigravityPoolIdsForModel("claude-opus-4-6-thinking")).toEqual([
      "3p-5h",
      "3p-weekly",
    ]);
    expect(antigravityPoolIdsForModel("gpt-oss-120b-medium")).toEqual([
      "3p-5h",
      "3p-weekly",
    ]);
  });

  it("never throws on junk input", () => {
    expect(antigravityPoolIdsForModel(undefined)).toEqual(["3p-5h", "3p-weekly"]);
    expect(antigravityPoolIdsForModel("")).toEqual(["3p-5h", "3p-weekly"]);
  });
});

describe("readModelQuota", () => {
  const POOLS = {
    "gemini-5h": { remainingPercentage: 40, resetAt: "2026-09-04T12:00:00.000Z" },
    "gemini-weekly": { remainingPercentage: 90, resetAt: "2026-09-08T00:00:00.000Z" },
    "3p-5h": { remainingPercentage: 0, resetAt: "2026-09-04T12:00:00.000Z" },
    "3p-weekly": { remainingPercentage: 0, resetAt: "2026-09-08T00:00:00.000Z" },
  };

  it("returns the most constrained pool for the model", () => {
    expect(readModelQuota(POOLS, "gemini-3.7-flash-high")).toBe(POOLS["gemini-5h"]);
  });

  it("breaks a tie on the latest reset so an account is not unblocked early", () => {
    expect(readModelQuota(POOLS, "claude-opus-4-6-thinking")).toBe(POOLS["3p-weekly"]);
  });

  it("prefers an exact per-model key over the pool", () => {
    const withStrike = {
      ...POOLS,
      "claude-opus-4-6-thinking": { remainingPercentage: 0, resetAt: "2026-09-04T09:15:00.000Z" },
    };
    expect(readModelQuota(withStrike, "claude-opus-4-6-thinking"))
      .toBe(withStrike["claude-opus-4-6-thinking"]);
  });

  it("returns null when nothing resolves", () => {
    expect(readModelQuota(null, "gemini-3.7-flash-high")).toBeNull();
    expect(readModelQuota({}, "gemini-3.7-flash-high")).toBeNull();
    expect(readModelQuota(POOLS, "")).toBeNull();
  });

  it("tolerates a pool with no resetAt", () => {
    const partial = {
      "gemini-5h": { remainingPercentage: 0 },
      "gemini-weekly": { remainingPercentage: 0, resetAt: "2026-09-08T00:00:00.000Z" },
    };
    expect(readModelQuota(partial, "gemini-3.7-flash-high")).toBe(partial["gemini-weekly"]);
  });
});
