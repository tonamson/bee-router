import { getAdapter } from "@/lib/db/driver.js";
import { getApiKeyBySecret } from "@/lib/db/index.js";

if (!global._apiKeyInflight) global._apiKeyInflight = new Map();
const inflight = global._apiKeyInflight;

export function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfLocalWeekMonday(d = new Date()) {
  const day = startOfLocalDay(d);
  const wd = day.getDay();
  day.setDate(day.getDate() - (wd === 0 ? 6 : wd - 1));
  return day;
}

function secondsUntil(date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

export function nextLocalMidnight(from = new Date()) {
  const n = startOfLocalDay(from);
  n.setDate(n.getDate() + 1);
  return n;
}

export function nextLocalMonday(from = new Date()) {
  const n = startOfLocalWeekMonday(from);
  n.setDate(n.getDate() + 7);
  return n;
}

export function limitResponse(code, message, retryAfterSec) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
  if (retryAfterSec) headers["Retry-After"] = String(retryAfterSec);
  return new Response(JSON.stringify({
    error: { message, type: "insufficient_quota", code },
  }), { status: 429, headers });
}

export function inflightCount(apiKey) {
  return inflight.get(apiKey) || 0;
}

export async function getWindowUsage(apiKey) {
  const empty = { dayRequests: 0, dayTokens: 0, weekRequests: 0, weekTokens: 0 };
  if (!apiKey) return empty;
  const db = await getAdapter();
  const dayStart = startOfLocalDay().toISOString();
  const weekStart = startOfLocalWeekMonday().toISOString();
  const row = db.get(
    `SELECT
      SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) AS dayRequests,
      SUM(CASE WHEN timestamp >= ? THEN COALESCE(promptTokens,0)+COALESCE(completionTokens,0) ELSE 0 END) AS dayTokens,
      COUNT(*) AS weekRequests,
      SUM(COALESCE(promptTokens,0)+COALESCE(completionTokens,0)) AS weekTokens
     FROM usageHistory
     WHERE apiKey = ? AND timestamp >= ?`,
    [dayStart, dayStart, apiKey, weekStart]
  );
  return {
    dayRequests: row?.dayRequests || 0,
    dayTokens: row?.dayTokens || 0,
    weekRequests: row?.weekRequests || 0,
    weekTokens: row?.weekTokens || 0,
  };
}

export async function getWindowUsageByKeys(secrets) {
  const map = {};
  if (!secrets?.length) return map;
  const db = await getAdapter();
  const dayStart = startOfLocalDay().toISOString();
  const weekStart = startOfLocalWeekMonday().toISOString();
  const placeholders = secrets.map(() => "?").join(",");
  const rows = db.all(
    `SELECT apiKey,
      SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) AS dayRequests,
      SUM(CASE WHEN timestamp >= ? THEN COALESCE(promptTokens,0)+COALESCE(completionTokens,0) ELSE 0 END) AS dayTokens,
      COUNT(*) AS weekRequests,
      SUM(COALESCE(promptTokens,0)+COALESCE(completionTokens,0)) AS weekTokens
     FROM usageHistory
     WHERE timestamp >= ? AND apiKey IN (${placeholders})
     GROUP BY apiKey`,
    [dayStart, dayStart, weekStart, ...secrets]
  );
  for (const r of rows) {
    map[r.apiKey] = {
      dayRequests: r.dayRequests || 0,
      dayTokens: r.dayTokens || 0,
      weekRequests: r.weekRequests || 0,
      weekTokens: r.weekTokens || 0,
    };
  }
  return map;
}

export async function acquireApiKeySlot(apiKey) {
  if (!apiKey || typeof apiKey !== "string") return null;
  const rec = await getApiKeyBySecret(apiKey);
  if (!rec || !rec.isActive) return null;

  const usage = (rec.dailyRequests || rec.weeklyRequests || rec.dailyTokens || rec.weeklyTokens)
    ? await getWindowUsage(apiKey)
    : null;

  if (rec.dailyRequests > 0 && usage.dayRequests >= rec.dailyRequests) {
    return limitResponse("key_daily_request_limit", "API key daily request limit reached", secondsUntil(nextLocalMidnight()));
  }
  if (rec.weeklyRequests > 0 && usage.weekRequests >= rec.weeklyRequests) {
    return limitResponse("key_weekly_request_limit", "API key weekly request limit reached", secondsUntil(nextLocalMonday()));
  }
  if (rec.dailyTokens > 0 && usage.dayTokens >= rec.dailyTokens) {
    return limitResponse("key_daily_token_limit", "API key daily token limit reached", secondsUntil(nextLocalMidnight()));
  }
  if (rec.weeklyTokens > 0 && usage.weekTokens >= rec.weeklyTokens) {
    return limitResponse("key_weekly_token_limit", "API key weekly token limit reached", secondsUntil(nextLocalMonday()));
  }

  if (rec.concurrency > 0) {
    const next = inflightCount(apiKey) + 1;
    if (next > rec.concurrency) {
      return limitResponse("key_concurrency", "API key concurrency limit reached", 1);
    }
    inflight.set(apiKey, next);
  }
  return null;
}

export function releaseApiKeySlot(apiKey) {
  if (!apiKey) return;
  const n = inflightCount(apiKey);
  if (n <= 1) inflight.delete(apiKey);
  else inflight.set(apiKey, n - 1);
}

export function withSlotRelease(response, apiKey) {
  const release = () => releaseApiKeySlot(apiKey);
  if (!response?.body) {
    release();
    return response;
  }
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    release();
  };
  const stream = response.body.pipeThrough(new TransformStream({
    flush: once,
    cancel: once,
  }));
  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function runWithApiKeyLimits(apiKey, fn) {
  const blocked = await acquireApiKeySlot(apiKey);
  if (blocked) return blocked;
  try {
    const res = await fn();
    return withSlotRelease(res, apiKey);
  } catch (err) {
    releaseApiKeySlot(apiKey);
    throw err;
  }
}
