import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/usageDb";
import { getTokenSaveStats } from "@/lib/tokenSave/events.js";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d", "all"]);
const SAVE_WINDOW = {
  today: "today",
  "24h": "last24h",
  "7d": "last7d",
  "30d": "last30d",
  "60d": "last60d",
  all: "all",
};

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";

    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const stats = await getUsageStats(period);
    let tokenSave = { tokensSavedEst: 0, costSavedEst: 0 };
    try {
      const save = await getTokenSaveStats({ recentLimit: 1 });
      const w = save.windows[SAVE_WINDOW[period] || "today"];
      tokenSave = {
        tokensSavedEst: w?.tokensSavedEst || 0,
        costSavedEst: w?.costSavedEst || 0,
      };
    } catch { /* optional */ }
    return NextResponse.json({ ...stats, tokenSave });
  } catch (error) {
    console.error("[API] Failed to get usage stats:", error);
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 });
  }
}
