import { NextResponse } from "next/server";
import { getCatalogMeta, saveCatalogPricing } from "@/lib/db/repos/pricingRepo.js";
import {
  OFFICIAL_CATALOG_URL,
  CATALOG_STALE_MS,
  fetchOfficialCatalog,
  applyCatalogToKnownModels,
} from "@/lib/pricing/officialCatalog.js";

export const dynamic = "force-dynamic";

function withStale(meta) {
  const syncedAt = meta?.syncedAt || 0;
  return {
    source: meta?.source || OFFICIAL_CATALOG_URL,
    syncedAt: syncedAt || null,
    matched: meta?.matched ?? 0,
    missed: meta?.missed ?? 0,
    stale: !syncedAt || Date.now() - syncedAt > CATALOG_STALE_MS,
  };
}

export async function GET() {
  try {
    return NextResponse.json(withStale(await getCatalogMeta()));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const raw = await fetchOfficialCatalog();
    const { PROVIDER_PRICING, MODEL_PRICING } = await import("open-sse/providers/pricing.js");
    const { catalog, matched, missed } = applyCatalogToKnownModels(raw, {
      _canonical: MODEL_PRICING,
      ...PROVIDER_PRICING,
    });
    const meta = {
      source: OFFICIAL_CATALOG_URL,
      syncedAt: Date.now(),
      matched,
      missed,
    };
    await saveCatalogPricing(catalog, meta);
    return NextResponse.json(withStale(meta));
  } catch (error) {
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 502 });
  }
}
