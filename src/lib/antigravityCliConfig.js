export const MODEL_PROVIDER = "gemini";
export const SHELL_MARK_BEGIN = "# 9router-agy-begin";
export const SHELL_MARK_END = "# 9router-agy-end";
export const PREV_MODEL_KEY = "NINEROUTER_PREV_MODEL";

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
  if (model) next.model = model;
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

export function has9RouterConfig(settings, env) {
  return settings?.modelProvider === MODEL_PROVIDER && Boolean(env?.GOOGLE_GEMINI_BASE_URL);
}

function escapeEnvValue(value) {
  return String(value ?? "").replace(/[\r\n]/g, "");
}

export function serializeRouterEnv({ apiKey, baseUrl, previousModel }) {
  const lines = [
    "# 9router AGY — sourced by shell profile. Do not edit modelProvider here.",
    `GEMINI_API_KEY=${escapeEnvValue(apiKey)}`,
    `GOOGLE_GEMINI_BASE_URL=${escapeEnvValue(baseUrl)}`,
  ];
  if (previousModel) lines.push(`${PREV_MODEL_KEY}=${escapeEnvValue(previousModel)}`);
  return `${lines.join("\n")}\n`;
}

export function parseRouterEnv(text) {
  const env = {};
  if (!text) return env;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    env[line.slice(0, eq)] = line.slice(eq + 1);
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
