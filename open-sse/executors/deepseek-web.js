/**
 * DeepSeek Web cookie executor (chat-only; tools ignored).
 * Adapted from OmniRoute MIT (https://github.com/diegosouzapw/OmniRoute)
 */
import { BaseExecutor } from "./base.js";
import { extractDeepSeekUserToken } from "../lib/webCookieAuth.js";
import { solveDeepSeekPowAsync } from "../lib/deepseek-pow.js";

export const DEEPSEEK_WEB_BASE = "https://chat.deepseek.com";
const DEEPSEEK_API_BASE = `${DEEPSEEK_WEB_BASE}/api`;
const COMPLETION_URL = `${DEEPSEEK_API_BASE}/v0/chat/completion`;

// Chrome 149 fingerprint — no stale X-App-Version (bot signal)
const FAKE_HEADERS = {
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: DEEPSEEK_WEB_BASE,
  Referer: `${DEEPSEEK_WEB_BASE}/`,
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  "X-Client-Bundle-Id": "com.deepseek.chat",
  "X-Client-Locale": "en-US",
  "X-Client-Platform": "web",
  "X-Client-Version": "2.0.0",
};

const DEEPSEEK_FINISHED_DRAIN_MS = 750;
const DEFAULT_TOKEN_TTL_SEC = 5 * 60;
const CACHE_MAX_SIZE = 100;
const REPASTE_MSG =
  "DeepSeek token expired — re-paste userToken from chat.deepseek.com Local Storage";

/** userToken → { accessToken, expiresAt } */
const tokenCache = new Map();

export { extractDeepSeekUserToken as extractUserToken };

function authError() {
  const err = new Error(REPASTE_MSG);
  err.status = 401;
  return err;
}

export function parseOpenAIMessages(messages) {
  const extracted = [];
  for (const msg of messages) {
    let role = String(msg.role || "user");
    if (role === "developer") role = "system";
    let content = "";
    if (typeof msg.content === "string") {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      content = msg.content
        .filter((c) => c.type === "text")
        .map((c) => String(c.text || ""))
        .join(" ");
    }
    if (!content.trim()) continue;
    extracted.push({ role, text: content });
  }

  let lastUserIdx = -1;
  for (let i = extracted.length - 1; i >= 0; i--) {
    if (extracted[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }

  const parts = [];
  for (let i = 0; i < extracted.length; i++) {
    const { role, text } = extracted[i];
    parts.push(i === lastUserIdx ? text : `${role}: ${text}`);
  }
  return parts.join("\n\n");
}

export function resolveModelOptions(model, body) {
  const m = (model || "").toLowerCase();
  const modelType = m.includes("pro") || m.includes("expert") ? "expert" : "default";
  const thinkingEnabled =
    /think|reason|r1/i.test(m) || body?.thinking_enabled === true;
  const searchEnabled = /search/i.test(m) || body?.search_enabled === true;
  return { modelType, thinkingEnabled, searchEnabled };
}

function errorResponse(status, message, code) {
  return new Response(
    JSON.stringify({
      error: { message, type: status === 400 ? "invalid_request" : "upstream_error", code: code ?? `HTTP_${status}` },
    }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function evictOldest(cache) {
  if (cache.size >= CACHE_MAX_SIZE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

function generateFakeCookie() {
  const ts = Date.now();
  const hex = (n) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const uid = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  return `intercom-HWWAFSESTIME=${ts}; HWWAFSESID=${hex(18)}; Hm_lvt_${uid()}=${Math.floor(ts / 1000)}; _frid=${uid()}`;
}

function isThinkingModel(model) {
  const m = (model || "").toLowerCase();
  return m.includes("think") || m.includes("r1") || m.includes("reason");
}

function isSearchModel(model) {
  const m = (model || "").toLowerCase();
  return m.includes("search") || m.includes("fold");
}

function cleanDeepSeekToken(text) {
  return text.replace(/FINISHED/g, "").replace(/^(SEARCH|WEB_SEARCH|SEARCHING)\s*/i, "");
}

function formatStreamContent(raw, model) {
  let text = cleanDeepSeekToken(raw);
  if (!isSearchModel(model)) return text;
  if (model.toLowerCase().includes("search-silent")) {
    return text.replace(/\[citation:(\d+)\]/g, "");
  }
  return text.replace(/\[citation:(\d+)\]/g, "[$1]");
}

function appendSearchCitations(searchResults, model) {
  if (searchResults.length === 0 || (model || "").toLowerCase().includes("search-silent")) {
    return "";
  }
  return searchResults
    .filter((r) => r.cite_index)
    .sort((a, b) => (a.cite_index || 0) - (b.cite_index || 0))
    .map((r) => `[${r.cite_index}]: [${r.title}](${r.url})`)
    .join("\n");
}

function createFinishOnceGuard(finish) {
  let streamFinished = false;
  return {
    finishOnce: () => {
      if (streamFinished) return;
      streamFinished = true;
      try {
        finish();
      } catch {
        /* controller may already be closed */
      }
    },
    hasFinished: () => streamFinished,
  };
}

function createFinishedDrainScheduler(finishStream, drainMs = DEEPSEEK_FINISHED_DRAIN_MS) {
  let finishedDrainTimer = null;

  const clearFinishedDrain = () => {
    if (finishedDrainTimer) {
      clearTimeout(finishedDrainTimer);
      finishedDrainTimer = null;
    }
  };

  const scheduleFinishAfterDrain = () => {
    clearFinishedDrain();
    finishedDrainTimer = setTimeout(() => {
      finishedDrainTimer = null;
      finishStream();
    }, drainMs);
  };

  return {
    scheduleFinishAfterDrain,
    clearFinishedDrain,
    isDrainPending: () => finishedDrainTimer !== null,
  };
}

async function solvePow(challenge) {
  const answer = await solveDeepSeekPowAsync(
    challenge.algorithm,
    challenge.challenge,
    challenge.salt,
    challenge.difficulty,
    challenge.expire_at
  );
  if (answer < 0) throw new Error("PoW solver failed");
  return Buffer.from(
    JSON.stringify({
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      salt: challenge.salt,
      answer,
      signature: challenge.signature,
      target_path: challenge.target_path,
    })
  ).toString("base64");
}

function transformSSE(deepseekStream, model) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const streamModel = model || "deepseek-web";
  const id = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const created = Math.floor(Date.now() / 1000);
  let emittedRole = false;
  let currentPath = "";
  const thinkingModel = isThinkingModel(streamModel);
  const searchResults = [];

  return new ReadableStream({
    async start(controller) {
      const reader = deepseekStream.getReader();
      let buffer = "";

      const emit = (obj) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      const chunk = (delta, finish) => {
        emit({
          id,
          object: "chat.completion.chunk",
          created,
          model: streamModel,
          choices: [{ index: 0, delta, finish_reason: finish ?? null }],
        });
      };

      const ensureRole = () => {
        if (!emittedRole) {
          emittedRole = true;
          chunk({ role: "assistant", content: "" });
        }
      };

      const { finishOnce: finishStream, hasFinished } = createFinishOnceGuard(() => {
        const citations = appendSearchCitations(searchResults, streamModel);
        if (citations) {
          ensureRole();
          chunk({ content: `\n\n${citations}` });
        }
        ensureRole();
        chunk({}, "stop");
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      });

      const { scheduleFinishAfterDrain, clearFinishedDrain, isDrainPending } =
        createFinishedDrainScheduler(finishStream);

      const sendByPath = (raw) => {
        const text = formatStreamContent(raw, streamModel);
        if (!text) return;
        ensureRole();
        let path = currentPath;
        if (!path && thinkingModel) path = "thinking";
        else if (!path && isSearchModel(streamModel)) path = "content";
        if (path === "thinking") {
          chunk({ reasoning_content: text });
        } else {
          chunk({ content: text });
        }
      };

      const applyFragmentType = (frag) => {
        const type = String(frag?.type || "").toUpperCase();
        if (type === "THINK") currentPath = "thinking";
        else if (type === "ANSWER" || type === "RESPONSE") currentPath = "content";
      };

      const handleFragment = (frag, setPathFromType = false) => {
        if (setPathFromType) applyFragmentType(frag);
        if (typeof frag?.content !== "string" || frag.content.length === 0) return;
        if (!setPathFromType) {
          const type = String(frag?.type || "").toUpperCase();
          if (type === "THINK") currentPath = "thinking";
          else if (type === "ANSWER" || type === "RESPONSE") currentPath = "content";
        }
        sendByPath(frag.content);
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ") && !line.startsWith("data:")) continue;
            const payload = line.replace(/^data:\s*/, "").trim();

            if (payload === "[DONE]") {
              finishStream();
              return;
            }

            let data;
            try {
              data = JSON.parse(payload);
            } catch {
              continue;
            }

            const p = data?.p;
            const o = data?.o;
            const v = data?.v;

            if (v && typeof v === "object" && v.response) {
              if (v.response.thinking_enabled === true) currentPath = "thinking";
              else if (v.response.thinking_enabled === false) currentPath = "content";
              const fragments = v.response.fragments;
              if (Array.isArray(fragments)) {
                for (const frag of fragments) handleFragment(frag, false);
              }
            }

            if (p === "response/fragments") {
              if (Array.isArray(v)) {
                for (const frag of v) handleFragment(frag, true);
              } else if (v && typeof v === "object") {
                handleFragment(v, true);
              }
            }

            if (p === "response" && Array.isArray(v)) {
              for (const entry of v) {
                if (entry?.p === "response" && entry?.v?.thinking_enabled === true) {
                  currentPath = "thinking";
                }
              }
            }

            if (p === "response/search_status") continue;

            if (p === "response/search_results" && Array.isArray(v)) {
              if (o !== "BATCH") {
                searchResults.length = 0;
                searchResults.push(...v);
              } else {
                for (const op of v) {
                  const match = String(op?.p || "").match(/^(\d+)\/cite_index$/);
                  if (match) {
                    const index = parseInt(match[1], 10);
                    if (searchResults[index]) searchResults[index].cite_index = op.v;
                  }
                }
              }
              continue;
            }

            if (typeof v === "string") {
              sendByPath(v);
            } else if (Array.isArray(v) && p === "response") {
              for (const entry of v) {
                if (Array.isArray(entry?.v)) {
                  const joined = entry.v.map((item) => item?.content || "").join("");
                  if (joined) sendByPath(joined);
                }
              }
            }

            if (p === "response/status" && v === "FINISHED") {
              scheduleFinishAfterDrain();
              continue;
            }

            if (isDrainPending()) {
              scheduleFinishAfterDrain();
            }
          }
        }
      } catch (err) {
        clearFinishedDrain();
        if (!hasFinished()) {
          controller.error(err);
        }
        return;
      }

      finishStream();
    },
  });
}

async function collectSSEContent(deepseekStream, model) {
  const decoder = new TextDecoder();
  const reader = deepseekStream.getReader();
  let buffer = "";
  let content = "";
  let reasoningContent = "";
  let currentPath = "";
  const streamModel = model || "deepseek-web";
  const thinkingModel = isThinkingModel(streamModel);
  const searchResults = [];

  const appendByPath = (raw) => {
    const text = formatStreamContent(raw, streamModel);
    if (!text) return;
    let path = currentPath;
    if (!path && thinkingModel) path = "thinking";
    else if (!path && isSearchModel(streamModel)) path = "content";
    if (path === "thinking") reasoningContent += text;
    else content += text;
  };

  const handleFragment = (frag, setPathFromType = false) => {
    if (setPathFromType) {
      const type = String(frag?.type || "").toUpperCase();
      if (type === "THINK") currentPath = "thinking";
      else if (type === "ANSWER" || type === "RESPONSE") currentPath = "content";
    }
    if (typeof frag?.content !== "string" || frag.content.length === 0) return;
    if (!setPathFromType) {
      const type = String(frag?.type || "").toUpperCase();
      if (type === "THINK") currentPath = "thinking";
      else if (type === "ANSWER" || type === "RESPONSE") currentPath = "content";
    }
    appendByPath(frag.content);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ") && !line.startsWith("data:")) continue;
      const payload = line.replace(/^data:\s*/, "").trim();
      try {
        const data = JSON.parse(payload);
        const p = data?.p;
        const v = data?.v;

        if (v && typeof v === "object" && v.response) {
          if (v.response.thinking_enabled === true) currentPath = "thinking";
          else if (v.response.thinking_enabled === false) currentPath = "content";
          if (Array.isArray(v.response.fragments)) {
            for (const frag of v.response.fragments) handleFragment(frag, false);
          }
        }

        if (p === "response/fragments") {
          if (Array.isArray(v)) {
            for (const frag of v) handleFragment(frag, true);
          } else if (v && typeof v === "object") {
            handleFragment(v, true);
          }
        }

        if (p === "response" && Array.isArray(v)) {
          for (const entry of v) {
            if (entry?.p === "response" && entry?.v?.thinking_enabled === true) {
              currentPath = "thinking";
            }
          }
        }

        if (p === "response/search_status") continue;

        if (p === "response/search_results" && Array.isArray(v)) {
          if (data?.o !== "BATCH") {
            searchResults.length = 0;
            searchResults.push(...v);
          } else {
            for (const op of v) {
              const match = String(op?.p || "").match(/^(\d+)\/cite_index$/);
              if (match) {
                const index = parseInt(match[1], 10);
                if (searchResults[index]) searchResults[index].cite_index = op.v;
              }
            }
          }
          continue;
        }

        if (typeof v === "string") {
          appendByPath(v);
        } else if (Array.isArray(v) && p === "response") {
          for (const entry of v) {
            if (Array.isArray(entry?.v)) {
              const joined = entry.v.map((item) => item?.content || "").join("");
              if (joined) appendByPath(joined);
            }
          }
        }
      } catch {
        // skip
      }
    }
  }

  const citations = appendSearchCitations(searchResults, streamModel);
  if (citations) content += `\n\n${citations}`;

  return { content, reasoningContent };
}

async function acquireAccessToken(userToken, signal, log) {
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(userToken);
  if (cached && cached.expiresAt > now) {
    return cached.accessToken;
  }

  log?.info?.("DEEPSEEK-WEB", "Acquiring access token from /users/current...");
  const resp = await fetch(`${DEEPSEEK_API_BASE}/v0/users/current`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${userToken}`,
      ...FAKE_HEADERS,
    },
    signal: signal ?? undefined,
  });

  if (resp.status === 401 || resp.status === 403) {
    tokenCache.delete(userToken);
    throw authError();
  }
  if (!resp.ok) {
    throw new Error(`users/current HTTP ${resp.status}`);
  }

  const json = await resp.json();
  if (json?.code && json.code !== 0) {
    tokenCache.delete(userToken);
    throw new Error(`DeepSeek rejected token: ${json.msg || json?.data?.biz_msg || `error code ${json.code}`}`);
  }
  const bizData = json?.data?.biz_data || json?.biz_data;
  if (!bizData?.token) {
    throw new Error(`Failed to acquire token: ${json?.msg || json?.data?.biz_msg || "Unknown error"}`);
  }

  const accessToken = bizData.token;
  const expiresAt =
    typeof bizData.expiresAt === "number"
      ? bizData.expiresAt
      : typeof bizData.expires_at === "number"
        ? bizData.expires_at
        : now + DEFAULT_TOKEN_TTL_SEC;

  evictOldest(tokenCache);
  tokenCache.set(userToken, { accessToken, expiresAt });
  log?.info?.("DEEPSEEK-WEB", `Access token acquired (${accessToken.length} chars)`);
  return accessToken;
}

async function createSession(accessToken, signal) {
  const resp = await fetch(`${DEEPSEEK_API_BASE}/v0/chat_session/create`, {
    method: "POST",
    headers: {
      ...FAKE_HEADERS,
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Cookie: generateFakeCookie(),
    },
    body: JSON.stringify({}),
    signal: signal ?? undefined,
  });

  if (resp.status === 401 || resp.status === 403) throw authError();
  if (!resp.ok) throw new Error(`chat_session/create HTTP ${resp.status}`);
  const json = await resp.json();
  const bizData = json?.data?.biz_data || json?.biz_data;
  const id = bizData?.chat_session?.id;
  if (!id) throw new Error(`No session id: code=${json?.code}`);
  return id;
}

async function getPowChallenge(accessToken, signal) {
  const resp = await fetch(`${DEEPSEEK_API_BASE}/v0/chat/create_pow_challenge`, {
    method: "POST",
    headers: {
      ...FAKE_HEADERS,
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ target_path: "/api/v0/chat/completion" }),
    signal: signal ?? undefined,
  });
  if (resp.status === 401 || resp.status === 403) throw authError();
  if (!resp.ok) throw new Error(`create_pow_challenge HTTP ${resp.status}`);
  const json = await resp.json();
  const bizData = json?.data?.biz_data || json?.biz_data;
  if (!bizData?.challenge?.challenge) throw new Error(`No PoW challenge: code=${json?.code}`);
  return bizData.challenge;
}

export class DeepSeekWebExecutor extends BaseExecutor {
  constructor() {
    super("deepseek-web", { baseUrl: DEEPSEEK_WEB_BASE });
  }

  async execute({ model, body, stream, credentials, signal, log }) {
    const bodyObj = body || {};
    const messages = bodyObj.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        response: errorResponse(400, "Missing or empty messages array"),
        url: COMPLETION_URL,
        headers: {},
        transformedBody: body,
      };
    }

    const prompt = parseOpenAIMessages(messages);
    if (!prompt.trim()) {
      return {
        response: errorResponse(400, "Empty query after processing"),
        url: COMPLETION_URL,
        headers: {},
        transformedBody: body,
      };
    }

    const userToken = extractDeepSeekUserToken(credentials?.apiKey || "");
    if (!userToken) {
      return {
        response: errorResponse(400, "Missing DeepSeek userToken — paste from Local Storage"),
        url: COMPLETION_URL,
        headers: {},
        transformedBody: body,
      };
    }

    const { modelType, thinkingEnabled, searchEnabled } = resolveModelOptions(model, bodyObj);
    // tools intentionally ignored (chat-only)

    try {
      const accessToken = await acquireAccessToken(userToken, signal, log);
      const sessionId = await createSession(accessToken, signal);

      let powAnswer;
      try {
        const powChallenge = await getPowChallenge(accessToken, signal);
        powAnswer = await solvePow(powChallenge);
      } catch (powErr) {
        if (powErr?.status === 401 || powErr?.status === 403) {
          tokenCache.delete(userToken);
          return {
            response: errorResponse(401, REPASTE_MSG),
            url: COMPLETION_URL,
            headers: {},
            transformedBody: body,
          };
        }
        const msg = powErr instanceof Error ? powErr.message : String(powErr);
        log?.error?.("DEEPSEEK-WEB", `PoW failed: ${msg}`);
        return {
          response: errorResponse(502, `DeepSeek PoW failed: ${msg}`),
          url: COMPLETION_URL,
          headers: {},
          transformedBody: body,
        };
      }

      const reqHeaders = {
        ...FAKE_HEADERS,
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Ds-Pow-Response": powAnswer,
        "X-Client-Timezone-Offset": String(new Date().getTimezoneOffset() * -60),
        Cookie: generateFakeCookie(),
      };

      const requestPayload = {
        chat_session_id: sessionId,
        parent_message_id: null,
        model_type: modelType,
        prompt,
        ref_file_ids: [],
        thinking_enabled: thinkingEnabled,
        search_enabled: searchEnabled,
        preempt: false,
      };

      log?.info?.(
        "DEEPSEEK-WEB",
        `model_type=${modelType}, thinking=${thinkingEnabled}, search=${searchEnabled}, stream=${stream !== false}`
      );

      let resp;
      try {
        resp = await fetch(COMPLETION_URL, {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify(requestPayload),
          signal: signal ?? undefined,
        });
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        log?.error?.("DEEPSEEK-WEB", `Fetch failed: ${msg}`);
        return {
          response: errorResponse(502, `DeepSeek connection failed: ${msg}`),
          url: COMPLETION_URL,
          headers: reqHeaders,
          transformedBody: requestPayload,
        };
      }

      if (!resp.ok) {
        const status = resp.status;
        let errMsg = `DeepSeek API error (${status})`;
        if (status === 401 || status === 403) {
          tokenCache.delete(userToken);
          errMsg = REPASTE_MSG;
        } else if (status === 429) {
          errMsg = "DeepSeek rate limited. Wait and retry.";
        }
        log?.warn?.("DEEPSEEK-WEB", errMsg);
        return {
          response: errorResponse(status === 401 || status === 403 ? 401 : status, errMsg),
          url: COMPLETION_URL,
          headers: reqHeaders,
          transformedBody: requestPayload,
        };
      }

      const clientModel = typeof model === "string" && model.trim() ? model.trim() : "deepseek-web";

      if (stream !== false) {
        const openaiStream = transformSSE(resp.body, clientModel);
        return {
          response: new Response(openaiStream, {
            status: 200,
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          }),
          url: COMPLETION_URL,
          headers: reqHeaders,
          transformedBody: requestPayload,
        };
      }

      const { content, reasoningContent } = await collectSSEContent(resp.body, clientModel);
      const message = { role: "assistant", content };
      if (reasoningContent) message.reasoning_content = reasoningContent;
      const openaiResponse = {
        id: `chatcmpl-${Date.now()}`,
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
        url: COMPLETION_URL,
        headers: reqHeaders,
        transformedBody: requestPayload,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log?.error?.("DEEPSEEK-WEB", `Execute failed: ${msg}`);

      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          response: errorResponse(499, "Request cancelled"),
          url: COMPLETION_URL,
          headers: {},
          transformedBody: body,
        };
      }

      if (err?.status === 401 || err?.status === 403) {
        tokenCache.delete(userToken);
        return {
          response: errorResponse(401, REPASTE_MSG),
          url: COMPLETION_URL,
          headers: {},
          transformedBody: body,
        };
      }

      return {
        response: errorResponse(err?.status || 502, msg),
        url: COMPLETION_URL,
        headers: {},
        transformedBody: body,
      };
    }
  }
}

export default DeepSeekWebExecutor;
