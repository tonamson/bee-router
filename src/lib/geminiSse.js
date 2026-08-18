import { openaiToAntigravityResponse } from "../../open-sse/translator/response/openai-to-antigravity.js";

/** OpenAI SSE/JSON → Gemini public GenerateContent shape (no CloudCode `response` envelope). */
export function openaiChunkToGemini(chunk, state, model) {
  const wrapped = openaiToAntigravityResponse(chunk, state);
  if (!wrapped?.response) return null;
  if (!wrapped.response.modelVersion) {
    wrapped.response.modelVersion = chunk.model || model;
  }
  return wrapped.response;
}

function emitGeminiLine(line, state, model, controller, encoder) {
  if (!line.startsWith("data:")) return;

  const data = line.slice(5).trim();
  if (!data || data === "[DONE]") return;

  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }

  const gemini = openaiChunkToGemini(parsed, state, model);
  if (!gemini) return;

  controller.enqueue(
    encoder.encode("data: " + JSON.stringify(gemini) + "\r\n\r\n")
  );
}

/**
 * Transform an OpenAI SSE stream into a Gemini SSE stream.
 * Buffers incomplete lines and flushes leftover tool_calls when the stream
 * ends without finish_reason — otherwise agy hangs on ListDir()/Bash().
 */
export function transformOpenAISSEToGeminiSSE(upstreamResponse, model) {
  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return upstreamResponse;
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const state = {};
  let carry = "";

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      carry += decoder.decode(chunk, { stream: true });
      const lines = carry.split("\n");
      carry = lines.pop() ?? "";
      for (const line of lines) {
        emitGeminiLine(line, state, model, controller, encoder);
      }
    },
    flush(controller) {
      carry += decoder.decode();
      if (carry) emitGeminiLine(carry, state, model, controller, encoder);
      if (state._toolCallAccum && Object.keys(state._toolCallAccum).length > 0) {
        const gemini = openaiChunkToGemini({
          choices: [{ delta: {}, finish_reason: "tool_calls" }],
        }, state, model);
        if (gemini) {
          controller.enqueue(
            encoder.encode("data: " + JSON.stringify(gemini) + "\r\n\r\n")
          );
        }
      }
    },
  });

  return new Response(upstreamResponse.body.pipeThrough(transformStream), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function convertOpenAIResponseToGemini(response, model) {
  if (!response.ok) return response;

  let body;
  try {
    body = await response.json();
  } catch {
    return response;
  }

  if (body.candidates) return Response.json(body, {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });

  if (body.error) return Response.json(body, {
    status: response.status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });

  const choice = body.choices?.[0];
  if (!choice) {
    return Response.json(body, {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const message = choice.message || {};
  const geminiResponse = openaiChunkToGemini({
    id: body.id,
    model: body.model || model,
    choices: [{
      delta: {
        content: message.content,
        reasoning_content: message.reasoning_content,
        tool_calls: message.tool_calls,
      },
      finish_reason: choice.finish_reason,
    }],
    usage: body.usage,
  }, {}, model) || { candidates: [] };

  return Response.json(geminiResponse, {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
