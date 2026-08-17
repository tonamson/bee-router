import { getAdapter } from "../driver.js";
import { parseJson } from "../helpers/jsonCol.js";

const PERIOD_MS = { "24h": 86400000, "7d": 604800000, "30d": 2592000000, "60d": 5184000000 };

function periodCutoffIso(period) {
  if (period === "today") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay.toISOString();
  }
  const ms = PERIOD_MS[period];
  if (ms) return new Date(Date.now() - ms).toISOString();
  return "1970-01-01T00:00:00.000Z";
}

function mapHistoryRow(r) {
  const t = parseJson(r.tokens, {}) || {};
  return {
    timestamp: r.timestamp,
    model: r.model,
    provider: r.provider || "",
    endpoint: r.endpoint || "",
    promptTokens: t.prompt_tokens || t.input_tokens || r.promptTokens || 0,
    completionTokens: t.completion_tokens || t.output_tokens || r.completionTokens || 0,
    cachedTokens: t.cached_tokens || t.cache_read_input_tokens || 0,
    cost: r.cost || 0,
    status: r.status || "ok",
  };
}

export async function getUsageHistoryForApiKey(apiKey, period = "7d", { page = 1, pageSize = 20 } = {}) {
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const current = Math.max(1, Number(page) || 1);
  const empty = { items: [], page: current, pageSize: size, totalItems: 0, totalPages: 0 };
  if (!apiKey || typeof apiKey !== "string") return empty;

  const db = await getAdapter();
  const cutoff = periodCutoffIso(period);
  const counted = db.get(
    `SELECT COUNT(*) AS c FROM usageHistory WHERE apiKey = ? AND timestamp >= ?`,
    [apiKey, cutoff]
  );
  const totalItems = counted?.c || 0;
  const totalPages = totalItems ? Math.ceil(totalItems / size) : 0;
  const safePage = totalPages ? Math.min(current, totalPages) : 1;
  const offset = (safePage - 1) * size;
  const rows = totalItems
    ? db.all(
      `SELECT timestamp, provider, model, endpoint, tokens, status, cost, promptTokens, completionTokens
       FROM usageHistory WHERE apiKey = ? AND timestamp >= ? ORDER BY id DESC LIMIT ? OFFSET ?`,
      [apiKey, cutoff, size, offset]
    )
    : [];

  return {
    items: rows.map(mapHistoryRow),
    page: safePage,
    pageSize: size,
    totalItems,
    totalPages,
  };
}
