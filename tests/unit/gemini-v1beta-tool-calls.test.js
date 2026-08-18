import { describe, expect, it } from "vitest";
import {
  convertOpenAIResponseToGemini,
  transformOpenAISSEToGeminiSSE,
} from "../../src/lib/geminiSse.js";

function sseFromChunks(chunks) {
  return chunks.map((chunk) => `data: ${JSON.stringify(chunk)}`).join("\n") + "\n data: [DONE]\n";
}

function parseGeminiSse(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((data) => data && data !== "[DONE]")
    .map((data) => JSON.parse(data));
}

async function streamThrough(body, model = "gemini-3.1-pro") {
  const response = transformOpenAISSEToGeminiSSE(
    new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    model,
  );
  return parseGeminiSse(await response.text());
}

describe("v1beta Gemini SSE — agy tool calls", () => {
  it("maps streamed OpenAI tool_calls to Gemini functionCall parts", async () => {
    const events = await streamThrough(sseFromChunks([
      {
        choices: [{
          delta: {
            reasoning_content: "Prioritizing Tool Selection",
            tool_calls: [{ index: 0, id: "call_1", function: { name: "read_file", arguments: '{"path":' } }],
          },
          finish_reason: null,
        }],
      },
      {
        choices: [{
          delta: { tool_calls: [{ index: 0, function: { arguments: '"src/x.js"}' } }] },
          finish_reason: null,
        }],
      },
      {
        choices: [{ delta: {}, finish_reason: "tool_calls" }],
        usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
      },
    ]));

    const parts = events.flatMap((event) => event.candidates?.[0]?.content?.parts || []);
    const thought = parts.find((part) => part.thought);
    const fn = parts.find((part) => part.functionCall);

    expect(thought?.text).toBe("Prioritizing Tool Selection");
    expect(fn?.functionCall).toEqual({ name: "read_file", args: { path: "src/x.js" }, id: "call_1" });
  });

  it("maps non-stream OpenAI tool_calls to Gemini functionCall parts", async () => {
    const response = await convertOpenAIResponseToGemini(
      Response.json({
        model: "cc/claude-sonnet",
        choices: [{
          message: {
            role: "assistant",
            content: "",
            reasoning_content: "Prioritizing Tool Selection",
            tool_calls: [{
              id: "call_1",
              type: "function",
              function: { name: "read_file", arguments: '{"path":"src/x.js"}' },
            }],
          },
          finish_reason: "tool_calls",
        }],
        usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
      }),
      "gemini-3.1-pro",
    );

    const body = await response.json();
    const parts = body.candidates?.[0]?.content?.parts || [];
    expect(parts.some((part) => part.thought && part.text === "Prioritizing Tool Selection")).toBe(true);
    expect(parts.find((part) => part.functionCall)?.functionCall).toEqual({
      name: "read_file",
      args: { path: "src/x.js" },
      id: "call_1",
    });
  });

  it("emits functionCall when OpenAI SSE is split across TCP chunks", async () => {
    const encoder = new TextEncoder();
    const payload = JSON.stringify({
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            id: "call_1",
            function: { name: "list_dir", arguments: '{"uri":"file:///tmp"}' },
          }],
        },
        finish_reason: "tool_calls",
      }],
    });
    const full = `data: ${payload}\n`;
    const mid = Math.floor(full.length / 2);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(full.slice(0, mid)));
        controller.enqueue(encoder.encode(full.slice(mid)));
        controller.close();
      },
    });

    const events = await streamThrough(stream);
    const fn = events.flatMap((event) => event.candidates?.[0]?.content?.parts || [])
      .find((part) => part.functionCall);
    expect(fn?.functionCall).toEqual({ name: "list_dir", args: { uri: "file:///tmp" }, id: "call_1" });
  });

  it("flushes accumulated tool calls when stream ends without finish_reason", async () => {
    const events = await streamThrough(sseFromChunks([{
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            id: "call_1",
            function: { name: "list_dir", arguments: '{"uri":"file:///tmp"}' },
          }],
        },
        finish_reason: null,
      }],
    }]));

    const fn = events.flatMap((event) => event.candidates?.[0]?.content?.parts || [])
      .find((part) => part.functionCall);
    expect(fn?.functionCall).toEqual({ name: "list_dir", args: { uri: "file:///tmp" }, id: "call_1" });
  });
});
