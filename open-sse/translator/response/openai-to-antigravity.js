import { register } from "../index.js";
import { FORMATS } from "../formats.js";
import { GEMINI_ROLE, OPENAI_FINISH, GEMINI_FINISH } from "../schema/index.js";

function parseToolCallArgs(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch { /* incomplete JSON */ }
  return {};
}

const LIST_DIR_RE = /^(list_dir|listdir|list_directory)$/i;
const BASH_RE = /^(bash|run_command|runcommand|shell)$/i;
const DIR_KEYS = ["uri", "DirectoryPath", "directoryPath", "directory_path", "path", "Path", "AbsolutePath", "absolutePath"];
const CMD_KEYS = ["command", "Command", "cmd", "Cmd", "script", "ShellCommand", "commandLine"];

function toFileUri(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const s = raw.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return s;
  if (s.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    return `file://${home}${s.slice(1)}`;
  }
  if (s.startsWith("/")) return `file://${s}`;
  if (/^[A-Za-z]:[\\/]/.test(s)) return `file:///${s.replace(/\\/g, "/")}`;

  return null;
}

function pickDirPath(obj) {
  if (!obj || typeof obj !== "object") return null;
  for (const k of DIR_KEYS) {
    if (typeof obj[k] === "string" && obj[k].trim()) return obj[k];
  }
  return null;
}

function pickString(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    if (typeof obj[k] === "string" && obj[k].trim()) return obj[k];
  }
  return null;
}

/** AGY CLI ListDir reads `uri` (file://). Models often send DirectoryPath/path. */
function normalizeAgListDirArgs(name, args) {
  if (!LIST_DIR_RE.test(name || "") || !args || typeof args !== "object") return args;
  const inner = args.parameters && typeof args.parameters === "object" ? args.parameters : null;
  const raw = pickDirPath(args) || pickDirPath(inner);
  const uri = toFileUri(raw);
  if (!uri) return args;
  const next = { ...args, uri };
  if (inner) next.parameters = { ...inner, uri };
  return next;
}

/** AGY `run_command` / Claude `Bash` — keep `command` even if model sent Command/cmd. */
function normalizeAgBashArgs(name, args) {
  if (!BASH_RE.test(name || "") || !args || typeof args !== "object") return args;
  const inner = args.parameters && typeof args.parameters === "object" ? args.parameters : null;
  const cmd = pickString(args, CMD_KEYS) || pickString(inner, CMD_KEYS);
  if (!cmd) return args;
  const next = { ...args, command: cmd };
  if (inner) next.parameters = { ...inner, command: cmd };
  return next;
}

function normalizeAgToolArgs(name, args) {
  return normalizeAgBashArgs(name, normalizeAgListDirArgs(name, args));
}

// Convert OpenAI SSE chunk to Antigravity SSE format
// Real Antigravity format:
//   data: {"response":{"candidates":[{"content":{"role":"model","parts":[...]}, "finishReason":"STOP"}], "usageMetadata":{...}, "modelVersion":"...", "responseId":"..."}}
// Tool calls: OpenAI sends incremental args across chunks → accumulate and emit ONCE at finish
export function openaiToAntigravityResponse(chunk, state) {
  if (!chunk) return null;

  const choice = chunk.choices?.[0];
  if (!choice) {
    if (chunk.usage) {
      state._usage = chunk.usage;
    }
    return null;
  }

  const delta = choice.delta || {};
  const finishReason = choice.finish_reason;

  // Init state
  if (!state._toolCallAccum) state._toolCallAccum = {};
  if (!state._responseId) state._responseId = chunk.id || `resp_${Date.now()}`;
  if (!state._modelVersion) state._modelVersion = chunk.model || "";

  const parts = [];

  // Thinking/reasoning → thought part
  if (delta.reasoning_content) {
    parts.push({ thought: true, text: delta.reasoning_content });
  }

  // Text content
  if (delta.content) {
    parts.push({ text: delta.content });
  }

  // Accumulate tool calls silently (no emit until finish)
  if (delta.tool_calls) {
    for (const tc of delta.tool_calls) {
      const idx = tc.index ?? 0;
      if (!state._toolCallAccum[idx]) {
        state._toolCallAccum[idx] = { id: "", name: "", arguments: "" };
      }
      const accum = state._toolCallAccum[idx];
      if (tc.id) accum.id = tc.id;
      if (tc.function?.name) accum.name += tc.function.name;
      const piece = tc.function?.arguments;
      if (piece && typeof piece === "object") accum.arguments = piece;
      else if (typeof piece === "string" && piece) {
        accum.arguments = typeof accum.arguments === "string"
          ? accum.arguments + piece
          : piece;
      }
    }
    // Skip emit — wait for finish_reason
    if (parts.length === 0 && !finishReason) return null;
  }

  // On finish, emit accumulated tool calls as complete functionCall parts
  if (finishReason) {
    const indices = Object.keys(state._toolCallAccum);
    for (const idx of indices) {
      const accum = state._toolCallAccum[idx];
      const originalName = state.toolNameMap?.get(accum.name) || accum.name;
      const args = normalizeAgToolArgs(originalName, parseToolCallArgs(accum.arguments));
      const functionCall = { name: originalName, args };
      if (accum.id) functionCall.id = accum.id;
      parts.push({ functionCall });
    }
    state._toolCallAccum = {};
  }

  // Skip empty non-finish chunks
  if (parts.length === 0 && !finishReason) return null;

  // Ensure at least empty text part on finish with no content
  if (parts.length === 0 && finishReason) {
    parts.push({ text: "" });
  }

  // Build candidate
  const candidate = { content: { role: GEMINI_ROLE.MODEL, parts } };

  // Finish reason mapping
  if (finishReason) {
    const reasonMap = {
      [OPENAI_FINISH.STOP]: GEMINI_FINISH.STOP,
      [OPENAI_FINISH.LENGTH]: GEMINI_FINISH.MAX_TOKENS,
      [OPENAI_FINISH.TOOL_CALLS]: GEMINI_FINISH.STOP,
      [OPENAI_FINISH.CONTENT_FILTER]: GEMINI_FINISH.SAFETY
    };
    candidate.finishReason = reasonMap[finishReason] || GEMINI_FINISH.STOP;
  }

  // Build response
  const response = {
    candidates: [candidate],
    modelVersion: state._modelVersion,
    responseId: state._responseId
  };

  // Usage metadata
  const usage = chunk.usage || state._usage;
  if (usage) {
    response.usageMetadata = {
      promptTokenCount: usage.prompt_tokens || 0,
      candidatesTokenCount: usage.completion_tokens || 0,
      totalTokenCount: usage.total_tokens || 0
    };
    if (usage.completion_tokens_details?.reasoning_tokens) {
      response.usageMetadata.thoughtsTokenCount = usage.completion_tokens_details.reasoning_tokens;
    }
    const cached = Number(
      usage.prompt_tokens_details?.cached_tokens
      ?? usage.cached_tokens
      ?? usage.input_tokens_details?.cached_tokens
      ?? usage.cache_read_input_tokens
      ?? 0
    );
    if (cached > 0) {
      response.usageMetadata.cachedContentTokenCount = cached;
    }
  }

  return { response };
}

// Register
register(FORMATS.OPENAI, FORMATS.ANTIGRAVITY, null, openaiToAntigravityResponse);
