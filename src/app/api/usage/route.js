import { NextResponse } from "next/server";
import { clearAllUsage } from "@/lib/usageDb";
import { clearTokenSaveEvents } from "@/lib/tokenSave/events.js";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const result = await clearAllUsage();
    clearTokenSaveEvents();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Error clearing usage:", error);
    return NextResponse.json({ error: "Failed to clear usage" }, { status: 500 });
  }
}
