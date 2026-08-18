// Format identifiers
export const FORMATS = {
  OPENAI: "openai",
  OPENAI_RESPONSES: "openai-responses",
  OPENAI_RESPONSE: "openai-response",
  CLAUDE: "claude",
  GEMINI: "gemini",
  GEMINI_CLI: "gemini-cli",
  VERTEX: "vertex",
  CODEX: "codex",
  ANTIGRAVITY: "antigravity",
  KIRO: "kiro",
  CURSOR: "cursor",
  OLLAMA: "ollama",
  COMMANDCODE: "commandcode"
};

/**
 * Detect source format from request URL pathname + body.
 * Returns null to fall back to body-based detection.
 */
export function detectFormatByEndpoint(pathname, body) {
  // /v1/responses is always openai-responses
  if (pathname.includes("/v1/responses")) return FORMATS.OPENAI_RESPONSES;

  // /v1/messages is always Claude
  if (pathname.includes("/v1/messages")) return FORMATS.CLAUDE;

  // agy / Antigravity IDE CloudCode. Do not require userAgent — MITM and
  // custom-server rewrite leave pathname as /api/v1internal.
  if (pathname.includes("/v1internal")) return FORMATS.ANTIGRAVITY;

  // /v1/chat/completions + input[] → treat as openai (Cursor CLI sends Responses body via chat endpoint)
  if (pathname.includes("/v1/chat/completions") && Array.isArray(body?.input)) {
    return FORMATS.OPENAI;
  }

  return null;
}

