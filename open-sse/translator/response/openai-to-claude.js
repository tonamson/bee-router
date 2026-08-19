import { register } from "../index.js";
import { FORMATS } from "../formats.js";
import { ROLE, CLAUDE_BLOCK, MODEL_FALLBACK } from "../schema/index.js";
import { fromOpenAIFinish } from "../concerns/finishReason.js";
import { extractReasoningText } from "../concerns/reasoning.js";
import { appendToolArgBuffer, fallbackToolCallId } from "../concerns/toolCall.js";

// Legacy "proxy_" prefix used by older request translators. Response strips it
// defensively so tool names from such turns resolve back (e.g. proxy_Read → Read
// for arg sanitization). Current request translator emits no prefix ("") — strip
// is then a no-op. Kept intentionally; do NOT couple to request's empty prefix.
const CLAUDE_OAUTH_TOOL_PREFIX = "proxy_";

function stripProxyPrefix(name = "") {
  return name.startsWith(CLAUDE_OAUTH_TOOL_PREFIX)
    ? name.slice(CLAUDE_OAUTH_TOOL_PREFIX.length)
    : name;
}

// Sanitize tool call arguments to fix bad params from non-Anthropic models.
// Returns null when JSON is still incomplete (incremental stream).
function sanitizeToolArgs(toolName, argsJson) {
  try {
    const args = JSON.parse(argsJson);
    if (stripProxyPrefix(toolName) === "Read") sanitizeReadArgs(args);
    return JSON.stringify(args);
  } catch {
    return null;
  }
}

function ensureToolBlock(state, results, idx, tc) {
  if (!state.toolCalls) state.toolCalls = new Map();
  if (state.toolCalls.has(idx)) {
    const info = state.toolCalls.get(idx);
    if (tc.function?.name && !info.name) info.name = stripProxyPrefix(tc.function.name);
    if (tc.id && !info.id) info.id = tc.id;
    return info;
  }

  stopThinkingBlock(state, results);
  stopTextBlock(state, results);

  const toolBlockIndex = state.nextBlockIndex ?? 0;
  state.nextBlockIndex = toolBlockIndex + 1;
  const name = stripProxyPrefix(tc.function?.name || "");
  const id = tc.id || fallbackToolCallId(idx);
  const info = { id, name, blockIndex: toolBlockIndex, argsEmitted: false };
  state.toolCalls.set(idx, info);
  results.push({
    type: "content_block_start",
    index: toolBlockIndex,
    content_block: {
      type: CLAUDE_BLOCK.TOOL_USE,
      id,
      name,
      input: {}
    }
  });
  return info;
}

function emitToolArgsIfReady(state, results, idx, force) {
  const info = state.toolCalls?.get(idx);
  if (!info || info.argsEmitted) return;
  const buffered = state.toolArgBuffers?.get(idx);
  if (!buffered) return;
  const sanitized = sanitizeToolArgs(info.name, buffered);
  if (!sanitized && !force) return;
  results.push({
    type: "content_block_delta",
    index: info.blockIndex,
    delta: { type: "input_json_delta", partial_json: sanitized || buffered }
  });
  info.argsEmitted = true;
}

function finishClaudeMessage(state, results, finishReason) {
  if (state.claudeMessageStopped) return;
  stopThinkingBlock(state, results);
  stopTextBlock(state, results);

  if (state.toolArgBuffers) {
    for (const idx of state.toolArgBuffers.keys()) {
      if (!state.toolCalls?.has(idx)) ensureToolBlock(state, results, idx, {});
    }
  }

  if (state.toolCalls) {
    for (const [idx, toolInfo] of state.toolCalls) {
      emitToolArgsIfReady(state, results, idx, true);
      results.push({
        type: "content_block_stop",
        index: toolInfo.blockIndex
      });
    }
  }

  const reason = finishReason || (state.toolCalls?.size ? "tool_calls" : "stop");
  state.claudeMessageStopped = true;
  state.finishReason = reason;
  const finalUsage = state.usage || { input_tokens: 0, output_tokens: 0 };
  results.push({
    type: "message_delta",
    delta: { stop_reason: fromOpenAIFinish(reason, "claude") },
    usage: finalUsage
  });
  results.push({ type: "message_stop" });
}

function sanitizeReadArgs(args) {
  if (typeof args.limit === "string" && /^\d+$/.test(args.limit)) args.limit = Number(args.limit);
  if (typeof args.offset === "string" && /^-?\d+$/.test(args.offset)) args.offset = Number(args.offset);

  if (typeof args.limit === "number") {
    if (args.limit > 2000) args.limit = 2000;
    if (args.limit < 1) delete args.limit;
  }
  if (typeof args.offset === "number" && args.offset < 0) args.offset = 0;

  if ("pages" in args && !isValidPdfPagesArg(args.file_path, args.pages)) {
    delete args.pages;
  }
}

function isValidPdfPagesArg(filePath, pages) {
  return typeof filePath === "string" &&
    filePath.toLowerCase().endsWith(".pdf") &&
    typeof pages === "string" &&
    /^\d+(?:-\d+)?$/.test(pages);
}

// Helper: stop thinking block if started
function stopThinkingBlock(state, results) {
  if (!state.thinkingBlockStarted) return;
  results.push({
    type: "content_block_stop",
    index: state.thinkingBlockIndex
  });
  state.thinkingBlockStarted = false;
}

// Helper: stop text block if started
function stopTextBlock(state, results) {
  if (!state.textBlockStarted || state.textBlockClosed) return;
  state.textBlockClosed = true;
  results.push({
    type: "content_block_stop",
    index: state.textBlockIndex
  });
  state.textBlockStarted = false;
}

// Convert OpenAI stream chunk to Claude format
export function openaiToClaudeResponse(chunk, state) {
  if (!chunk) {
    if (state.claudeMessageStopped) return null;
    if (!state.toolCalls?.size && !state.toolArgBuffers?.size) return null;
    const results = [];
    finishClaudeMessage(state, results, null);
    return results.length > 0 ? results : null;
  }
  if (!chunk.choices?.[0]) return null;

  const results = [];
  const choice = chunk.choices[0];
  const delta = choice.delta;

  // Track usage from OpenAI chunk if available
  if (chunk.usage && typeof chunk.usage === "object") {
    const promptTokens = typeof chunk.usage.prompt_tokens === "number" ? chunk.usage.prompt_tokens : 0;
    const outputTokens = typeof chunk.usage.completion_tokens === "number" ? chunk.usage.completion_tokens : 0;

    // Extract cache tokens from prompt_tokens_details
    const cachedTokens = chunk.usage.prompt_tokens_details?.cached_tokens;
    const cacheCreationTokens = chunk.usage.prompt_tokens_details?.cache_creation_tokens;
    const cacheReadTokens = typeof cachedTokens === "number" ? cachedTokens : 0;
    const cacheCreateTokens = typeof cacheCreationTokens === "number" ? cacheCreationTokens : 0;

    // input_tokens = prompt_tokens - cached_tokens - cache_creation_tokens
    // Because OpenAI's prompt_tokens includes all prompt-side tokens
    const inputTokens = promptTokens - cacheReadTokens - cacheCreateTokens;

    state.usage = {
      input_tokens: inputTokens,
      output_tokens: outputTokens
    };

    // Add cache_read_input_tokens if present
    if (cacheReadTokens > 0) {
      state.usage.cache_read_input_tokens = cacheReadTokens;
    }

    // Add cache_creation_input_tokens if present
    if (cacheCreateTokens > 0) {
      state.usage.cache_creation_input_tokens = cacheCreateTokens;
    }

    // Note: completion_tokens_details.reasoning_tokens is already included in output_tokens
    // No need to add separately as Claude expects total output_tokens
  }

  // First chunk - ALWAYS send message_start first
  if (!state.messageStartSent) {
    state.messageStartSent = true;
    state.messageId = chunk.id?.replace("chatcmpl-", "") || `msg_${Date.now()}`;
    if (!state.messageId || state.messageId === "chat" || state.messageId.length < 8) {
      state.messageId = chunk.extend_fields?.requestId ||
        chunk.extend_fields?.traceId ||
        `msg_${Date.now()}`;
    }
    state.model = chunk.model || MODEL_FALLBACK;
    state.nextBlockIndex = 0;
    results.push({
      type: "message_start",
      message: {
        id: state.messageId,
        type: "message",
        role: ROLE.ASSISTANT,
        model: state.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 }
      }
    });
  }

  // Handle reasoning (thinking) across vendor shapes - GLM/DeepSeek/Qwen/MiniMax/etc.
  const reasoningContent = extractReasoningText(delta);
  if (reasoningContent) {
    stopTextBlock(state, results);

    if (!state.thinkingBlockStarted) {
      state.thinkingBlockIndex = state.nextBlockIndex++;
      state.thinkingBlockStarted = true;
      results.push({
        type: "content_block_start",
        index: state.thinkingBlockIndex,
        content_block: { type: CLAUDE_BLOCK.THINKING, thinking: "" }
      });
    }

    results.push({
      type: "content_block_delta",
      index: state.thinkingBlockIndex,
      delta: { type: "thinking_delta", thinking: reasoningContent }
    });
  }

  // Handle regular content
  if (delta?.content) {
    stopThinkingBlock(state, results);

    if (!state.textBlockStarted) {
      state.textBlockIndex = state.nextBlockIndex++;
      state.textBlockStarted = true;
      state.textBlockClosed = false;
      results.push({
        type: "content_block_start",
        index: state.textBlockIndex,
        content_block: { type: CLAUDE_BLOCK.TEXT, text: "" }
      });
    }

    results.push({
      type: "content_block_delta",
      index: state.textBlockIndex,
      delta: { type: "text_delta", text: delta.content }
    });
  }

  // Tool calls
  if (delta?.tool_calls) {
    for (const tc of delta.tool_calls) {
      const idx = tc.index ?? 0;

      if (tc.id || tc.function?.name) {
        ensureToolBlock(state, results, idx, tc);
      }

      if (tc.function?.arguments) {
        appendToolArgBuffer(state, idx, tc.function.arguments);
        if (state.toolCalls?.has(idx)) {
          emitToolArgsIfReady(state, results, idx, false);
        }
      }
    }
  }

  if (choice.finish_reason) {
    finishClaudeMessage(state, results, choice.finish_reason);
  }

  return results.length > 0 ? results : null;
}

// Register
register(FORMATS.OPENAI, FORMATS.CLAUDE, null, openaiToClaudeResponse);
