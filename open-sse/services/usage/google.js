/**
 * Google usage handlers (Gemini CLI + Antigravity)
 */

import { CLIENT_METADATA } from "../../config/appConstants.js";
import { ANTIGRAVITY_IDE_USER_AGENT, ANTIGRAVITY_IDE_VERSION, ANTIGRAVITY_OAUTH_CLIENT } from "../../providers/shared.js";
import { U, parseResetTime, normalizeCloudCodeProjectId, fetchWithTimeout } from "./shared.js";

// Antigravity API config (from Quotio) — urls from registry, oauth client + dynamic UA kept here
const ANTIGRAVITY_CONFIG = {
  ...U("antigravity"),
  ...ANTIGRAVITY_OAUTH_CLIENT,
  userAgent: ANTIGRAVITY_IDE_USER_AGENT,
};

/**
 * Gemini CLI Usage — fetch per-model quota via Cloud Code Assist API.
 * Uses retrieveUserQuota (same endpoint as `gemini /stats`) returning
 * per-model buckets with remainingFraction + resetTime.
 */
export async function getGeminiUsage(accessToken, providerSpecificData, proxyOptions = null) {
  if (!accessToken) {
    return { plan: "Free", message: "Gemini CLI access token not available." };
  }

  try {
    // Resolve project id: prefer connection-stored id, else loadCodeAssist lookup.
    // #1271: OAuth save stores projectId on the connection, not providerSpecificData.
    let projectId = normalizeCloudCodeProjectId(providerSpecificData?.projectId);
    let plan = "Free";

    if (!projectId) {
      const subInfo = await getGeminiSubscriptionInfo(accessToken, proxyOptions);
      projectId = normalizeCloudCodeProjectId(subInfo?.cloudaicompanionProject);
      plan = subInfo?.currentTier?.name || plan;
    }

    if (!projectId) {
      return {
        plan,
        message: "Gemini CLI project ID not available. Reconnect Gemini CLI, or configure a Google Cloud project with Gemini Code Assist access before checking quota.",
      };
    }

    const response = await fetchWithTimeout(
      U("gemini-cli").quotaUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project: projectId }),
      },
      10000,
      proxyOptions
    );

    if (!response.ok) {
      return { plan, message: `Gemini CLI quota error (${response.status}).` };
    }

    const data = await response.json();
    const quotas = {};

    if (Array.isArray(data.buckets)) {
      for (const bucket of data.buckets) {
        if (!bucket.modelId || bucket.remainingFraction == null) continue;

        const remainingFraction = Number(bucket.remainingFraction) || 0;
        const total = 1000; // Normalized base, matches antigravity convention
        const remaining = Math.round(total * remainingFraction);
        const used = Math.max(0, total - remaining);

        quotas[bucket.modelId] = {
          used,
          total,
          resetAt: parseResetTime(bucket.resetTime),
          remainingPercentage: remainingFraction * 100,
          unlimited: false,
        };
      }
    }

    return { plan, quotas };
  } catch (error) {
    return { message: `Gemini CLI error: ${error.message}` };
  }
}

/**
 * Get Gemini CLI subscription info via loadCodeAssist
 */
async function getGeminiSubscriptionInfo(accessToken, proxyOptions = null) {
  try {
    const response = await fetchWithTimeout(
      U("gemini-cli").loadCodeAssistUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata: CLIENT_METADATA }),
      },
      10000,
      proxyOptions
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const ANTIGRAVITY_POOL_LABELS = {
  "gemini-5h": "Gemini 5h",
  "gemini-weekly": "Gemini weekly",
  "3p-5h": "Claude + GPT 5h",
  "3p-weekly": "Claude + GPT weekly",
};

function antigravityQuotaSummaryUrl() {
  const modelsUrl = String(ANTIGRAVITY_CONFIG.quotaApiUrl || "");
  const summaryUrl = modelsUrl.replace(":fetchAvailableModels", ":retrieveUserQuotaSummary");
  return summaryUrl !== modelsUrl ? summaryUrl : "";
}

function antigravityQuotaGroups(data) {
  if (Array.isArray(data?.groups)) return data.groups;
  if (Array.isArray(data?.response?.groups)) return data.response.groups;
  return [];
}

function antigravityPoolWindow(id, bucket) {
  const raw = String(bucket?.window || "").toLowerCase();
  if (raw.includes("week") || id.includes("weekly")) return "weekly";
  if (raw.includes("5h") || raw.includes("five") || raw.includes("hour") || id.includes("5h")) return "5h";
  return raw || "pool";
}

function parseAntigravityQuotaSummary(data) {
  const quotas = {};
  for (const group of antigravityQuotaGroups(data)) {
    const buckets = Array.isArray(group?.buckets) ? group.buckets : [];
    for (const bucket of buckets) {
      const remainingFraction = bucket.remainingFraction ?? bucket.remaining_fraction;
      if (remainingFraction == null) continue;
      const id = String(bucket.bucketId || bucket.bucket_id || "").trim();
      if (!id) continue;
      const frac = Number(remainingFraction) || 0;
      const total = 1000;
      const remaining = Math.round(total * frac);
      const window = antigravityPoolWindow(id, bucket);
      quotas[id] = {
        used: total - remaining,
        total,
        resetAt: parseResetTime(bucket.resetTime || bucket.reset_time),
        remainingPercentage: frac * 100,
        unlimited: false,
        window,
        displayName: ANTIGRAVITY_POOL_LABELS[id]
          || `${group.displayName || "Quota"} (${window})`,
      };
    }
  }
  return quotas;
}

async function poolQuotasFromSummary(summaryResponse) {
  if (!summaryResponse?.ok) return {};
  try {
    return parseAntigravityQuotaSummary(await summaryResponse.json());
  } catch {
    return {};
  }
}

function skipAntigravityModel(modelKey, info) {
  if (!info || info.isInternal) return true;
  if (/^(tab_|chat_)/i.test(modelKey)) return true;
  return false;
}

function cloneQuotaRequest(quotaRequest) {
  return {
    ...quotaRequest,
    headers: { ...quotaRequest.headers },
  };
}

/**
 * Antigravity Usage - Fetch quota from Google Cloud Code API
 */
export async function getAntigravityUsage(accessToken, providerSpecificData, proxyOptions = null) {
  try {
    // Fetch subscription info once — reuse for both projectId and plan
    const subscriptionInfo = await getAntigravitySubscriptionInfo(accessToken, proxyOptions);
    const projectId = subscriptionInfo?.cloudaicompanionProject || null;

    const quotaRequest = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": ANTIGRAVITY_CONFIG.userAgent,
        "Content-Type": "application/json",
        "X-Client-Name": "antigravity",
        "X-Client-Version": ANTIGRAVITY_IDE_VERSION,
      },
      body: JSON.stringify({
        ...(projectId ? { project: projectId } : {})
      }),
    };
    const summaryUrl = antigravityQuotaSummaryUrl();
    const summaryResponse = projectId && summaryUrl
      ? await fetchWithTimeout(summaryUrl, cloneQuotaRequest(quotaRequest), 10000, proxyOptions).catch(() => null)
      : null;
    const pools = await poolQuotasFromSummary(summaryResponse);
    const plan = subscriptionInfo?.currentTier?.name || "Unknown";

    if (Object.keys(pools).length > 0) {
      return { plan, quotas: pools, subscriptionInfo };
    }

    const response = await fetchWithTimeout(
      ANTIGRAVITY_CONFIG.quotaApiUrl,
      cloneQuotaRequest(quotaRequest),
      10000,
      proxyOptions,
    ).catch(() => null);

    if (!response || !response.ok) {
      if (response?.status === 403) {
        return {
          message: "Antigravity quota API access forbidden. Chat may still work.",
          quotas: {},
        };
      }
      if (response?.status === 401) {
        return {
          message: "Antigravity quota API authentication expired. Chat may still work.",
          quotas: {},
        };
      }
      throw new Error(`Antigravity API error: ${response?.status || "network"}`);
    }

    const data = await response.json().catch(() => ({}));
    const quotas = {};

    if (data.models && typeof data.models === "object" && !Array.isArray(data.models)) {
      for (const [modelKey, info] of Object.entries(data.models)) {
        if (!info?.quotaInfo || skipAntigravityModel(modelKey, info)) continue;
        if (quotas[modelKey]) continue;

        const remainingFraction = Number(info.quotaInfo.remainingFraction) || 0;
        const remainingPercentage = remainingFraction * 100;
        const total = 1000;
        const remaining = Math.round(total * remainingFraction);

        quotas[modelKey] = {
          used: total - remaining,
          total,
          resetAt: parseResetTime(info.quotaInfo.resetTime),
          remainingPercentage,
          unlimited: false,
          displayName: info.displayName || modelKey,
        };
      }
    }

    return {
      plan,
      quotas,
      subscriptionInfo,
    };
  } catch (error) {
    console.error("[Antigravity Usage] Error:", error.message, error.cause);
    return { message: `Antigravity error: ${error.message}` };
  }
}

/**
 * Get Antigravity subscription info
 */
async function getAntigravitySubscriptionInfo(accessToken, proxyOptions = null) {
  try {
    const response = await fetchWithTimeout(ANTIGRAVITY_CONFIG.loadProjectApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": ANTIGRAVITY_CONFIG.userAgent,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metadata: CLIENT_METADATA, mode: 1 }),
    }, 10000, proxyOptions);

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("[Antigravity Subscription] Error:", error.message);
    return null;
  }
}
