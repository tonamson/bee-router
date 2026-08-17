/**
 * Unit tests for web-cookie provider validation logic
 * (grok-web, perplexity-web, deepseek-web, qwen-web)
 *
 * Covers:
 *  - Cookie prefix stripping (sso=, __Secure-next-auth.session-token=)
 *  - 401/403 → invalid with error message
 *  - Non-auth responses (200, 400, 429) → valid (Cloudflare-bypass probe)
 *  - Required browser-fingerprint headers sent to Grok
 *  - DeepSeek userToken unwrap + /users/current probe
 *  - Qwen full Cookie jar + WAF detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractDeepSeekUserToken,
  buildQwenCookieHeader,
  extractQwenToken,
} from "open-sse/lib/webCookieAuth.js";

const originalFetch = global.fetch;

// Replicates the validation logic from app/src/app/api/providers/validate/route.js
async function validateGrokWeb(apiKey) {
  const token = apiKey.startsWith("sso=") ? apiKey.slice(4) : apiKey;
  const randomHex = (n) => {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
  };
  const statsigId = Buffer.from("e:TypeError: Cannot read properties of null (reading 'children')").toString("base64");
  const traceId = randomHex(16);
  const spanId = randomHex(8);
  const res = await fetch("https://grok.com/rest/app-chat/conversations/new", {
    method: "POST",
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      Cookie: `sso=${token}`,
      Origin: "https://grok.com",
      Referer: "https://grok.com/",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      "x-statsig-id": statsigId,
      "x-xai-request-id": crypto.randomUUID(),
      traceparent: `00-${traceId}-${spanId}-00`,
    },
    body: JSON.stringify({ temporary: true, modelName: "grok-4", message: "ping" }),
  });
  if (res.status === 401 || res.status === 403) {
    return { valid: false, error: "Invalid SSO cookie — re-paste from grok.com DevTools → Cookies → sso" };
  }
  return { valid: true, error: null };
}

async function validatePerplexityWeb(apiKey) {
  let sessionToken = apiKey;
  if (sessionToken.startsWith("__Secure-next-auth.session-token=")) {
    sessionToken = sessionToken.slice("__Secure-next-auth.session-token=".length);
  }
  const res = await fetch("https://www.perplexity.ai/rest/sse/perplexity_ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Origin: "https://www.perplexity.ai",
      Referer: "https://www.perplexity.ai/",
      Cookie: `__Secure-next-auth.session-token=${sessionToken}`,
    },
    body: JSON.stringify({ query_str: "ping" }),
  });
  if (res.status === 401 || res.status === 403) {
    return { valid: false, error: "Invalid session cookie — re-paste __Secure-next-auth.session-token from perplexity.ai" };
  }
  return { valid: true, error: null };
}

describe("grok-web validation", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => { global.fetch = originalFetch; });

  it("should return valid:true when response is 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
    const result = await validateGrokWeb("test-token");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should return valid:true when response is 400 (auth accepted but bad body)", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 400 });
    const result = await validateGrokWeb("test-token");
    expect(result.valid).toBe(true);
  });

  it("should return valid:true when response is 429 (rate limited but auth ok)", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 429 });
    const result = await validateGrokWeb("test-token");
    expect(result.valid).toBe(true);
  });

  it("should return valid:false with error when response is 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 401 });
    const result = await validateGrokWeb("bad-token");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid SSO cookie");
  });

  it("should return valid:false with error when response is 403", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 403 });
    const result = await validateGrokWeb("bad-token");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid SSO cookie");
  });

  it("should strip sso= prefix from apiKey", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
    await validateGrokWeb("sso=abc123");
    const callArgs = global.fetch.mock.calls[0][1];
    expect(callArgs.headers.Cookie).toBe("sso=abc123");
  });

  it("should accept raw token without sso= prefix", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
    await validateGrokWeb("abc123");
    const callArgs = global.fetch.mock.calls[0][1];
    expect(callArgs.headers.Cookie).toBe("sso=abc123");
  });

  it("should POST to /rest/app-chat/conversations/new", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
    await validateGrokWeb("token");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://grok.com/rest/app-chat/conversations/new",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should send Cloudflare-bypass headers", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
    await validateGrokWeb("token");
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Origin).toBe("https://grok.com");
    expect(headers.Referer).toBe("https://grok.com/");
    expect(headers["User-Agent"]).toContain("Chrome");
    expect(headers["x-statsig-id"]).toBeTruthy();
    expect(headers["x-xai-request-id"]).toBeTruthy();
    expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/);
  });
});

describe("perplexity-web validation", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => { global.fetch = originalFetch; });

  it("should return valid:true when response is 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
    const result = await validatePerplexityWeb("test-token");
    expect(result.valid).toBe(true);
  });

  it("should return valid:false when response is 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 401 });
    const result = await validatePerplexityWeb("bad-token");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid session cookie");
  });

  it("should return valid:false when response is 403", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 403 });
    const result = await validatePerplexityWeb("bad-token");
    expect(result.valid).toBe(false);
  });

  it("should strip __Secure-next-auth.session-token= prefix", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
    await validatePerplexityWeb("__Secure-next-auth.session-token=xyz789");
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Cookie).toBe("__Secure-next-auth.session-token=xyz789");
  });

  it("should accept raw token without prefix", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
    await validatePerplexityWeb("xyz789");
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Cookie).toBe("__Secure-next-auth.session-token=xyz789");
  });

  it("should POST to /rest/sse/perplexity_ask", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
    await validatePerplexityWeb("token");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://www.perplexity.ai/rest/sse/perplexity_ask",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

// Replicates deepseek-web case from app/src/app/api/providers/validate/route.js
async function validateDeepSeekWeb(apiKey) {
  const token = extractDeepSeekUserToken(apiKey);
  if (!token) {
    return { valid: false, error: "Missing userToken — paste from chat.deepseek.com Local Storage" };
  }
  const res = await fetch("https://chat.deepseek.com/api/v0/users/current", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Origin: "https://chat.deepseek.com",
      Referer: "https://chat.deepseek.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      "X-Client-Bundle-Id": "com.deepseek.chat",
      "X-Client-Locale": "en-US",
      "X-Client-Platform": "web",
      "X-Client-Version": "2.0.0",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 401 || res.status === 403) {
    return {
      valid: false,
      error: "Invalid userToken — re-paste from chat.deepseek.com Local Storage",
    };
  }
  if (!res.ok) {
    return { valid: false, error: `DeepSeek users/current HTTP ${res.status}` };
  }
  const json = await res.json();
  if (json?.code && json.code !== 0) {
    return {
      valid: false,
      error: json.msg || json?.data?.biz_msg || `DeepSeek error code ${json.code}`,
    };
  }
  const bizData = json?.data?.biz_data || json?.biz_data;
  if (!bizData?.token) {
    return { valid: false, error: "DeepSeek response missing access token" };
  }
  return { valid: true, error: null };
}

// Replicates qwen-web case from app/src/app/api/providers/validate/route.js
async function validateQwenWeb(apiKey) {
  const cookieHeader = buildQwenCookieHeader(apiKey);
  const token = extractQwenToken(apiKey);
  if (!cookieHeader || !token) {
    return {
      valid: false,
      error: "Paste full Cookie header from chat.qwen.ai (must include token=)",
    };
  }
  const res = await fetch("https://chat.qwen.ai/api/v2/chats/new", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      Origin: "https://chat.qwen.ai",
      Referer: "https://chat.qwen.ai/",
      source: "web",
      version: "0.2.66",
      "x-request-id": crypto.randomUUID(),
      "bx-v": "2.5.36",
      "bx-umidtoken": "T2gA0000000000000000000000000000000000000000",
      Authorization: `Bearer ${token}`,
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      title: "New Chat",
      models: ["qwen3.7-max"],
      chat_mode: "normal",
      chat_type: "t2t",
      timestamp: Date.now(),
    }),
    signal: AbortSignal.timeout(8000),
  });
  const ct = res.headers?.get?.("content-type") || "";
  if (res.status === 401 || res.status === 403 || ct.includes("text/html") || res.status === 504) {
    return {
      valid: false,
      error: "Qwen WAF/auth failed — re-paste full Cookie header from chat.qwen.ai",
    };
  }
  if (!res.ok) {
    return { valid: false, error: `Qwen chats/new HTTP ${res.status}` };
  }
  const data = await res.json().catch(() => null);
  if (!data?.data?.id) {
    return { valid: false, error: "Qwen create-chat returned no chat id" };
  }
  return { valid: true, error: null };
}

describe("deepseek-web validation", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should GET /api/v0/users/current with Bearer token", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ code: 0, data: { biz_data: { token: "x" } } }),
    });
    await validateDeepSeekWeb("raw-jwt");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://chat.deepseek.com/api/v0/users/current",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer raw-jwt" }),
      }),
    );
  });

  it("should unwrap JSON {value} before send", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ code: 0, data: { biz_data: { token: "x" } } }),
    });
    await validateDeepSeekWeb('{"value":"wrapped-jwt"}');
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer wrapped-jwt");
  });

  it("should return valid:true when 200 + biz_data.token", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ code: 0, data: { biz_data: { token: "access" } } }),
    });
    const result = await validateDeepSeekWeb("jwt");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should return valid:false with userToken error on 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false });
    const result = await validateDeepSeekWeb("bad");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("userToken");
  });

  it("should return valid:false with userToken error on 403", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 403, ok: false });
    const result = await validateDeepSeekWeb("bad");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("userToken");
  });

  it("should return valid:false when DeepSeek code !== 0", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ code: 40101, msg: "unauthorized" }),
    });
    const result = await validateDeepSeekWeb("jwt");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("should return valid:false when empty apiKey", async () => {
    global.fetch = vi.fn();
    const result = await validateDeepSeekWeb("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("userToken");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("qwen-web validation", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const fullCookie = "cna=1; ssxmod_itna=2; token=xyz";

  it("should POST /api/v2/chats/new with Cookie + Bearer", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ data: { id: "chat_1" } }),
    });
    await validateQwenWeb(fullCookie);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://chat.qwen.ai/api/v2/chats/new",
      expect.objectContaining({ method: "POST" }),
    );
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Cookie).toBe(fullCookie);
    expect(headers.Authorization).toBe("Bearer xyz");
  });

  it("should return valid:true when 200 + data.id", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ data: { id: "chat_1" } }),
    });
    const result = await validateQwenWeb(fullCookie);
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should return valid:false on 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: { get: () => "application/json" },
    });
    const result = await validateQwenWeb(fullCookie);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/WAF|auth|Cookie/i);
  });

  it("should return valid:false on 403", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
      headers: { get: () => "application/json" },
    });
    const result = await validateQwenWeb(fullCookie);
    expect(result.valid).toBe(false);
  });

  it("should return valid:false mentioning WAF on text/html (not HTML body)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => "text/html; charset=utf-8" },
      text: async () => "<html><body>aliyun_waf block page</body></html>",
      json: async () => {
        throw new Error("not json");
      },
    });
    const result = await validateQwenWeb(fullCookie);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/WAF/i);
    expect(result.error).not.toContain("<html");
  });

  it("should return valid:false mentioning WAF on 504", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 504,
      ok: false,
      headers: { get: () => "text/html" },
    });
    const result = await validateQwenWeb(fullCookie);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/WAF/i);
  });

  it("should reject bare token before fetch", async () => {
    global.fetch = vi.fn();
    const result = await validateQwenWeb("barejwt");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Cookie|token/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
