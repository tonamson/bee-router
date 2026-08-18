import { handleChat } from "@/sse/handlers/chat.js";
import { initTranslators } from "open-sse/translator/index.js";
import { buildAgyInternalChatBody, parseRouterEnv } from "@/lib/antigravityCliConfig";
import fs from "fs/promises";
import os from "os";
import path from "path";

let initialized = false;
let cachedRouteEnv = { value: {}, at: 0 };

async function ensureInitialized() {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

async function loadAgyRouteEnv() {
  if (Date.now() - cachedRouteEnv.at < 2000) return cachedRouteEnv.value;
  try {
    const text = await fs.readFile(path.join(os.homedir(), ".gemini", "antigravity-cli", "bee-router.env"), "utf8");
    cachedRouteEnv = { value: parseRouterEnv(text), at: Date.now() };
  } catch {
    cachedRouteEnv = { value: {}, at: Date.now() };
  }
  return cachedRouteEnv.value;
}

function actionFrom(request) {
  const url = new URL(request.url);
  return url.searchParams.get("raw") || url.pathname;
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function POST(request) {
  await ensureInitialized();
  const action = actionFrom(request);

  try {
    const body = await request.json();

    if (String(action).includes("fetchAvailableModels")) {
      return Response.json({
        models: [
          { name: "gemini-3.1-pro", displayName: "Gemini 3.1 Pro" },
          { name: "gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro" },
        ],
      });
    }

    if (String(action).includes("loadCodeAssist") || String(action).includes("onboardUser")) {
      return Response.json({ currentTier: { id: "legacy-tier" }, cloudaicompanionProject: "bee-router" });
    }

    const env = await loadAgyRouteEnv();
    const chatBody = buildAgyInternalChatBody(body, env);

    const newRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(chatBody),
    });
    return handleChat(newRequest);
  } catch (error) {
    console.log("Error handling agy v1internal:", error);
    return Response.json({ error: { message: error.message, code: 500 } }, { status: 500 });
  }
}
