// Shared guards for token savers. Fail-open: unknown tool still gets RTK.

// Word-boundary misses Grok `run_terminal_command` (underscore is \w).
const SHELL_TOOL_NAME_RE =
  /(bash|shell|zsh|powershell|run_terminal_command|run_command|execute_command|terminal_command|(^|_)(exec|cmd|sh|command)(_|$))/i;

export function hasCacheControl(obj) {
  return !!(obj && typeof obj === "object" && obj.cache_control != null);
}

export function isShellToolName(name) {
  return typeof name === "string" && SHELL_TOOL_NAME_RE.test(name);
}

/** Unknown / missing name → apply RTK (old behavior). Known non-shell → skip. */
export function shouldApplyRtkFilter(toolName) {
  if (!toolName) return true;
  return isShellToolName(toolName);
}

export function buildToolNameLookup(items) {
  const map = new Map();
  if (!Array.isArray(items)) return map;
  for (const msg of items) {
    if (!msg) continue;
    if (Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        const id = tc?.id;
        const name = tc?.function?.name || tc?.name || "";
        if (id) map.set(id, name);
      }
    }
    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part?.type === "tool_use" && part.id) map.set(part.id, part.name || "");
      }
    }
    if (msg.type === "function_call" && (msg.call_id || msg.id)) {
      map.set(msg.call_id || msg.id, msg.name || msg.function?.name || "");
    }
  }
  return map;
}

export function toolIdOf(msg, block) {
  return block?.tool_use_id || msg?.tool_call_id || msg?.call_id || null;
}
