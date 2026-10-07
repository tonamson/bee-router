export const MODEL_PROVIDER = "gemini";
export const SHELL_MARK_BEGIN = "# bee-router-agy-begin";
export const SHELL_MARK_END = "# bee-router-agy-end";
export const PREV_MODEL_KEY = "BEE_ROUTER_PREV_MODEL";
export const ROUTE_MODEL_KEY = "BEE_ROUTER_MODEL";
/** agy Gemini-API mode only accepts its catalog names, not bee-router provider/model ids. */
export const AGY_CATALOG_MODEL = "Gemini 3.1 Pro";

// ponytail: agy's Gemini-API-key catalog, hand-copied from agy 1.3.1; extend when agy adds models.
const AGY_CATALOG_LEVELS = {
  Pro: { versions: ["3.1"], levels: ["Low", "High"] },
  Flash: { versions: ["3.5", "3.6", "3.7", "3.8"], levels: ["Low", "Medium", "High"] },
};

/** Show the routed model in agy's banner: ag/gemini-3.8-flash-medium → "Gemini 3.8 Flash (Medium)". */
export function toAgyCatalogModel(model) {
  const id = String(model || "").split("/").pop();
  const match = /^gemini-(\d+\.\d+)-(pro|flash)(?:-(low|medium|high))?$/i.exec(id);
  if (!match) return AGY_CATALOG_MODEL;
  const family = match[2][0].toUpperCase() + match[2].slice(1).toLowerCase();
  const entry = AGY_CATALOG_LEVELS[family];
  if (!entry.versions.includes(match[1])) return AGY_CATALOG_MODEL;
  const label = `Gemini ${match[1]} ${family}`;
  const level = match[3] && match[3][0].toUpperCase() + match[3].slice(1).toLowerCase();
  return level && entry.levels.includes(level) ? `${label} (${level})` : label;
}

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
  if (model) next.model = isBeeRouterModelId(model) ? toAgyCatalogModel(model) : model;
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

/** Single-quoted for /bin/sh: the env file is sourced, so `$`, backticks and `\` must stay literal. */
function shellQuote(value) {
  return `'${String(value ?? "").replace(/[\r\n]/g, "").replace(/'/g, "'\\''")}'`;
}

function unescapeEnvValue(value) {
  const raw = String(value ?? "");
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    const inner = raw.slice(1, -1);
    // Double quotes: files written before the switch to single quotes.
    if (raw.startsWith('"')) return inner.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    return inner.replace(/'\\''/g, "'");
  }
  return raw;
}

export const WRAPPER_MARK = "bee-router-agy-wrapper";

export function serializeRouterEnv({ apiKey, baseUrl, previousModel, routeModel }) {
  const lines = [
    "# bee-router AGY — sourced by the local agy wrapper. Do not edit modelProvider here.",
    `GEMINI_API_KEY=${shellQuote(apiKey)}`,
    `GOOGLE_GEMINI_BASE_URL=${shellQuote(baseUrl)}`,
  ];
  if (routeModel) lines.push(`${ROUTE_MODEL_KEY}=${shellQuote(routeModel)}`);
  if (previousModel) lines.push(`${PREV_MODEL_KEY}=${shellQuote(previousModel)}`);
  return `${lines.join("\n")}\n`;
}

/** agy only reads GEMINI_API_KEY from process env — wrap the binary, never zshrc.
 * realBin's basename must stay `agy`: herdr detects the agent by process name. */
export function serializeAgyWrapper({ envPath, realBin }) {
  const envQuoted = shellQuote(envPath);
  return [
    "#!/bin/sh",
    `# ${WRAPPER_MARK}`,
    `if [ -f ${envQuoted} ]; then set -a; . ${envQuoted}; set +a; fi`,
    `exec ${shellQuote(realBin)} "$@"`,
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
