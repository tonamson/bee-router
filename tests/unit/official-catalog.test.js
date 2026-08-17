import { describe, it, expect } from "vitest";
import { canonicalModelId, getPricingForModel } from "../../open-sse/providers/pricing.js";
import {
  perTokenToPerMillion,
  litellmRowToRates,
  applyCatalogToKnownModels,
} from "../../src/lib/pricing/officialCatalog.js";

describe("official catalog mapper", () => {
  it("converts per-token dollars to $/1M", () => {
    expect(perTokenToPerMillion(2.5e-6)).toBe(2.5);
    expect(perTokenToPerMillion(1e-7)).toBe(0.1);
    expect(perTokenToPerMillion(null)).toBe(null);
  });

  it("maps LiteLLM row fields", () => {
    const rates = litellmRowToRates({
      input_cost_per_token: 3e-6,
      output_cost_per_token: 1.5e-5,
      cache_read_input_token_cost: 3e-7,
      cache_creation_input_token_cost: 3.75e-6,
      output_cost_per_reasoning_token: 1.5e-5,
    });
    expect(rates).toEqual({
      input: 3,
      output: 15,
      cached: 0.3,
      cache_creation: 3.75,
      reasoning: 15,
    });
  });

  it("folds vendor / punctuation / date into one canonical id", () => {
    expect(canonicalModelId("xai/grok-4.6")).toBe("grok-4-6");
    expect(canonicalModelId("grok-4-6")).toBe("grok-4-6");
    expect(canonicalModelId("anthropic/claude-sonnet-4.5-20250929")).toBe("claude-sonnet-4-5");
    expect(canonicalModelId("claude-sonnet-4-5")).toBe("claude-sonnet-4-5");
  });

  it("same canonical id shares one price row", () => {
    const a = getPricingForModel("xai", "xai/grok-4.6");
    const b = getPricingForModel("openai", "grok-4-6");
    expect(a).toEqual(b);
    expect(a).toBeTruthy();
  });

  it("stores catalog under _canonical ids only", () => {
    const catalog = {
      sample_spec: {},
      "gpt-4o": { input_cost_per_token: 2.5e-6, output_cost_per_token: 1e-5 },
      "openai/gpt-4o-mini": { input_cost_per_token: 1.5e-7, output_cost_per_token: 6e-7 },
    };
    const known = {
      openai: { "gpt-4o": { input: 9 }, "gpt-4o-mini": { input: 9 }, "unknown-x": { input: 1 } },
    };
    const { catalog: out, matched, missed } = applyCatalogToKnownModels(catalog, known);
    expect(matched).toBe(2);
    expect(missed).toBe(1);
    expect(out._canonical["gpt-4o"].input).toBe(2.5);
    expect(out._canonical["gpt-4o-mini"].input).toBe(0.15);
    expect(out.openai).toBeUndefined();
  });
});
