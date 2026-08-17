import { describe, it, expect } from "vitest";
import { convertResponsesStreamToJson } from "../../open-sse/transformer/streamToJsonConverter.js";
import { canonicalizeUsage } from "../../open-sse/utils/usageTracking.js";

function sseStream(text) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

describe("convertResponsesStreamToJson keeps xAI/Grok cache details", () => {
  it("copies input_tokens_details.cached_tokens from response.completed", async () => {
    const raw = [
      "event: response.created",
      'data: {"type":"response.created","response":{"id":"resp_g","created_at":1700000000}}',
      "",
      "event: response.output_item.done",
      'data: {"type":"response.output_item.done","output_index":0,"item":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"ok"}]}}',
      "",
      "event: response.completed",
      'data: {"type":"response.completed","response":{"id":"resp_g","usage":{"input_tokens":125,"output_tokens":48,"total_tokens":173,"input_tokens_details":{"cached_tokens":98},"output_tokens_details":{"reasoning_tokens":12}}}}',
      "",
    ].join("\n");

    const json = await convertResponsesStreamToJson(sseStream(raw));
    expect(json.usage.input_tokens).toBe(125);
    expect(json.usage.output_tokens).toBe(48);
    expect(json.usage.input_tokens_details).toEqual({ cached_tokens: 98 });
    expect(json.usage.output_tokens_details).toEqual({ reasoning_tokens: 12 });

    const canon = canonicalizeUsage(json.usage);
    expect(canon.prompt_tokens).toBe(125);
    expect(canon.cached_tokens).toBe(98);
    expect(canon.reasoning_tokens).toBe(12);
  });
});
