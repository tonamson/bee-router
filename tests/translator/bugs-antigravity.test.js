// Real Antigravity-MITM requests (Gemini-internal: { request: { contents, ... } }) → OpenAI.
import { describe, it, expect } from "vitest";
import "./registerAll.js";
import { translateRequest, translateResponse, initState } from "../../open-sse/translator/index.js";
import { FORMATS } from "../../open-sse/translator/formats.js";
import { AntigravityExecutor } from "../../open-sse/executors/antigravity.js";
import { openaiToAntigravityRequest } from "../../open-sse/translator/request/openai-to-gemini.js";
import { openaiToAntigravityResponse } from "../../open-sse/translator/response/openai-to-antigravity.js";
import { cleanJSONSchemaForAntigravity } from "../../open-sse/translator/formats/gemini.js";
import { ANTIGRAVITY_DEFAULT_SYSTEM } from "../../open-sse/config/appConstants.js";

const AG2O = (req) =>
  translateRequest(FORMATS.ANTIGRAVITY, FORMATS.OPENAI, "m", { request: req }, true, null, null);

describe("Antigravity → OpenAI", () => {
  // antigravity-to-openai.js — content with BOTH functionResponse and functionCall/text
  // previously returned toolResults early → dropped tool calls / text (fixed in #2225)
  it("functionResponse + functionCall in same content keeps both", () => {
    const out = AG2O({
      contents: [{
        role: "model",
        parts: [
          { functionResponse: { id: "c1", name: "prev", response: { result: "done" } } },
          { functionCall: { id: "c2", name: "next", args: {} } },
        ],
      }],
    });
    const json = JSON.stringify(out);
    expect(json, "functionCall lost when sharing content with functionResponse").toContain("\"next\"");
  });

  // antigravity-to-openai.js:167 — functionCall without id gets a random Date.now() id
  // KNOWN BUG: unstable id breaks matching with its functionResponse
  it("functionCall without id keeps a stable matchable id", () => {
    const out = AG2O({
      contents: [
        { role: "model", parts: [{ functionCall: { name: "search", args: { q: "x" } } }] },
        { role: "user", parts: [{ functionResponse: { name: "search", response: { result: "r" } } }] },
      ],
    });
    const asst = out.messages.find((m) => m.tool_calls);
    const tool = out.messages.find((m) => m.role === "tool");
    expect(tool?.tool_call_id, "id mismatch between call and response").toBe(asst?.tool_calls?.[0]?.id);
  });

  // antigravity-to-openai.js:144-147 — signature-only part handling (regression guard)
  it("signature-only part does not produce empty text", () => {
    const out = AG2O({
      contents: [{ role: "model", parts: [{ thoughtSignature: "sig", text: "" }] }],
    });
    const asst = out.messages.find((m) => m.role === "assistant");
    const content = asst?.content;
    const hasEmpty = Array.isArray(content)
      ? content.some((c) => c.type === "text" && c.text === "")
      : content === "";
    expect(hasEmpty, "empty text part emitted").toBe(false);
  });
});

describe("Antigravity → Claude", () => {
  it("tool call input_json_delta includes Anthropic index", () => {
    const state = initState(FORMATS.CLAUDE);
    const events = translateResponse(FORMATS.ANTIGRAVITY, FORMATS.CLAUDE, {
      response: {
        responseId: "resp-1",
        modelVersion: "gemini-pro-agent",
        candidates: [{
          content: {
            role: "model",
            parts: [{ functionCall: { name: "bash", args: { command: "git status" } } }],
          },
          finishReason: "STOP",
          index: 0,
        }],
      },
    }, state);

    const jsonDelta = events.find(
      (event) => event.type === "content_block_delta" && event.delta?.type === "input_json_delta"
    );
    expect(jsonDelta).toMatchObject({ index: expect.any(Number) });
    expect(JSON.parse(jsonDelta.delta.partial_json)).toEqual({ command: "git status" });
  });
});

describe("OpenAI → Antigravity tool calls", () => {
  it("keeps ListDir DirectoryPath when arguments arrive as an object", () => {
    const state = {};
    const out = openaiToAntigravityResponse({
      id: "c1",
      model: "x",
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            id: "call_1",
            function: {
              name: "ListDir",
              arguments: { DirectoryPath: "/Volumes/Code/Opensource/mrouter" },
            },
          }],
        },
        finish_reason: "tool_calls",
      }],
    }, state);
    const fc = out.response.candidates[0].content.parts.find((p) => p.functionCall)?.functionCall;
    expect(fc.id).toBe("call_1");
    expect(fc.name).toBe("ListDir");
    expect(fc.args.DirectoryPath).toBe("/Volumes/Code/Opensource/mrouter");
    expect(fc.args.uri).toBe("file:///Volumes/Code/Opensource/mrouter");
  });

  it("maps nested parameters.DirectoryPath to file uri", () => {
    const out = openaiToAntigravityResponse({
      id: "c1",
      model: "x",
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            function: {
              name: "list_dir",
              arguments: {
                parameters: { DirectoryPath: "/Volumes/Code/Opensource/mrouter" },
                reason: "look around",
              },
            },
          }],
        },
        finish_reason: "tool_calls",
      }],
    }, {});
    const fc = out.response.candidates[0].content.parts.find((p) => p.functionCall)?.functionCall;
    expect(fc.args.uri).toBe("file:///Volumes/Code/Opensource/mrouter");
    expect(fc.args.parameters.uri).toBe("file:///Volumes/Code/Opensource/mrouter");
  });

  it("maps Bash/run_command Command to command", () => {
    const out = openaiToAntigravityResponse({
      id: "c1",
      model: "x",
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            function: { name: "Bash", arguments: { Command: "git status" } },
          }],
        },
        finish_reason: "tool_calls",
      }],
    }, {});
    const fc = out.response.candidates[0].content.parts.find((p) => p.functionCall)?.functionCall;
    expect(fc.args.command).toBe("git status");
  });
});

describe("Antigravity executor", () => {
  it("strips optional from nested tool schemas", () => {
    const out = new AntigravityExecutor().transformRequest("gemini-2.5-pro", {
      request: {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [{
          functionDeclarations: [{
            name: "lookup",
            description: "Lookup a value",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query",
                  optional: true,
                },
              },
            },
          }],
        }],
      },
    }, true, { projectId: "project-1", connectionId: "conn-1" });

    const query = out.request.tools[0].functionDeclarations[0].parameters.properties.query;
    expect(query).toEqual({ type: "string", description: "Search query" });
  });

  it("resolves ListDir DirectoryPath $ref instead of replacing it with reason", () => {
    const cleaned = cleanJSONSchemaForAntigravity({
      type: "object",
      properties: {
        DirectoryPath: { $ref: "#/$defs/DirectoryPath" },
      },
      $defs: {
        DirectoryPath: { type: "string", description: "Directory to list" },
      },
    });
    expect(cleaned.properties.DirectoryPath).toEqual({
      type: "string",
      description: "Directory to list",
    });
    expect(cleaned.properties.DirectoryPath.properties?.reason).toBeUndefined();
  });

  it("does not inject the legacy Antigravity default system prompt for Gemini-backed models", () => {
    const out = openaiToAntigravityRequest("gemini-3.5-flash-low", {
      messages: [
        { role: "system", content: "USER_SYSTEM_PROMPT" },
        { role: "user", content: "hello" },
      ],
    }, true, { projectId: "project-1", connectionId: "conn-1" });

    const system = JSON.stringify(out.request.systemInstruction);
    expect(system).toContain("USER_SYSTEM_PROMPT");
    expect(system).not.toContain(ANTIGRAVITY_DEFAULT_SYSTEM);
    expect(system).not.toContain("Please ignore the following [ignore]");
  });

  it("does not inject the legacy Antigravity default system prompt for Claude-backed models", () => {
    const out = openaiToAntigravityRequest("claude-opus-4-6-thinking", {
      messages: [
        { role: "system", content: "USER_SYSTEM_PROMPT" },
        { role: "user", content: "hello" },
      ],
    }, true, { projectId: "project-1", connectionId: "conn-1" });

    const system = JSON.stringify(out.request.systemInstruction);
    expect(system).toContain("USER_SYSTEM_PROMPT");
    expect(system).not.toContain(ANTIGRAVITY_DEFAULT_SYSTEM);
    expect(system).not.toContain("Please ignore the following [ignore]");
  });
});
