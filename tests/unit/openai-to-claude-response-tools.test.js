import { describe, expect, it } from "vitest";
import { openaiToClaudeResponse } from "../../open-sse/translator/response/openai-to-claude.js";

function createState() {
  return { toolCalls: new Map(), nextBlockIndex: 0 };
}

function getInputJsonDelta(events) {
  return events.find((event) => event.type === "content_block_delta" && event.delta?.type === "input_json_delta")?.delta.partial_json;
}

describe("openaiToClaudeResponse tool argument sanitization", () => {
  it("drops invalid Read pages and clamps numeric bounds", () => {
    const state = createState();

    openaiToClaudeResponse({
      id: "chatcmpl-test-read",
      model: "test-model",
      choices: [{ delta: { tool_calls: [{ index: 0, id: "toolu_read", function: { name: "Read" } }] } }],
    }, state);

    const events = openaiToClaudeResponse({
      id: "chatcmpl-test-read",
      model: "test-model",
      choices: [{
        delta: { tool_calls: [{ index: 0, function: { arguments: JSON.stringify({ file_path: "F:/repo/file.js", offset: -5, limit: 999999999, pages: "" }) } }] },
        finish_reason: "tool_calls",
      }],
    }, state);

    expect(JSON.parse(getInputJsonDelta(events))).toEqual({
      file_path: "F:/repo/file.js",
      offset: 0,
      limit: 2000,
    });
  });

  it("keeps valid PDF pages", () => {
    const state = createState();

    openaiToClaudeResponse({
      id: "chatcmpl-test-pdf",
      model: "test-model",
      choices: [{ delta: { tool_calls: [{ index: 0, id: "toolu_pdf", function: { name: "proxy_Read" } }] } }],
    }, state);

    const events = openaiToClaudeResponse({
      id: "chatcmpl-test-pdf",
      model: "test-model",
      choices: [{
        delta: { tool_calls: [{ index: 0, function: { arguments: JSON.stringify({ file_path: "F:/repo/doc.pdf", pages: "1-3" }) } }] },
        finish_reason: "tool_calls",
      }],
    }, state);

    expect(JSON.parse(getInputJsonDelta(events))).toEqual({
      file_path: "F:/repo/doc.pdf",
      pages: "1-3",
    });
  });
});

function collect(...batches) {
  return batches.flatMap((events) => events || []);
}

describe("openaiToClaudeResponse ListDir / empty tool_use.input", () => {
  it("emits ListDir path when arguments are complete JSON without finish_reason", () => {
    const state = createState();
    const events = openaiToClaudeResponse({
      id: "chatcmpl-listdir",
      model: "test-model",
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            id: "call_ld",
            function: {
              name: "ListDir",
              arguments: JSON.stringify({ path: "/Volumes/Code/Opensource/mrouter" }),
            },
          }],
        },
      }],
    }, state);

    expect(JSON.parse(getInputJsonDelta(events))).toEqual({
      path: "/Volumes/Code/Opensource/mrouter",
    });
  });

  it("stringifies object ListDir arguments instead of [object Object]", () => {
    const state = createState();
    const events = openaiToClaudeResponse({
      id: "chatcmpl-listdir-obj",
      model: "test-model",
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            id: "call_ld",
            function: {
              name: "ListDir",
              arguments: { path: "/Volumes/Code/Opensource/mrouter" },
            },
          }],
        },
        finish_reason: "tool_calls",
      }],
    }, state);

    const raw = getInputJsonDelta(events);
    expect(raw).not.toContain("[object Object]");
    expect(JSON.parse(raw)).toEqual({ path: "/Volumes/Code/Opensource/mrouter" });
  });

  it("keeps arguments that arrive before the tool id", () => {
    const state = createState();
    openaiToClaudeResponse({
      id: "chatcmpl-listdir-late-id",
      model: "test-model",
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            function: { arguments: JSON.stringify({ path: "/tmp/repo" }) },
          }],
        },
      }],
    }, state);

    const events = openaiToClaudeResponse({
      id: "chatcmpl-listdir-late-id",
      model: "test-model",
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            id: "call_late",
            function: { name: "ListDir" },
          }],
        },
        finish_reason: "tool_calls",
      }],
    }, state);

    expect(JSON.parse(getInputJsonDelta(events))).toEqual({ path: "/tmp/repo" });
  });

  it("flushes leftover ListDir args and message_stop when stream ends without finish_reason", () => {
    const state = createState();
    const start = openaiToClaudeResponse({
      id: "chatcmpl-listdir-flush",
      model: "test-model",
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            id: "call_ld",
            function: { name: "ListDir", arguments: '{"path":' },
          }],
        },
      }],
    }, state);
    const mid = openaiToClaudeResponse({
      id: "chatcmpl-listdir-flush",
      model: "test-model",
      choices: [{
        delta: {
          tool_calls: [{ index: 0, function: { arguments: '"/repo"}' } }],
        },
      }],
    }, state);
    const flushed = openaiToClaudeResponse(null, state);
    const events = collect(start, mid, flushed);

    expect(JSON.parse(getInputJsonDelta(events))).toEqual({ path: "/repo" });
    expect(events.some((event) => event.type === "message_stop")).toBe(true);
    expect(events.some((event) => event.delta?.stop_reason === "tool_use")).toBe(true);
  });
});
