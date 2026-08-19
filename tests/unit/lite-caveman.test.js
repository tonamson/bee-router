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

  it("leaves pretty JSON tool output untouched", () => {
    const pretty = '{\n  "id": 1,\n  "name": "ada"\n}';
    const body = { messages: [{ role: "tool", content: pretty }] };
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.messages[0].content).toBe(pretty);
  });

  it("leaves ANSI tool output untouched", () => {
    const raw = "\u001b[32mDownloading...\u001b[0m\r\u001b[32mDone\u001b[0m\n";
    const body = { messages: [{ role: "tool", content: raw }] };
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.messages[0].content).toBe(raw);
  });

  it("leaves tool-call arguments untouched", () => {
    const pretty = '{\n  "path": "src/a.js"\n}';
    const body = {
      messages: [{
        role: "assistant",
        content: null,
        tool_calls: [{ id: "c1", type: "function", function: { name: "Read", arguments: pretty } }],
      }],
    };
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.messages[0].tool_calls[0].function.arguments).toBe(pretty);
  });

  it("leaves lone CR in file dumps (no ANSI)", () => {
    const dump = "line one\rline two\nfunction foo() {\n  return 1;\n}\n";
    const body = { messages: [{ role: "tool", content: dump }] };
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.messages[0].content).toBe(dump);
  });

  it("does not rewrite Gemini thought parts", () => {
    const thought = "thinking about the file   \n\n\n\nplease wait";
    const body = {
      contents: [{
        role: "model",
        parts: [
          { thought: true, text: thought },
          { thoughtSignature: "sig", text: "" },
          { text: "ok" },
        ],
      }],
    };
    applyLiteCompression(body);
    expect(body.contents[0].parts[0].text).toBe(thought);
  });

  it("does not rewrite Gemini thoughtSignature text", () => {
    const signed = "after thinking   \n\n\n\nkeep me";
    const body = {
      request: {
        contents: [{
          role: "model",
          parts: [
            { thought: true, text: "scratch   " },
            { thoughtSignature: "sig", text: signed },
            { functionCall: { name: "Read", args: { path: "a.js" } } },
          ],
        }],
      },
    };
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.request.contents[0].parts[1].text).toBe(signed);
  });

  it("leaves Gemini functionResponse untouched", () => {
    const pretty = '{\n  "ok": true\n}';
    const body = {
      contents: [{ role: "user", parts: [{ functionResponse: { name: "x", response: pretty } }] }],
    };
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.contents[0].parts[0].functionResponse.response).toBe(pretty);
  });

  it("leaves Antigravity functionResponse untouched", () => {
    const pretty = '{\n  "ok": true\n}';
    const body = {
      userAgent: "antigravity",
      request: {
        contents: [{ role: "user", parts: [{ functionResponse: { name: "x", response: pretty } }] }],
      },
    };
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.request.contents[0].parts[0].functionResponse.response).toBe(pretty);
  });

  it("leaves nested Antigravity functionResponse.result untouched", () => {
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
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.request.contents[0].parts[0].functionResponse.response.result).toBe(pretty);
  });

  it("leaves Kiro tool results untouched", () => {
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
    expect(applyLiteCompression(body)).toBeNull();
    expect(body.conversationState.history[0].userInputMessage.userInputMessageContext.toolResults[0].content[0].text)
      .toBe(pretty);
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

  it("rewrites Gemini user prose and skips functionResponse", () => {
    const prose = "Please could you please explain in detail how the authentication basically works? Thank you so much.";
    const tool = "On branch main\nChanges not staged for commit:\n  modified: src/a.js\n".repeat(5);
    const body = {
      contents: [
        { role: "user", parts: [{ text: prose }] },
        { role: "user", parts: [{ functionResponse: { name: "Bash", response: { result: tool } } }] },
      ],
    };
    const stats = cavemanCompress(body, true, "full");
    expect(stats).not.toBeNull();
    expect(body.contents[0].parts[0].text.length).toBeLessThan(prose.length);
    expect(body.contents[1].parts[0].functionResponse.response.result).toBe(tool);
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
