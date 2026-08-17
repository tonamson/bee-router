import fs from "fs";
import path from "path";
import { DATA_DIR } from "../dataDir.js";

const DIR = path.join(DATA_DIR, "token-save");
const EVENTS_FILE = path.join(DIR, "events.jsonl");
const ROTATED_FILE = path.join(DIR, "events.jsonl.1");
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHARS_PER_TOKEN = 4;

function localDateKey(ts) {
  const d = ts == null ? new Date() : new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}

function layerSaved(stats) {
  if (!stats || typeof stats.bytesBefore !== "number") return 0;
  return Math.max(0, stats.bytesBefore - (stats.bytesAfter || 0));
}

function layerHit(stats) {
  return !!(stats && (stats.hits?.length || layerSaved(stats) > 0));
}

export function appendTokenSaveEvent(event) {
  try {
    ensureDir();
    try {
      const stat = fs.statSync(EVENTS_FILE);
      if (stat.size > MAX_FILE_BYTES) fs.renameSync(EVENTS_FILE, ROTATED_FILE);
    } catch { /* no file yet */ }
    fs.appendFileSync(EVENTS_FILE, JSON.stringify({ ts: Date.now(), ...event }) + "\n");
  } catch { /* ignore */ }
}

export function recordTokenSaveLayers({ provider, model, rtk, lite, caveman, headroom } = {}) {
  const layers = {
    rtk: { saved: layerSaved(rtk), hit: layerHit(rtk) },
    lite: { saved: layerSaved(lite), hit: layerHit(lite) },
    caveman: { saved: layerSaved(caveman), hit: layerHit(caveman) },
    headroom: { saved: layerSaved(headroom), hit: layerHit(headroom) },
  };
  const bytesSaved = Object.values(layers).reduce((n, l) => n + l.saved, 0);
  const applied = bytesSaved > 0 || Object.values(layers).some((l) => l.hit);
  appendTokenSaveEvent({
    provider: provider || null,
    model: model || null,
    applied,
    layers,
    bytesSaved,
    tokensSavedEst: Math.round(bytesSaved / CHARS_PER_TOKEN),
  });
}

export function readTokenSaveEvents({ sinceMs = null, limit = null } = {}) {
  const events = [];
  for (const file of [ROTATED_FILE, EVENTS_FILE]) {
    try {
      if (!fs.existsSync(file)) continue;
      for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        if (!line) continue;
        try {
          const ev = JSON.parse(line);
          if (sinceMs && ev.ts < sinceMs) continue;
          events.push(ev);
        } catch { /* skip */ }
      }
    } catch { /* ignore */ }
  }
  events.sort((a, b) => a.ts - b.ts);
  return limit ? events.slice(-limit) : events;
}

function emptyTotals() {
  return {
    requests: 0,
    compressed: 0,
    bytesSaved: 0,
    tokensSavedEst: 0,
    costSavedEst: 0,
    unpricedTokens: 0,
    byLayer: {
      rtk: { hits: 0, bytesSaved: 0, costSavedEst: 0 },
      lite: { hits: 0, bytesSaved: 0, costSavedEst: 0 },
      caveman: { hits: 0, bytesSaved: 0, costSavedEst: 0 },
      headroom: { hits: 0, bytesSaved: 0, costSavedEst: 0 },
    },
  };
}

function accumulate(totals, ev, evCost, priced) {
  totals.requests++;
  if (ev.applied) totals.compressed++;
  totals.bytesSaved += ev.bytesSaved || 0;
  totals.tokensSavedEst += ev.tokensSavedEst || 0;
  totals.costSavedEst += evCost;
  if (!priced) totals.unpricedTokens += ev.tokensSavedEst || 0;
  const bytes = ev.bytesSaved || 0;
  for (const name of Object.keys(totals.byLayer)) {
    const layer = ev.layers?.[name];
    if (!layer) continue;
    if (layer.hit) totals.byLayer[name].hits++;
    totals.byLayer[name].bytesSaved += layer.saved || 0;
    if (bytes > 0 && evCost) {
      totals.byLayer[name].costSavedEst += evCost * ((layer.saved || 0) / bytes);
    }
  }
}

async function loadPriceLookup(events) {
  const { getPricingForModel: defaultPrice, calculateCostFromTokens } = await import("../../../open-sse/providers/pricing.js");
  let userPrice = null;
  try {
    ({ getPricingForModel: userPrice } = await import("../db/repos/pricingRepo.js"));
  } catch { /* no db in unit tests */ }
  const cache = new Map();
  for (const ev of events) {
    const key = `${ev.provider || ""}\0${ev.model || ""}`;
    if (cache.has(key)) continue;
    let pricing = null;
    if (userPrice) {
      try { pricing = await userPrice(ev.provider, ev.model); } catch { /* fall through */ }
    }
    if (!pricing) {
      try { pricing = defaultPrice(ev.provider, ev.model); } catch { pricing = null; }
    }
    cache.set(key, pricing);
  }
  return (ev) => {
    const pricing = cache.get(`${ev.provider || ""}\0${ev.model || ""}`);
    if (!pricing) return { cost: 0, priced: false };
    return {
      cost: calculateCostFromTokens({ prompt_tokens: ev.tokensSavedEst || 0 }, pricing),
      priced: true,
    };
  };
}

export async function getTokenSaveStats({ timelineDays = 30, recentLimit = 50 } = {}) {
  const events = readTokenSaveEvents();
  const priceOf = await loadPriceLookup(events);
  const now = Date.now();
  const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
  const windows = {
    all: emptyTotals(),
    today: emptyTotals(),
    last7d: emptyTotals(),
    last30d: emptyTotals(),
  };
  const timeline = new Map();
  for (let i = timelineDays - 1; i >= 0; i--) {
    const date = localDateKey(startOfToday - i * DAY_MS);
    timeline.set(date, { date, tokensSavedEst: 0, costSavedEst: 0, compressed: 0, requests: 0 });
  }

  for (const ev of events) {
    const { cost, priced } = priceOf(ev);
    ev.costSavedEst = cost;
    accumulate(windows.all, ev, cost, priced);
    if (ev.ts >= startOfToday) accumulate(windows.today, ev, cost, priced);
    if (ev.ts >= now - 7 * DAY_MS) accumulate(windows.last7d, ev, cost, priced);
    if (ev.ts >= now - 30 * DAY_MS) accumulate(windows.last30d, ev, cost, priced);
    const day = localDateKey(ev.ts);
    const row = timeline.get(day);
    if (row) {
      row.requests++;
      if (ev.applied) row.compressed++;
      row.tokensSavedEst += ev.tokensSavedEst || 0;
      row.costSavedEst += cost;
    }
  }

  return {
    windows,
    timeline: [...timeline.values()],
    recent: events.slice(-recentLimit).reverse(),
  };
}
