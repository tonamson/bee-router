// Shared text-slot walker for lossless savers. Fail-open callers wrap this.
import { hasCacheControl } from "./cacheGuard.js";

function visit(slot, fn) {
  if (!slot || typeof slot.text !== "string") return;
  fn(slot);
}

function visitContentPart(part, fn, kind) {
  if (!part || hasCacheControl(part)) return;

  if (
    typeof part.text === "string" &&
    (part.type == null ||
      part.type === "text" ||
      part.type === "input_text" ||
      part.type === "output_text")
  ) {
    visit({ kind, text: part.text, set: (t) => { part.text = t; } }, fn);
  }

  if (part.type === "tool_result") {
    if (typeof part.content === "string") {
      visit({ kind: "content", text: part.content, set: (t) => { part.content = t; } }, fn);
    } else if (Array.isArray(part.content)) {
      for (const inner of part.content) visitContentPart(inner, fn, "content");
    }
  }

  if (part.type === "tool_use" && typeof part.input === "string") {
    visit({ kind: "args", text: part.input, set: (t) => { part.input = t; } }, fn);
  }
}

function visitMessage(msg, fn) {
  if (!msg || hasCacheControl(msg)) return;
  const kind = msg.role === "system" || msg.role === "developer" ? "system" : "content";

  if (typeof msg.content === "string") {
    visit({ kind, text: msg.content, set: (t) => { msg.content = t; } }, fn);
  } else if (Array.isArray(msg.content)) {
    for (const part of msg.content) visitContentPart(part, fn, kind);
  }

  if (typeof msg.output === "string" && (msg.type === "function_call_output" || msg.role === "tool")) {
    visit({ kind: "content", text: msg.output, set: (t) => { msg.output = t; } }, fn);
  } else if (msg.type === "function_call_output" && Array.isArray(msg.output)) {
    for (const part of msg.output) visitContentPart(part, fn, "content");
  }

  if (msg.type === "function_call" && typeof msg.arguments === "string") {
    visit({ kind: "args", text: msg.arguments, set: (t) => { msg.arguments = t; } }, fn);
  }

  if (Array.isArray(msg.tool_calls)) {
    for (const tc of msg.tool_calls) {
      if (typeof tc?.function?.arguments === "string") {
        visit({ kind: "args", text: tc.function.arguments, set: (t) => { tc.function.arguments = t; } }, fn);
      }
    }
  }
}

function visitGeminiSystem(sys, fn, setString) {
  if (!sys) return;
  if (typeof sys === "string") {
    if (typeof setString === "function") {
      visit({ kind: "system", text: sys, set: setString }, fn);
    }
    return;
  }
  const parts = sys.parts;
  if (!Array.isArray(parts)) return;
  for (const part of parts) {
    if (typeof part?.text === "string") {
      visit({ kind: "system", text: part.text, set: (t) => { part.text = t; } }, fn);
    }
  }
}

function visitGeminiContent(c, fn) {
  if (!c || !Array.isArray(c.parts)) return;
  const kind = c.role === "system" ? "system" : "content";
  for (const part of c.parts) {
    if (!part) continue;
    if (typeof part.text === "string") {
      visit({ kind, text: part.text, set: (t) => { part.text = t; } }, fn);
    }
    const fr = part.functionResponse;
    if (typeof fr?.response === "string") {
      visit({ kind: "content", text: fr.response, set: (t) => { fr.response = t; } }, fn);
    } else if (fr?.response && typeof fr.response === "object") {
      for (const key of ["output", "result", "content"]) {
        if (typeof fr.response[key] === "string") {
          visit({ kind: "content", text: fr.response[key], set: (t) => { fr.response[key] = t; } }, fn);
        }
      }
    }
    if (typeof part.functionCall?.args === "string") {
      visit({ kind: "args", text: part.functionCall.args, set: (t) => { part.functionCall.args = t; } }, fn);
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
        visit({ kind: "content", text: user.content, set: (t) => { user.content = t; } }, fn);
      }
      if (typeof user.systemInstruction === "string") {
        visit({ kind: "system", text: user.systemInstruction, set: (t) => { user.systemInstruction = t; } }, fn);
      }
      const toolResults = user.userInputMessageContext?.toolResults;
      if (Array.isArray(toolResults)) {
        for (const tr of toolResults) {
          if (!Array.isArray(tr?.content)) continue;
          for (const part of tr.content) {
            if (typeof part?.text === "string") {
              visit({ kind: "content", text: part.text, set: (t) => { part.text = t; } }, fn);
            }
          }
        }
      }
    }
    const asst = msg?.assistantResponseMessage;
    if (asst) {
      if (typeof asst.content === "string") {
        visit({ kind: "content", text: asst.content, set: (t) => { asst.content = t; } }, fn);
      }
      if (Array.isArray(asst.toolUses)) {
        for (const tu of asst.toolUses) {
          if (typeof tu?.input === "string") {
            visit({ kind: "args", text: tu.input, set: (t) => { tu.input = t; } }, fn);
          }
        }
      }
    }
  }
}

/** Visit every mutable text slot. Slot: { kind: "content"|"args"|"system", text, set }. */
export function forEachTextSlot(body, fn) {
  if (!body || typeof fn !== "function") return;

  const items = Array.isArray(body.messages) ? body.messages
    : Array.isArray(body.input) ? body.input
    : null;
  if (items) {
    for (const msg of items) visitMessage(msg, fn);
  }

  if (Array.isArray(body.contents)) {
    for (const c of body.contents) visitGeminiContent(c, fn);
  }
  if (body.system_instruction != null) {
    visitGeminiSystem(body.system_instruction, fn, (t) => { body.system_instruction = t; });
  } else if (body.systemInstruction != null) {
    visitGeminiSystem(body.systemInstruction, fn, (t) => { body.systemInstruction = t; });
  }

  if (body.conversationState) visitKiro(body, fn);
}

export function walkItems(body) {
  if (Array.isArray(body?.messages)) return body.messages;
  if (Array.isArray(body?.input)) return body.input;
  return null;
}
