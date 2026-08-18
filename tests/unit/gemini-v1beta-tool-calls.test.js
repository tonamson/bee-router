import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleChat: vi.fn(),
}));

vi.mock("@/sse/handlers/chat.js", () => ({
  handleChat: mocks.handleChat,
}));

const { POST } = await import("../../src/app/api/v1beta/models/[...path]/route.js");

function makeRequest(path, body) {
  return new Request(`https://router.test/v1beta/models/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

describe("v1beta Gemini SSE — agy tool calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps streamed OpenAI tool_calls to Gemini functionCall parts", async () => {
    mocks.handleChat.mockResolvedValue(
      new Response(
        sseFromChunks([
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
        ]),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
    );

    const response = await POST(
      makeRequest("gemini-3.1-pro:streamGenerateContent", {
        contents: [{ role: "user", parts: [{ text: "read src/x.js" }] }],
        tools: [{ functionDeclarations: [{ name: "read_file", parameters: { type: "object" } }] }],
      }),
      { params: Promise.resolve({ path: ["gemini-3.1-pro:streamGenerateContent"] }) }
    );

    const events = parseGeminiSse(await response.text());
    const parts = events.flatMap((event) => event.candidates?.[0]?.content?.parts || []);
    const thought = parts.find((part) => part.thought);
    const fn = parts.find((part) => part.functionCall);

    expect(thought?.text).toBe("Prioritizing Tool Selection");
    expect(fn?.functionCall).toEqual({ name: "read_file", args: { path: "src/x.js" } });
  });

  it("maps non-stream OpenAI tool_calls to Gemini functionCall parts", async () => {
    mocks.handleChat.mockResolvedValue(
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
      })
    );

    const response = await POST(
      makeRequest("gemini-3.1-pro:generateContent", {
        contents: [{ role: "user", parts: [{ text: "read src/x.js" }] }],
      }),
      { params: Promise.resolve({ path: ["gemini-3.1-pro:generateContent"] }) }
    );

    const body = await response.json();
    const parts = body.candidates?.[0]?.content?.parts || [];
    expect(parts.some((part) => part.thought && part.text === "Prioritizing Tool Selection")).toBe(true);
    expect(parts.find((part) => part.functionCall)?.functionCall).toEqual({
      name: "read_file",
      args: { path: "src/x.js" },
    });
  });
});
