// Shared text-slot walker for lossless savers. Fail-open callers wrap this.
import { hasCacheControl } from "./cacheGuard.js";

function visit(slot, fn) {
  if (!slot || typeof slot.text !== "string") return;
  fn(slot);
}

function slotKindForRole(role, type) {
  if (role === "system" || role === "developer") return "system";
  if (role === "tool" || role === "function" || type === "function_call_output") return "tool";
  return "content";
}

function visitContentPart(part, fn, kind, role) {
  if (!part || hasCacheControl(part)) return;

  if (
    typeof part.text === "string" &&
    (part.type == null ||
      part.type === "text" ||
      part.type === "input_text" ||
      part.type === "output_text")
  ) {
    visit({ kind, role, text: part.text, set: (t) => { part.text = t; } }, fn);
  }

  if (part.type === "tool_result") {
    if (typeof part.content === "string") {
      visit({ kind: "tool", role: "tool", text: part.content, set: (t) => { part.content = t; } }, fn);
    } else if (Array.isArray(part.content)) {
      for (const inner of part.content) visitContentPart(inner, fn, "tool", "tool");
    }
  }

  if (part.type === "tool_use" && typeof part.input === "string") {
    visit({ kind: "args", role, text: part.input, set: (t) => { part.input = t; } }, fn);
  }
}

function visitMessage(msg, fn) {
  if (!msg || hasCacheControl(msg)) return;
  const role = msg.role || (msg.type === "function_call_output" ? "tool" : undefined);
  const kind = slotKindForRole(role, msg.type);

  if (typeof msg.content === "string") {
    visit({ kind, role, text: msg.content, set: (t) => { msg.content = t; } }, fn);
  } else if (Array.isArray(msg.content)) {
    for (const part of msg.content) visitContentPart(part, fn, kind, role);
  }

  if (typeof msg.output === "string" && (msg.type === "function_call_output" || msg.role === "tool")) {
    visit({ kind: "tool", role: "tool", text: msg.output, set: (t) => { msg.output = t; } }, fn);
  } else if (msg.type === "function_call_output" && Array.isArray(msg.output)) {
    for (const part of msg.output) visitContentPart(part, fn, "tool", "tool");
  }

  if (msg.type === "function_call" && typeof msg.arguments === "string") {
    visit({ kind: "args", role: "assistant", text: msg.arguments, set: (t) => { msg.arguments = t; } }, fn);
  }

  if (Array.isArray(msg.tool_calls)) {
    for (const tc of msg.tool_calls) {
      if (typeof tc?.function?.arguments === "string") {
        visit({ kind: "args", role: "assistant", text: tc.function.arguments, set: (t) => { tc.function.arguments = t; } }, fn);
      }
    }
  }
}

function visitGeminiSystem(sys, fn, setString) {
  if (!sys) return;
  if (typeof sys === "string") {
    if (typeof setString === "function") {
      visit({ kind: "system", role: "system", text: sys, set: setString }, fn);
    }
    return;
  }
  const parts = sys.parts;
  if (!Array.isArray(parts)) return;
  for (const part of parts) {
    if (typeof part?.text === "string") {
      visit({ kind: "system", role: "system", text: part.text, set: (t) => { part.text = t; } }, fn);
    }
  }
}

const GEMINI_RESPONSE_KEYS = ["output", "result", "content"];

/** Visit string slots on Gemini/Antigravity functionResponse (incl. one nest). */
export function forEachGeminiResponseText(fr, fn) {
  if (!fr) return;
  const resp = fr.response;
  if (typeof resp === "string") {
    fn({ text: resp, set: (t) => { fr.response = t; } });
    return;
  }
  if (!resp || typeof resp !== "object") return;
  if (resp.error != null || resp.is_error === true) return;
  walkGeminiResponseObject(resp, fn);
}

function walkGeminiResponseObject(obj, fn) {
  for (const key of GEMINI_RESPONSE_KEYS) {
    const val = obj[key];
    if (typeof val === "string") {
      fn({ text: val, set: (t) => { obj[key] = t; } });
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      // openai-to-gemini wraps non-JSON tool output as { result: { result: string } }
      for (const inner of GEMINI_RESPONSE_KEYS) {
        if (typeof val[inner] === "string") {
          fn({ text: val[inner], set: (t) => { val[inner] = t; } });
        }
      }
    }
  }
}

function visitGeminiContent(c, fn) {
  if (!c || !Array.isArray(c.parts)) return;
  const role = c.role === "model" ? "assistant" : (c.role === "system" ? "system" : "user");
  const kind = role === "system" ? "system" : "content";
  for (const part of c.parts) {
    // Mutating thought / signed text invalidates Gemini thoughtSignature → 400, tools fail.
    if (!part || part.thought === true) continue;
    const signed = part.thoughtSignature || part.thought_signature;
    if (typeof part.text === "string" && !signed) {
      visit({ kind, role, text: part.text, set: (t) => { part.text = t; } }, fn);
    }
    if (part.functionResponse) {
      forEachGeminiResponseText(part.functionResponse, ({ text, set }) => {
        visit({ kind: "tool", role: "tool", text, set }, fn);
      });
    }
    if (typeof part.functionCall?.args === "string") {
      visit({ kind: "args", role: "assistant", text: part.functionCall.args, set: (t) => { part.functionCall.args = t; } }, fn);
    }
  }
}

function visitKiro(body, fn) {
  const state = body.conversationState;
  if (!state) return;
  const all = Array.isArray(state.history) ? state.history.slice() : [];
  if (state.currentMessage) all.push(state.currentMessage);

  for (const msg of all) {
    const user = msg?.userInputMessage;
    if (user) {
      if (typeof user.content === "string") {
        visit({ kind: "content", role: "user", text: user.content, set: (t) => { user.content = t; } }, fn);
      }
      if (typeof user.systemInstruction === "string") {
        visit({ kind: "system", role: "system", text: user.systemInstruction, set: (t) => { user.systemInstruction = t; } }, fn);
      }
      const toolResults = user.userInputMessageContext?.toolResults;
      if (Array.isArray(toolResults)) {
        for (const tr of toolResults) {
          if (!Array.isArray(tr?.content)) continue;
          for (const part of tr.content) {
            if (typeof part?.text === "string") {
              visit({ kind: "tool", role: "tool", text: part.text, set: (t) => { part.text = t; } }, fn);
            }
          }
        }
      }
    }
    const asst = msg?.assistantResponseMessage;
    if (asst) {
      if (typeof asst.content === "string") {
        visit({ kind: "content", role: "assistant", text: asst.content, set: (t) => { asst.content = t; } }, fn);
      }
      if (Array.isArray(asst.toolUses)) {
        for (const tu of asst.toolUses) {
          if (typeof tu?.input === "string") {
            visit({ kind: "args", role: "assistant", text: tu.input, set: (t) => { tu.input = t; } }, fn);
          }
        }
      }
    }
  }
}

/** Visit every mutable text slot. Slot: { kind: "content"|"tool"|"args"|"system", role, text, set }. */
export function forEachTextSlot(body, fn) {
  if (!body || typeof fn !== "function") return;

  const items = Array.isArray(body.messages) ? body.messages
    : Array.isArray(body.input) ? body.input
    : null;
  if (items) {
    for (const msg of items) visitMessage(msg, fn);
  }

  const geminiRoots = [body];
  if (body.request && typeof body.request === "object") geminiRoots.push(body.request);
  for (const root of geminiRoots) {
    if (Array.isArray(root.contents)) {
      for (const c of root.contents) visitGeminiContent(c, fn);
    }
    if (root.system_instruction != null) {
      visitGeminiSystem(root.system_instruction, fn, (t) => { root.system_instruction = t; });
    } else if (root.systemInstruction != null) {
      visitGeminiSystem(root.systemInstruction, fn, (t) => { root.systemInstruction = t; });
    }
  }

  if (body.conversationState) visitKiro(body, fn);
}

export function walkItems(body) {
  if (Array.isArray(body?.messages)) return body.messages;
  if (Array.isArray(body?.input)) return body.input;
  return null;
}
