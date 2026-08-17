/**
 * Web-cookie chat executors (DeepSeek section; Qwen lands in Task 5).
 * Source under test: open-sse/executors/deepseek-web.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../open-sse/lib/deepseek-pow.js", () => ({
  solveDeepSeekPowAsync: async () => 1,
}));

import {
  parseOpenAIMessages,
  resolveModelOptions,
  extractUserToken,
  DeepSeekWebExecutor,
} from "../../open-sse/executors/deepseek-web.js";

const originalFetch = global.fetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deepseekSseResponse(events) {
  const text =
    events.map((e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`).join("") +
    "data: [DONE]\n\n";
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/** Four-call fetch sequence: users/current → createSession → pow → completion */
function mockDeepSeekFetchSequence({
  usersStatus = 200,
  accessToken = "access-tok",
  sessionId = "sess-1",
  completionEvents = [
    { v: { response: { thinking_enabled: true, fragments: [{ type: "THINK", content: "think-frag" }] } } },
    { p: "response/fragments", v: [{ type: "ANSWER", content: "answer-frag" }] },
    { p: "response/status", v: "FINISHED" },
  ],
  completionStatus = 200,
} = {}) {
  const calls = [];
  global.fetch = vi.fn(async (url, init) => {
    const u = String(url);
    calls.push({ url: u, method: init?.method || "GET", body: init?.body, headers: init?.headers });
    if (u.includes("/users/current")) {
      if (usersStatus !== 200) return jsonResponse({ code: 1, msg: "unauthorized" }, usersStatus);
      return jsonResponse({
        code: 0,
        data: { biz_data: { token: accessToken } },
      });
    }
    if (u.includes("/chat_session/create")) {
      return jsonResponse({
        code: 0,
        data: { biz_data: { chat_session: { id: sessionId } } },
      });
    }
    if (u.includes("/create_pow_challenge")) {
      return jsonResponse({
        code: 0,
        data: {
          biz_data: {
            challenge: {
              algorithm: "DeepSeekHashV1",
              challenge: "abc",
              salt: "salt",
              signature: "sig",
              difficulty: 1,
              expire_at: 9999999999,
              expire_after: 60,
              target_path: "/api/v0/chat/completion",
            },
          },
        },
      });
    }
    if (u.includes("/chat/completion")) {
      if (completionStatus !== 200) {
        return jsonResponse({ code: 1, msg: "fail" }, completionStatus);
      }
      return deepseekSseResponse(completionEvents);
    }
    return jsonResponse({ error: `unexpected url ${u}` }, 500);
  });
  return calls;
}

async function readSseText(response) {
  return await response.text();
}

describe("parseOpenAIMessages", () => {
  it("formats system+user+assistant+user with last user unprefixed", () => {
    const out = parseOpenAIMessages([
      { role: "system", content: "sys" },
      { role: "user", content: "u1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "u2" },
    ]);
    expect(out).toBe("system: sys\n\nuser: u1\n\nassistant: a1\n\nu2");
  });

  it("treats developer as system", () => {
    const out = parseOpenAIMessages([
      { role: "developer", content: "dev rules" },
      { role: "user", content: "hi" },
    ]);
    expect(out).toBe("system: dev rules\n\nhi");
  });

  it("joins array text parts", () => {
    const out = parseOpenAIMessages([
      { role: "user", content: [{ type: "text", text: "part1" }, { type: "text", text: "part2" }] },
    ]);
    expect(out).toBe("part1 part2");
  });
});

describe("resolveModelOptions", () => {
  it("deepseek-v4-flash → default, think off, search off", () => {
    expect(resolveModelOptions("deepseek-v4-flash")).toEqual({
      modelType: "default",
      thinkingEnabled: false,
      searchEnabled: false,
    });
  });

  it("deepseek-v4-flash-think → think on", () => {
    expect(resolveModelOptions("deepseek-v4-flash-think")).toEqual({
      modelType: "default",
      thinkingEnabled: true,
      searchEnabled: false,
    });
  });

  it("deepseek-v4-pro-think-search → expert + think + search", () => {
    expect(resolveModelOptions("deepseek-v4-pro-think-search")).toEqual({
      modelType: "expert",
      thinkingEnabled: true,
      searchEnabled: true,
    });
  });

  it("body.thinking_enabled forces think on", () => {
    expect(resolveModelOptions("deepseek-v4-flash", { thinking_enabled: true })).toEqual({
      modelType: "default",
      thinkingEnabled: true,
      searchEnabled: false,
    });
  });
});

describe("extractUserToken", () => {
  it("unwraps JSON value form", () => {
    expect(extractUserToken('{"value":"jwt-here"}')).toBe("jwt-here");
  });
});

describe("DeepSeekWebExecutor.execute", () => {
  let executor;
  beforeEach(() => {
    executor = new DeepSeekWebExecutor();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("happy stream: reasoning_content then content, ends with [DONE]", async () => {
    const calls = mockDeepSeekFetchSequence();
    const { response } = await executor.execute({
      model: "deepseek-v4-flash-think",
      body: { messages: [{ role: "user", content: "hello" }] },
      stream: true,
      credentials: { apiKey: "user-jwt" },
    });
    expect(response.status).toBe(200);
    const text = await readSseText(response);
    expect(text).toContain("reasoning_content");
    expect(text).toContain("think-frag");
    expect(text).toContain("answer-frag");
    expect(text).toMatch(/"content"\s*:\s*"answer-frag"/);
    expect(text).toContain("data: [DONE]");

    // four-call sequence
    expect(calls.map((c) => c.url)).toEqual([
      expect.stringContaining("/users/current"),
      expect.stringContaining("/chat_session/create"),
      expect.stringContaining("/create_pow_challenge"),
      expect.stringContaining("/chat/completion"),
    ]);
    const completionBody = JSON.parse(calls[3].body);
    expect(completionBody).toMatchObject({
      chat_session_id: "sess-1",
      parent_message_id: null,
      model_type: "default",
      prompt: "hello",
      ref_file_ids: [],
      thinking_enabled: true,
      search_enabled: false,
      preempt: false,
    });
  });

  it("tools present still completes as text (no tool_calls)", async () => {
    const calls = mockDeepSeekFetchSequence({
      completionEvents: [
        { p: "response/fragments", v: [{ type: "ANSWER", content: "plain answer" }] },
        { p: "response/status", v: "FINISHED" },
      ],
    });
    const { response } = await executor.execute({
      model: "deepseek-v4-flash",
      body: {
        messages: [{ role: "user", content: "hi" }],
        tools: [{ type: "function", function: { name: "Shell", description: "run" } }],
      },
      stream: true,
      credentials: { apiKey: "user-jwt" },
    });
    const text = await readSseText(response);
    expect(text).toContain("plain answer");
    expect(text).not.toContain("tool_calls");
    expect(calls.some((c) => c.url.includes("/chat/completion"))).toBe(true);
  });

  it("missing apiKey → 400", async () => {
    global.fetch = vi.fn();
    const { response } = await executor.execute({
      model: "deepseek-v4-flash",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: {},
    });
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("users/current 401 → 401 with userToken in message", async () => {
    mockDeepSeekFetchSequence({ usersStatus: 401 });
    const { response } = await executor.execute({
      model: "deepseek-v4-flash",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: "bad-jwt" },
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error?.message || JSON.stringify(body)).toMatch(/userToken/i);
  });

  it("empty messages → 400", async () => {
    global.fetch = vi.fn();
    const { response } = await executor.execute({
      model: "deepseek-v4-flash",
      body: { messages: [] },
      stream: true,
      credentials: { apiKey: "jwt" },
    });
    expect(response.status).toBe(400);
  });
});
