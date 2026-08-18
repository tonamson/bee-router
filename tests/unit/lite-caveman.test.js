import { describe, it, expect } from "vitest";
import { applyLiteCompression } from "../../open-sse/rtk/lite.js";
import { cavemanCompress } from "../../open-sse/rtk/cavemanCompress.js";
import { applyRulesToText, getRulesForContext } from "../../open-sse/rtk/cavemanRules.js";

describe("applyLiteCompression", () => {
  it("collapses blank lines and trailing spaces", () => {
    const body = {
      messages: [
        { role: "user", content: "hello   \n\n\n\nworld   " },
      ],
    };
    const stats = applyLiteCompression(body);
    expect(body.messages[0].content).toBe("hello\n\nworld");
    expect(stats.hits).toContain("whitespace");
  });

  it("does not cap long tool output", () => {
    const long = "x".repeat(3000);
    const body = { messages: [{ role: "tool", content: long }] };
    const stats = applyLiteCompression(body);
    expect(body.messages[0].content).toBe(long);
    expect(stats).toBeNull();
  });

  it("minifies pretty JSON tool output", () => {
    const pretty = '{\n  "id": 1,\n  "name": "ada"\n}';
    const body = { messages: [{ role: "tool", content: pretty }] };
    const stats = applyLiteCompression(body);
    expect(body.messages[0].content).toBe('{"id":1,"name":"ada"}');
    expect(stats.hits).toContain("json");
    expect(JSON.parse(body.messages[0].content)).toEqual({ id: 1, name: "ada" });
  });

  it("strips ANSI and progress CR from tool output", () => {
    const raw = "\u001b[32mDownloading...\u001b[0m\r\u001b[32mDone\u001b[0m\n";
    const body = { messages: [{ role: "tool", content: raw }] };
    const stats = applyLiteCompression(body);
    expect(body.messages[0].content).toBe("Done\n");
    expect(stats.hits).toContain("ansi");
  });

  it("minifies OpenAI tool call arguments", () => {
    const pretty = '{\n  "path": "src/a.js"\n}';
    const body = {
      messages: [{
        role: "assistant",
        content: null,
        tool_calls: [{ id: "c1", type: "function", function: { name: "Read", arguments: pretty } }],
      }],
    };
    applyLiteCompression(body);
    expect(body.messages[0].tool_calls[0].function.arguments).toBe('{"path":"src/a.js"}');
  });

  it("applies lossless cleanup to Gemini contents", () => {
    const pretty = '{\n  "ok": true\n}';
    const body = {
      contents: [{ role: "user", parts: [{ functionResponse: { name: "x", response: pretty } }] }],
    };
    applyLiteCompression(body);
    expect(body.contents[0].parts[0].functionResponse.response).toBe('{"ok":true}');
  });

  it("applies lossless cleanup to Antigravity request.contents", () => {
    const pretty = '{\n  "ok": true\n}';
    const body = {
      userAgent: "antigravity",
      request: {
        contents: [{ role: "user", parts: [{ functionResponse: { name: "x", response: pretty } }] }],
      },
    };
    const stats = applyLiteCompression(body);
    expect(stats).not.toBeNull();
    expect(body.request.contents[0].parts[0].functionResponse.response).toBe('{"ok":true}');
  });

  it("minifies JSON nested in Antigravity functionResponse.result", () => {
    const pretty = '{\n  "ok": true\n}';
    const body = {
      userAgent: "antigravity",
      request: {
        contents: [{
          role: "user",
          parts: [{ functionResponse: { name: "x", response: { result: pretty } } }],
        }],
      },
    };
    applyLiteCompression(body);
    expect(body.request.contents[0].parts[0].functionResponse.response.result).toBe('{"ok":true}');
  });

  it("applies lossless cleanup to Kiro tool results", () => {
    const pretty = '{\n  "ok": true\n}';
    const body = {
      conversationState: {
        history: [{
          userInputMessage: {
            content: "go",
            userInputMessageContext: {
              toolResults: [{ content: [{ text: pretty }] }],
            },
          },
        }],
      },
    };
    applyLiteCompression(body);
    expect(body.conversationState.history[0].userInputMessage.userInputMessageContext.toolResults[0].content[0].text)
      .toBe('{"ok":true}');
  });

  it("leaves CRLF newlines intact", () => {
    const body = { messages: [{ role: "user", content: "a\r\nb" }] };
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.messages[0].content).toBe("a\r\nb");
  });

  it("drops consecutive duplicate messages", () => {
    const body = {
      messages: [
        { role: "user", content: "same" },
        { role: "user", content: "same" },
        { role: "assistant", content: "ok" },
      ],
    };
    applyLiteCompression(body);
    expect(body.messages).toHaveLength(2);
  });

  it("returns null when nothing changes", () => {
    const body = { messages: [{ role: "user", content: "short" }] };
    expect(applyLiteCompression(body)).toBeNull();
  });

  it("does not cap or rewrite a tool message with cache_control", () => {
    const long = "x".repeat(3000);
    const body = {
      messages: [{ role: "tool", cache_control: { type: "ephemeral" }, content: long }],
    };
    const stats = applyLiteCompression(body);
    expect(body.messages[0].content).toBe(long);
    expect(stats).toBeNull();
  });
});

describe("cavemanCompress", () => {
  it("strips filler from user prose", () => {
    const body = {
      messages: [
        {
          role: "user",
          content: "Please could you please explain in detail how the authentication basically works? Thank you so much.",
        },
      ],
    };
    const stats = cavemanCompress(body, true, "full");
    expect(stats).not.toBeNull();
    expect(body.messages[0].content.length).toBeLessThan(
      "Please could you please explain in detail how the authentication basically works? Thank you so much.".length,
    );
    expect(body.messages[0].content.toLowerCase()).not.toContain("please");
    expect(body.messages[0].content.toLowerCase()).not.toContain("thank you");
  });

  it("leaves tool messages untouched", () => {
    const tool = "On branch main\nChanges not staged for commit:\n  modified: src/a.js\n".repeat(5);
    const body = { messages: [{ role: "tool", content: tool }] };
    cavemanCompress(body, true, "full");
    expect(body.messages[0].content).toBe(tool);
  });

  it("preserves code fences and URLs", () => {
    const src = "Please look at https://example.com/auth and ```\nconst please = 1;\n``` thanks.";
    const body = { messages: [{ role: "user", content: src }] };
    cavemanCompress(body, true, "lite");
    expect(body.messages[0].content).toContain("https://example.com/auth");
    expect(body.messages[0].content).toContain("const please = 1;");
  });

  it("is a no-op when disabled", () => {
    const body = { messages: [{ role: "user", content: "Please explain this in detail please thanks." }] };
    expect(cavemanCompress(body, false, "full")).toBeNull();
    expect(body.messages[0].content).toBe("Please explain this in detail please thanks.");
  });
});

describe("applyRulesToText", () => {
  it("never grows text", () => {
    const rules = getRulesForContext("user", "ultra");
    const samples = [
      "Please explain the database configuration implementation.",
      "I want to make sure to fix the bug.",
      "Hi there, can you tell me how this works?",
    ];
    for (const s of samples) {
      const { text } = applyRulesToText(s, rules);
      expect(text.length).toBeLessThanOrEqual(s.length);
    }
  });
});
