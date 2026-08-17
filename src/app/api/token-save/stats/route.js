import { NextResponse } from "next/server";
import { getTokenSaveStats } from "@/lib/tokenSave/events.js";
import { getUsageStats } from "@/lib/usageDb";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const recentLimit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const period = searchParams.get("period") || "7d";
    const compression = await getTokenSaveStats({ recentLimit });
    let cache = {
      totalCachedTokens: 0,
      totalPromptTokens: 0,
      totalRequests: 0,
      byProvider: {},
      recent: [],
    };
    try {
      const usage = await getUsageStats(period);
      const byProvider = {};
      for (const [prov, p] of Object.entries(usage.byProvider || {})) {
        byProvider[prov] = {
          cachedTokens: p.cachedTokens || 0,
          promptTokens: p.promptTokens || 0,
          requests: p.requests || 0,
        };
      }
      cache = {
        totalCachedTokens: usage.totalCachedTokens || 0,
        totalPromptTokens: usage.totalPromptTokens || 0,
        totalRequests: usage.totalRequests || 0,
        byProvider,
        recent: (usage.recentRequests || []).slice(0, recentLimit).map((r) => ({
          ts: r.timestamp,
          provider: r.provider || "",
          model: r.model,
          promptTokens: r.promptTokens || 0,
          cachedTokens: r.cachedTokens || 0,
        })),
      };
    } catch { /* usage optional */ }
    return NextResponse.json({ compression, cache, period });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
