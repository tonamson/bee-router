/**
 * Qwen Web cookie executor (chat-only; tools ignored).
 * Adapted from OmniRoute MIT (https://github.com/diegosouzapw/OmniRoute)
 *
 * Two-step v2 flow:
 *   1. POST /api/v2/chats/new
 *   2. POST /api/v2/chat/completions?chat_id=
 */
import { BaseExecutor } from "./base.js";
import { buildQwenCookieHeader, extractQwenToken } from "../lib/webCookieAuth.js";
import { parseOpenAIMessages } from "./deepseek-web.js";

export { parseOpenAIMessages };

export const BASE_URL = "https://chat.qwen.ai";
const CHATS_NEW_URL = `${BASE_URL}/api/v2/chats/new`;
const CHAT_COMPLETIONS_URL = `${BASE_URL}/api/v2/chat/completions`;
const QWEN_SPA_VERSION = "0.2.66";
const BX_VERSION = "2.5.36";
const BX_UMIDTOKEN_FALLBACK = "T2gA0000000000000000000000000000000000000000";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

const MODEL_ALIASES = {
  "qwen-plus": "qwen3.7-plus",
  "qwen3-plus": "qwen3.7-plus",
  "qwen-max": "qwen3.7-max",
  "qwen3-max": "qwen3.7-max",
  qwen: "qwen3.7-max",
  qwen3: "qwen3.7-max",
  "qwen-turbo": "qwen3.6-plus",
  "qwen3-flash": "qwen3.6-plus",
  "qwen3-coder-flash": "qwen3.6-plus",
};

const DEFAULT_MODEL = "qwen3.7-max";
const REQUIRED_THINKING_MODELS = new Set(["qwen3.8-max-preview"]);

const WAF_ERROR_MESSAGE =
  "Qwen session expired or blocked by Alibaba's WAF. Re-login at https://chat.qwen.ai and " +
  "paste a fresh full Cookie header (must include cna, ssxmod_itna and token) — a bearer token " +
  "alone is no longer accepted by the v2 endpoint.";

const REPASTE_MSG =
  "Qwen auth failed — re-paste full Cookie header from chat.qwen.ai (must include token)";

export function mapQwenModel(modelId) {
  if (!modelId) return DEFAULT_MODEL;
  return MODEL_ALIASES[modelId] || modelId;
}

/** Detect Alibaba WAF / gateway HTML so we never surface raw HTML. */
export function isWafResponse(status, contentType, bodyText) {
  const ct = contentType || "";
  if (ct.includes("text/html")) return true;
  if (status === 504) return true;
  return /aliyun_waf|baxia|<html/i.test(bodyText || "");
}

function errorResponse(status, message, code) {
  return new Response(
    JSON.stringify({
      error: {
        message,
        type: status === 400 ? "invalid_request" : "upstream_error",
        code: code ?? `HTTP_${status}`,
      },
    }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function uuid() {
  return crypto.randomUUID();
}

function buildApiHeaders(token, cookieHeader, chatId) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "*/*",
    "User-Agent": USER_AGENT,
    Origin: BASE_URL,
    Referer: chatId ? `${BASE_URL}/c/${chatId}` : `${BASE_URL}/`,
    source: "web",
    version: QWEN_SPA_VERSION,
    "x-request-id": uuid(),
    "bx-v": BX_VERSION,
    "bx-umidtoken": BX_UMIDTOKEN_FALLBACK,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookieHeader) headers.Cookie = cookieHeader;
  return headers;
}

function buildMessagePayload(chatId, modelId, prompt, requestedModel) {
  const fid = uuid();
  const enableThinking =
    REQUIRED_THINKING_MODELS.has(modelId) || /think|reason|r1/i.test(requestedModel || "");
  const featureConfig = {
    thinking_enabled: enableThinking,
    output_schema: "phase",
    auto_thinking: enableThinking,
    research_mode: "normal",
    auto_search: false,
  };
  return {
    stream: true,
    incremental_output: true,
    chat_id: chatId,
    chat_mode: "normal",
    model: modelId,
    parent_id: null,
    messages: [
      {
        fid,
        parentId: null,
        childrenIds: [],
        role: "user",
        content: prompt,
        user_action: "chat",
        files: [],
        timestamp: Math.floor(Date.now() / 1000),
        models: [modelId],
        chat_type: "t2t",
        feature_config: featureConfig,
        sub_chat_type: "t2t",
        parent_id: null,
      },
    ],
  };
}

/** Parse one SSE line into typed delta, or null. */
function parseSseDelta(line) {
  if (!line.startsWith("data:") && !line.startsWith("data: ")) return null;
  const payload = line.replace(/^data:\s*/, "").trim();
  if (!payload || payload === "[DONE]") return null;
  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  const delta = parsed?.choices?.[0]?.delta;
  if (!delta) return null;
  const phase = delta.phase;
  const content = typeof delta.content === "string" ? delta.content : "";
  if (phase === "think" || phase === "thinking_summary") {
    return { kind: "think", text: content };
  }
  // answer phase or null/absent phase → assistant content
  if (phase === "answer" || phase === null || phase === undefined) {
    return { kind: "answer", text: content };
  }
  return null;
}

function transformSSE(upstreamBody, clientModel) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const id = `chatcmpl-qwen-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  const model = clientModel || "qwen-web";

  return new ReadableStream({
    async start(controller) {
      const reader = upstreamBody?.getReader?.();
      if (!reader) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      const emit = (delta, finishReason = null) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id,
              object: "chat.completion.chunk",
              created,
              model,
              choices: [{ index: 0, delta, finish_reason: finishReason }],
            })}\n\n`
          )
        );
      };

      let buffer = "";
      emit({ role: "assistant", content: "" });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const delta = parseSseDelta(line);
            if (!delta || !delta.text) continue;
            if (delta.kind === "think") {
              emit({ reasoning_content: delta.text });
            } else {
              emit({ content: delta.text });
            }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }

      emit({}, "stop");
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

async function collectSSEContent(upstreamBody) {
  const decoder = new TextDecoder();
  const reader = upstreamBody?.getReader?.();
  let content = "";
  let reasoningContent = "";
  if (!reader) return { content, reasoningContent };

  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const delta = parseSseDelta(line);
        if (!delta || !delta.text) continue;
        if (delta.kind === "think") reasoningContent += delta.text;
        else content += delta.text;
      }
    }
  } catch {
    /* return what we have */
  }
  return { content, reasoningContent };
}

export class QwenWebExecutor extends BaseExecutor {
  constructor() {
    super("qwen-web", { baseUrl: BASE_URL });
  }

  async execute({ model, body, stream, credentials, signal, log }) {
    const bodyObj = body || {};
    const messages = bodyObj.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        response: errorResponse(400, "Missing or empty messages array"),
        url: CHATS_NEW_URL,
        headers: {},
        transformedBody: body,
      };
    }

    const prompt = parseOpenAIMessages(messages);
    if (!prompt.trim()) {
      return {
        response: errorResponse(400, "Empty query after processing"),
        url: CHATS_NEW_URL,
        headers: {},
        transformedBody: body,
      };
    }

    const rawCred = String(credentials?.apiKey ?? "").trim();
    const cookieHeader = buildQwenCookieHeader(rawCred);
    let token = extractQwenToken(rawCred);
    if (!token && credentials?.accessToken) token = String(credentials.accessToken).trim();

    if (!cookieHeader || !token) {
      return {
        response: errorResponse(
          400,
          "Missing Qwen Cookie — paste full Cookie header from chat.qwen.ai (must include token)"
        ),
        url: CHATS_NEW_URL,
        headers: {},
        transformedBody: body,
      };
    }

    // tools intentionally ignored (chat-only)
    const requestedModel =
      (typeof model === "string" && model.trim() ? model.trim() : null) ||
      (typeof bodyObj.model === "string" && bodyObj.model.trim() ? bodyObj.model.trim() : null) ||
      DEFAULT_MODEL;
    const modelId = mapQwenModel(requestedModel);
    const clientModel = typeof model === "string" && model.trim() ? model.trim() : modelId;

    // ── Step 1: create chat ──────────────────────────────────────────────────
    let chatId;
    try {
      const newChatHeaders = buildApiHeaders(token, cookieHeader);
      let newChatRes;
      try {
        newChatRes = await fetch(CHATS_NEW_URL, {
          method: "POST",
          headers: newChatHeaders,
          body: JSON.stringify({
            title: "New Chat",
            models: [modelId],
            chat_mode: "normal",
            chat_type: "t2t",
            timestamp: Date.now(),
          }),
          signal: signal ?? undefined,
        });
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        log?.error?.("QWEN-WEB", `chats/new fetch failed: ${msg}`);
        return {
          response: errorResponse(502, `Qwen connection failed: ${msg}`),
          url: CHATS_NEW_URL,
          headers: newChatHeaders,
          transformedBody: body,
        };
      }

      const ct = newChatRes.headers.get("content-type") || "";
      if (!newChatRes.ok || ct.includes("text/html") || newChatRes.status === 504) {
        const text = await newChatRes.text().catch(() => "");
        // Never dump HTML into error.message
        if (isWafResponse(newChatRes.status, ct, text) || !newChatRes.ok) {
          log?.warn?.("QWEN-WEB", "chats/new blocked or failed (WAF/auth)");
          return {
            response: errorResponse(401, WAF_ERROR_MESSAGE),
            url: CHATS_NEW_URL,
            headers: newChatHeaders,
            transformedBody: body,
          };
        }
      }

      let data;
      try {
        data = await newChatRes.json();
      } catch {
        return {
          response: errorResponse(401, WAF_ERROR_MESSAGE),
          url: CHATS_NEW_URL,
          headers: newChatHeaders,
          transformedBody: body,
        };
      }
      chatId = data?.data?.id ?? "";
      if (!chatId) {
        return {
          response: errorResponse(502, "Qwen create-chat returned no chat id"),
          url: CHATS_NEW_URL,
          headers: newChatHeaders,
          transformedBody: body,
        };
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          response: errorResponse(499, "Request cancelled"),
          url: CHATS_NEW_URL,
          headers: {},
          transformedBody: body,
        };
      }
      const msg = err instanceof Error ? err.message : String(err);
      log?.error?.("QWEN-WEB", `chats/new error: ${msg}`);
      return {
        response: errorResponse(502, `Qwen create-chat error: ${msg}`),
        url: CHATS_NEW_URL,
        headers: {},
        transformedBody: body,
      };
    }

    // ── Step 2: completion ───────────────────────────────────────────────────
    const completionUrl = `${CHAT_COMPLETIONS_URL}?chat_id=${chatId}`;
    const msgPayload = buildMessagePayload(chatId, modelId, prompt, requestedModel);
    const reqHeaders = buildApiHeaders(token, cookieHeader, chatId);

    log?.info?.(
      "QWEN-WEB",
      `model=${modelId}, thinking=${msgPayload.messages[0].feature_config.thinking_enabled}, stream=${stream !== false}`
    );

    let upstream;
    try {
      upstream = await fetch(completionUrl, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(msgPayload),
        signal: signal ?? undefined,
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      log?.error?.("QWEN-WEB", `completion fetch failed: ${msg}`);
      return {
        response: errorResponse(502, `Qwen connection failed: ${msg}`),
        url: completionUrl,
        headers: reqHeaders,
        transformedBody: msgPayload,
      };
    }

    const ct = upstream.headers.get("content-type") || "";
    if (!upstream.ok || ct.includes("text/html")) {
      const errText = await upstream.text().catch(() => "");
      const status = upstream.status;

      if (isWafResponse(status, ct, errText) || status === 401 || status === 403) {
        log?.warn?.("QWEN-WEB", WAF_ERROR_MESSAGE);
        return {
          response: errorResponse(401, status === 401 || status === 403 ? REPASTE_MSG : WAF_ERROR_MESSAGE),
          url: completionUrl,
          headers: reqHeaders,
          transformedBody: msgPayload,
        };
      }

      let errMsg = `Qwen API error (${status})`;
      if (status === 429) errMsg = "Qwen rate limited. Wait and retry.";
      log?.warn?.("QWEN-WEB", errMsg);
      return {
        response: errorResponse(status || 502, errMsg),
        url: completionUrl,
        headers: reqHeaders,
        transformedBody: msgPayload,
      };
    }

    if (stream !== false) {
      const openaiStream = transformSSE(upstream.body, clientModel);
      return {
        response: new Response(openaiStream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        }),
        url: completionUrl,
        headers: reqHeaders,
        transformedBody: msgPayload,
      };
    }

    const { content, reasoningContent } = await collectSSEContent(upstream.body);
    const message = { role: "assistant", content };
    if (reasoningContent) message.reasoning_content = reasoningContent;
    const openaiResponse = {
      id: `chatcmpl-qwen-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: clientModel,
      choices: [{ index: 0, message, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
    return {
      response: new Response(JSON.stringify(openaiResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      url: completionUrl,
      headers: reqHeaders,
      transformedBody: msgPayload,
    };
  }
}

export default QwenWebExecutor;
