import { NextResponse } from "next/server";
import { getApiKeys, createApiKey } from "@/lib/localDb";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import { getWindowUsageByKeys, inflightCount } from "@/lib/apiKeyLimits.js";

export const dynamic = "force-dynamic";

const EMPTY_USAGE = { dayRequests: 0, dayTokens: 0, weekRequests: 0, weekTokens: 0 };

// GET /api/keys - List API keys
export async function GET() {
  try {
    const keys = await getApiKeys();
    const usageMap = await getWindowUsageByKeys(keys.map((k) => k.key).filter(Boolean));
    return NextResponse.json({
      keys: keys.map((k) => ({
        ...k,
        usage: {
          inflight: inflightCount(k.key),
          ...(usageMap[k.key] || EMPTY_USAGE),
        },
      })),
    });
  } catch (error) {
    console.log("Error fetching keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/keys - Create new API key
export async function POST(request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Always get machineId from server
    const machineId = await getConsistentMachineId();
    const apiKey = await createApiKey(name, machineId);

    return NextResponse.json({
      key: apiKey.key,
      name: apiKey.name,
      id: apiKey.id,
      machineId: apiKey.machineId,
    }, { status: 201 });
  } catch (error) {
    console.log("Error creating key:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
