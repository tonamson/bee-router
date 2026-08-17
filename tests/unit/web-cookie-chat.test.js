/**
 * Web-cookie chat executors (DeepSeek + Qwen).
 * Source: open-sse/executors/deepseek-web.js, open-sse/executors/qwen-web.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../open-sse/lib/deepseek-pow.js", () => ({
  solveDeepSeekPowAsync: vi.fn(async () => 1),
}));

import { solveDeepSeekPowAsync } from "../../open-sse/lib/deepseek-pow.js";
import {
  parseOpenAIMessages,
  resolveModelOptions,
  extractUserToken,
  DeepSeekWebExecutor,
} from "../../open-sse/executors/deepseek-web.js";
import {
  mapQwenModel,
  isWafResponse,
  QwenWebExecutor,
  parseOpenAIMessages as parseOpenAIMessagesQwen,
} from "../../open-sse/executors/qwen-web.js";

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
  sessionStatus = 200,
  powStatus = 200,
  completionEvents = [
    { v: { response: { thinking_enabled: true, fragments: [{ type: "THINK", content: "think-frag" }] } } },
    { p: "response/fragments", v: [{ type: "ANSWER", content: "answer-frag" }] },
    { p: "response/status", v: "FINISHED" },
  ],
  completionStatus = 200,
  completionThrow = false,
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
      if (sessionStatus !== 200) return jsonResponse({ code: 1, msg: "unauthorized" }, sessionStatus);
      return jsonResponse({
        code: 0,
        data: { biz_data: { chat_session: { id: sessionId } } },
      });
    }
    if (u.includes("/create_pow_challenge")) {
      if (powStatus !== 200) return jsonResponse({ code: 1, msg: "unauthorized" }, powStatus);
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
      if (completionThrow) throw new Error("network down");
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
    solveDeepSeekPowAsync.mockReset();
    solveDeepSeekPowAsync.mockResolvedValue(1);
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

  it("createSession 401 → 401 re-paste + clears token cache", async () => {
    const calls = mockDeepSeekFetchSequence({ sessionStatus: 401 });
    const creds = { apiKey: "cached-user-jwt" };
    const body = { messages: [{ role: "user", content: "hi" }] };

    const first = await executor.execute({
      model: "deepseek-v4-flash",
      body,
      stream: true,
      credentials: creds,
    });
    expect(first.response.status).toBe(401);
    const firstBody = await first.response.json();
    expect(firstBody.error?.message || "").toMatch(/userToken/i);

    // Second execute must re-hit users/current (cache entry deleted after mid-pipeline 401)
    const second = await executor.execute({
      model: "deepseek-v4-flash",
      body,
      stream: true,
      credentials: creds,
    });
    expect(second.response.status).toBe(401);
    const usersHits = calls.filter((c) => c.url.includes("/users/current"));
    expect(usersHits.length).toBe(2);
  });

  it("PoW solver fail → 502", async () => {
    mockDeepSeekFetchSequence();
    solveDeepSeekPowAsync.mockResolvedValue(-1);
    const { response } = await executor.execute({
      model: "deepseek-v4-flash",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: "user-jwt" },
    });
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error?.message || "").toMatch(/PoW/i);
  });

  it("completion 401 → 401 re-paste", async () => {
    mockDeepSeekFetchSequence({ completionStatus: 401 });
    const { response } = await executor.execute({
      model: "deepseek-v4-flash",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: "user-jwt" },
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error?.message || "").toMatch(/userToken/i);
  });

  it("completion 429 → 429", async () => {
    mockDeepSeekFetchSequence({ completionStatus: 429 });
    const { response } = await executor.execute({
      model: "deepseek-v4-flash",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: "user-jwt" },
    });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error?.message || "").toMatch(/rate limit/i);
  });

  it("completion fetch throw → 502", async () => {
    mockDeepSeekFetchSequence({ completionThrow: true });
    const { response } = await executor.execute({
      model: "deepseek-v4-flash",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: "user-jwt" },
    });
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error?.message || "").toMatch(/network down|connection failed/i);
  });
});

// ── Qwen ────────────────────────────────────────────────────────────────────

const QWEN_FULL_COOKIE =
  "cna=abc; ssxmod_itna=xyz; ssxmod_itna2=def; token=qwen-bearer-tok";

function qwenSseResponse(events) {
  const text =
    events.map((e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`).join("") +
    "data: [DONE]\n\n";
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/** Two-call fetch: chats/new → chat/completions */
function mockQwenFetchSequence({
  newChatStatus = 200,
  newChatBody = { data: { id: "c1" } },
  newChatContentType = "application/json",
  newChatText = null,
  completionEvents = [
    { choices: [{ delta: { phase: "think", content: "r" } }] },
    { choices: [{ delta: { phase: "answer", content: "hi" } }] },
  ],
  completionStatus = 200,
  completionThrow = false,
} = {}) {
  const calls = [];
  global.fetch = vi.fn(async (url, init) => {
    const u = String(url);
    calls.push({ url: u, method: init?.method || "GET", body: init?.body, headers: init?.headers });
    if (u.includes("/chats/new")) {
      if (newChatText != null) {
        return new Response(newChatText, {
          status: newChatStatus,
          headers: { "Content-Type": newChatContentType },
        });
      }
      if (newChatStatus !== 200) {
        return new Response(JSON.stringify(newChatBody), {
          status: newChatStatus,
          headers: { "Content-Type": newChatContentType },
        });
      }
      return jsonResponse(newChatBody, newChatStatus);
    }
    if (u.includes("/chat/completions")) {
      if (completionThrow) throw new Error("network down");
      if (completionStatus !== 200) {
        return jsonResponse({ error: "fail" }, completionStatus);
      }
      return qwenSseResponse(completionEvents);
    }
    return jsonResponse({ error: `unexpected url ${u}` }, 500);
  });
  return calls;
}

describe("mapQwenModel", () => {
  it('mapQwenModel("qwen-max") === "qwen3.7-max"', () => {
    expect(mapQwenModel("qwen-max")).toBe("qwen3.7-max");
  });

  it("aliases plus/turbo and default fallback", () => {
    expect(mapQwenModel("qwen-plus")).toBe("qwen3.7-plus");
    expect(mapQwenModel("qwen3-flash")).toBe("qwen3.6-plus");
    expect(mapQwenModel("qwen3.8-max-preview")).toBe("qwen3.8-max-preview");
  });
});

describe("isWafResponse", () => {
  it("HTML content-type → true", () => {
    expect(isWafResponse(200, "text/html", "<html>")).toBe(true);
  });

  it("504 → true", () => {
    expect(isWafResponse(504, "application/json", "{}")).toBe(true);
  });

  it("normal JSON 200 → false", () => {
    expect(isWafResponse(200, "application/json", "{}")).toBe(false);
  });
});

describe("Qwen parseOpenAIMessages re-export", () => {
  it("same flatten as deepseek-web", () => {
    expect(parseOpenAIMessagesQwen).toBe(parseOpenAIMessages);
  });
});

describe("QwenWebExecutor.execute", () => {
  let executor;
  beforeEach(() => {
    executor = new QwenWebExecutor();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("happy stream: reasoning_content then content, ends with [DONE]", async () => {
    const calls = mockQwenFetchSequence();
    const { response } = await executor.execute({
      model: "qwen-max",
      body: { messages: [{ role: "user", content: "hello" }] },
      stream: true,
      credentials: { apiKey: QWEN_FULL_COOKIE },
    });
    expect(response.status).toBe(200);
    const text = await readSseText(response);
    expect(text).toContain("reasoning_content");
    expect(text).toMatch(/"reasoning_content"\s*:\s*"r"/);
    expect(text).toMatch(/"content"\s*:\s*"hi"/);
    expect(text).toContain("data: [DONE]");

    expect(calls.map((c) => c.url)).toEqual([
      expect.stringContaining("/chats/new"),
      expect.stringMatching(/\/chat\/completions\?chat_id=c1/),
    ]);
    expect(calls).toHaveLength(2);

    const newChatBody = JSON.parse(calls[0].body);
    expect(newChatBody).toMatchObject({
      title: "New Chat",
      models: ["qwen3.7-max"],
      chat_mode: "normal",
      chat_type: "t2t",
    });
    expect(typeof newChatBody.timestamp).toBe("number");

    const headers = calls[0].headers;
    expect(headers.source || headers.Source).toBe("web");
    expect(headers.version || headers.Version).toBe("0.2.66");
    expect(headers["bx-v"] || headers["Bx-V"]).toBe("2.5.36");
    expect(headers.Cookie || headers.cookie).toContain("token=qwen-bearer-tok");
    expect(headers.Authorization || headers.authorization).toMatch(/Bearer\s+qwen-bearer-tok/);
  });

  it("HTML on chats/new → 401 WAF, message has no raw HTML", async () => {
    mockQwenFetchSequence({
      newChatStatus: 200,
      newChatContentType: "text/html",
      newChatText: "<html><body>aliyun_waf block</body></html>",
    });
    const { response } = await executor.execute({
      model: "qwen-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: QWEN_FULL_COOKIE },
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    const msg = body.error?.message || JSON.stringify(body);
    expect(msg).toMatch(/WAF|cookie/i);
    expect(msg).not.toMatch(/<html/i);
  });

  it("bare token credentials → 400, fetch not called", async () => {
    global.fetch = vi.fn();
    const { response } = await executor.execute({
      model: "qwen-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: "bare-token-only" },
    });
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.error?.message || "").toMatch(/Cookie/i);
  });

  it("tools present → still text completion, two fetches, no tool_calls", async () => {
    const calls = mockQwenFetchSequence({
      completionEvents: [{ choices: [{ delta: { phase: "answer", content: "plain" } }] }],
    });
    const { response } = await executor.execute({
      model: "qwen-max",
      body: {
        messages: [{ role: "user", content: "hi" }],
        tools: [{ type: "function", function: { name: "Shell", description: "run" } }],
      },
      stream: true,
      credentials: { apiKey: QWEN_FULL_COOKIE },
    });
    const text = await readSseText(response);
    expect(text).toContain("plain");
    expect(text).not.toContain("tool_calls");
    expect(calls).toHaveLength(2);
  });

  it("missing data.id on chats/new → 502", async () => {
    mockQwenFetchSequence({ newChatBody: { data: {} } });
    const { response } = await executor.execute({
      model: "qwen-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: QWEN_FULL_COOKIE },
    });
    expect(response.status).toBe(502);
  });

  it("completion 429 → 429", async () => {
    mockQwenFetchSequence({ completionStatus: 429 });
    const { response } = await executor.execute({
      model: "qwen-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: QWEN_FULL_COOKIE },
    });
    expect(response.status).toBe(429);
  });

  it("completion fetch throw → 502", async () => {
    mockQwenFetchSequence({ completionThrow: true });
    const { response } = await executor.execute({
      model: "qwen-max",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: true,
      credentials: { apiKey: QWEN_FULL_COOKIE },
    });
    expect(response.status).toBe(502);
  });
});
