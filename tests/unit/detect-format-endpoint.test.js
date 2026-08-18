import { describe, expect, it } from "vitest";
import { detectFormatByEndpoint, FORMATS } from "../../open-sse/translator/formats.js";
import { detectFormat } from "../../open-sse/services/provider.js";

describe("detectFormatByEndpoint", () => {
  it("treats CloudCode /v1internal as antigravity even without userAgent", () => {
    expect(detectFormatByEndpoint("/api/v1internal", { request: { contents: [] } }))
      .toBe(FORMATS.ANTIGRAVITY);
    expect(detectFormatByEndpoint("/v1internal:streamGenerateContent", {}))
      .toBe(FORMATS.ANTIGRAVITY);
  });

  it("does not force gemini on /v1beta (route already converts to OpenAI)", () => {
    expect(detectFormatByEndpoint("/api/v1beta/models/x:streamGenerateContent", {
      contents: [],
    })).toBeNull();
  });
});

describe("detectFormat CloudCode body", () => {
  it("classifies request.contents as antigravity without userAgent", () => {
    expect(detectFormat({
      model: "gemini-3.1-pro",
      request: { contents: [{ role: "user", parts: [{ text: "hi" }] }] },
    })).toBe("antigravity");
  });
});
