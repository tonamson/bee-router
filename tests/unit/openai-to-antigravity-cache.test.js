import { describe, expect, it } from "vitest";
import { openaiToAntigravityResponse } from "../../open-sse/translator/response/openai-to-antigravity.js";

describe("openaiToAntigravityResponse cache mapping", () => {
  it("maps top-level cached_tokens (canonical usage) to cachedContentTokenCount", () => {
    const out = openaiToAntigravityResponse({
      id: "chatcmpl-1",
      model: "gemini-3-flash",
      choices: [{ delta: { content: "ok" }, finish_reason: "stop" }],
      usage: {
        prompt_tokens: 2000,
        completion_tokens: 10,
        total_tokens: 2010,
        cached_tokens: 1800,
      },
    }, {});
    expect(out.response.usageMetadata.cachedContentTokenCount).toBe(1800);
  });

  it("still maps prompt_tokens_details.cached_tokens", () => {
    const out = openaiToAntigravityResponse({
      id: "chatcmpl-1",
      model: "gemini-3-flash",
      choices: [{ delta: {}, finish_reason: "stop" }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 2,
        total_tokens: 102,
        prompt_tokens_details: { cached_tokens: 80 },
      },
    }, {});
    expect(out.response.usageMetadata.cachedContentTokenCount).toBe(80);
  });

  it("omits cachedContentTokenCount when cache is 0", () => {
    const out = openaiToAntigravityResponse({
      id: "chatcmpl-1",
      model: "gemini-3-flash",
      choices: [{ delta: {}, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 1, total_tokens: 11, cached_tokens: 0 },
    }, {});
    expect(out.response.usageMetadata.cachedContentTokenCount).toBeUndefined();
  });
});
