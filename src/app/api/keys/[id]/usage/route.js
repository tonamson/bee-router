import { NextResponse } from "next/server";
import { getApiKeyById } from "@/lib/localDb";
import { clearUsageByApiKey, getUsageStatsForApiKey, getChartData } from "@/lib/usageDb";
import { getUsageHistoryForApiKey } from "@/lib/db/repos/apiKeyUsageHistory.js";
import { clearTokenSaveEventsByApiKey } from "@/lib/tokenSave/events.js";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d"]);

function maskApiKey(key) {
  if (!key || typeof key !== "string") return null;
  if (key.length <= 8) return key.charAt(0) + "***";
  return key.slice(0, 8) + "***";
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;
    const historyOnly = searchParams.get("view") === "history";

    if (historyOnly) {
      const history = await getUsageHistoryForApiKey(key.key, period, { page, pageSize });
      return NextResponse.json({ history, recentRequests: history.items });
    }

    const [stats, chart, history] = await Promise.all([
      getUsageStatsForApiKey(key.key, period),
      getChartData(period, { apiKey: key.key }),
      getUsageHistoryForApiKey(key.key, period, { page, pageSize }),
    ]);

    return NextResponse.json({
      key: {
        id: key.id,
        name: key.name,
        apiKeyMasked: maskApiKey(key.key),
        isActive: key.isActive,
        createdAt: key.createdAt,
      },
      period,
      ...stats,
      chart,
      history,
      recentRequests: history.items,
    });
  } catch (error) {
    console.error("Error fetching key usage:", error);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }
    const result = await clearUsageByApiKey(key.key);
    clearTokenSaveEventsByApiKey(key.key);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Error clearing key usage:", error);
    return NextResponse.json({ error: "Failed to clear usage" }, { status: 500 });
  }
}
