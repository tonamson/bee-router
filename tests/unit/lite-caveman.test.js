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

  it("caps long tool output at 2000 chars", () => {
    const long = "x".repeat(3000);
    const body = { messages: [{ role: "tool", content: long }] };
    applyLiteCompression(body);
    expect(body.messages[0].content.length).toBeLessThan(2100);
    expect(body.messages[0].content).toContain("...[truncated]");
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
