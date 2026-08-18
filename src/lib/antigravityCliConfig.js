export const MODEL_PROVIDER = "gemini";
export const SHELL_MARK_BEGIN = "# bee-router-agy-begin";
export const SHELL_MARK_END = "# bee-router-agy-end";
export const PREV_MODEL_KEY = "BEE_ROUTER_PREV_MODEL";
export const ROUTE_MODEL_KEY = "BEE_ROUTER_MODEL";
/** agy Gemini-API mode only accepts its catalog names, not bee-router provider/model ids. */
export const AGY_CATALOG_MODEL = "Gemini 3.1 Pro";

export function isBeeRouterModelId(model) {
  return typeof model === "string" && model.includes("/");
}

/** agy sends catalog names (gemini-3.1-pro / Gemini 3.1 Pro); rewrite to Apply target. */
export function resolveAgyRouteModel(incomingModel, env) {
  const dest = env?.[ROUTE_MODEL_KEY];
  if (!dest) return incomingModel;
  const raw = String(incomingModel || "").replace(/^models\//, "");
  if (!raw || isBeeRouterModelId(raw)) return incomingModel;
  if (/^gemini/i.test(raw) || /^Gemini\s/i.test(raw)) return dest;
  return incomingModel;
}

/** CloudCode proto has no `stream` field — streaming is the :streamGenerateContent URL. */
export function buildAgyInternalChatBody(body, env) {
  const next = body && typeof body === "object" && !Array.isArray(body) ? { ...body } : {};
  delete next.stream;
  next.model = resolveAgyRouteModel(next.model, env);
  if (!next.userAgent) next.userAgent = "antigravity";
  return next;
}

export function normalizeGeminiBaseUrl(url) {
  let value = String(url || "").trim().replace(/\/+$/, "");
  value = value.replace(/\/v1beta$/i, "").replace(/\/v1$/i, "");
  return value.replace("://localhost", "://127.0.0.1");
}

export function applyAntigravitySettings(currentSettings, { model }) {
  const next = currentSettings && typeof currentSettings === "object" && !Array.isArray(currentSettings)
    ? { ...currentSettings }
    : {};
  next.modelProvider = MODEL_PROVIDER;
  if (model) next.model = isBeeRouterModelId(model) ? AGY_CATALOG_MODEL : model;
  return next;
}

export function resetAntigravitySettings(currentSettings, { previousModel } = {}) {
  const next = currentSettings && typeof currentSettings === "object" && !Array.isArray(currentSettings)
    ? { ...currentSettings }
    : {};
  delete next.modelProvider;
  if (typeof previousModel === "string" && previousModel.trim()) {
    next.model = previousModel;
  }
  return next;
}

export function hasBeeRouterConfig(settings, env) {
  return settings?.modelProvider === MODEL_PROVIDER && Boolean(env?.GOOGLE_GEMINI_BASE_URL);
}

function escapeEnvValue(value) {
  return `"${String(value ?? "").replace(/[\r\n]/g, "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function unescapeEnvValue(value) {
  const raw = String(value ?? "");
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    const inner = raw.slice(1, -1);
    if (raw.startsWith('"')) return inner.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    return inner;
  }
  return raw;
}

export const WRAPPER_MARK = "bee-router-agy-wrapper";

export function serializeRouterEnv({ apiKey, baseUrl, previousModel, routeModel }) {
  const lines = [
    "# bee-router AGY — sourced by the local agy wrapper. Do not edit modelProvider here.",
    `GEMINI_API_KEY=${escapeEnvValue(apiKey)}`,
    `GOOGLE_GEMINI_BASE_URL=${escapeEnvValue(baseUrl)}`,
  ];
  if (routeModel) lines.push(`${ROUTE_MODEL_KEY}=${escapeEnvValue(routeModel)}`);
  if (previousModel) lines.push(`${PREV_MODEL_KEY}=${escapeEnvValue(previousModel)}`);
  return `${lines.join("\n")}\n`;
}

/** agy only reads GEMINI_API_KEY from process env — wrap the binary, never zshrc. */
export function serializeAgyWrapper({ envPath, realBin }) {
  const envQuoted = String(envPath || "").replace(/"/g, '\\"');
  const realQuoted = String(realBin || "").replace(/"/g, '\\"');
  return [
    "#!/bin/sh",
    `# ${WRAPPER_MARK}`,
    `if [ -f "${envQuoted}" ]; then set -a; . "${envQuoted}"; set +a; fi`,
    `exec "${realQuoted}" "$@"`,
    "",
  ].join("\n");
}

export function isAgyWrapper(text) {
  return typeof text === "string" && text.includes(WRAPPER_MARK);
}

export function parseRouterEnv(text) {
  const env = {};
  if (!text) return env;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    env[line.slice(0, eq)] = unescapeEnvValue(line.slice(eq + 1));
  }
  return env;
}

export function shellSourceBlock(envPath) {
  const quoted = envPath.replace(/"/g, '\\"');
  return [
    SHELL_MARK_BEGIN,
    `if [ -f "${quoted}" ]; then set -a; . "${quoted}"; set +a; fi`,
    SHELL_MARK_END,
  ].join("\n");
}

export function upsertShellBlock(profileText, envPath) {
  const block = shellSourceBlock(envPath);
  const source = profileText || "";
  const pattern = new RegExp(
    `${SHELL_MARK_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${SHELL_MARK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
  );
  if (pattern.test(source)) return source.replace(pattern, `${block}\n`);
  const prefix = source.length > 0 && !source.endsWith("\n") ? `${source}\n` : source;
  return `${prefix}\n${block}\n`;
}

export function removeShellBlock(profileText) {
  const pattern = new RegExp(
    `\n?${SHELL_MARK_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${SHELL_MARK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
  );
  return String(profileText || "").replace(pattern, "\n").replace(/\n{3,}/g, "\n\n");
}
