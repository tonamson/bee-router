"use server";

import { NextResponse } from "next/server";
import { resolveCliApiKey } from "../resolveApiKey.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const PROVIDER_ID = "bee-router";
const getOmpDir = () => path.join(os.homedir(), ".omp", "agent");
const getOmpDbPath = () => path.join(getOmpDir(), "agent.db");
const getOmpModelsYmlPath = () => path.join(getOmpDir(), "models.yml");

const checkOmpInstalled = async () => {
  const isWindows = os.platform() === "win32";
  try {
    const command = isWindows ? "where omp" : "which omp";
    await execAsync(command, { windowsHide: true });
    return true;
  } catch {
    try {
      await fs.access(getOmpDbPath());
      return true;
    } catch {
      try {
        await fs.access(getOmpModelsYmlPath());
        return true;
      } catch {
        return false;
      }
    }
  }
};

const readModelsYml = async () => {
  try {
    return await fs.readFile(getOmpModelsYmlPath(), "utf-8");
  } catch {
    return "";
  }
};

const removeProviderBlock = (content) => {
  const lines = content.split("\n");
  const result = [];
  let providerIndent = null;
  for (const line of lines) {
    if (providerIndent !== null) {
      if (!line.trim() || line.match(/^\s*/)[0].length > providerIndent) continue;
      providerIndent = null;
    }
    const match = line.match(new RegExp(`^(\\s*)${PROVIDER_ID}:\\s*$`));
    if (match) providerIndent = match[1].length;
    else result.push(line);
  }
  return result.join("\n");
};

const hasBeeRouterInYml = (content) => {
  if (!content) return false;
  return content.includes("bee-router:") || content.includes("localhost:20128");
};

// Build standard BeeRouter provider block for models.yml
const buildOmpProviderYaml = (baseUrl, apiKey) => {
  const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
  const key = apiKey || "";
  return `  ${PROVIDER_ID}:
    baseUrl: ${normalizedBaseUrl}
    apiKey: ${key}
    api: openai-completions
    authHeader: true
    disableStrictTools: true
    discovery:
      type: proxy`;
};

export async function GET() {
  try {
    const installed = await checkOmpInstalled();
    if (!installed) {
      return NextResponse.json({
        installed: false,
        config: null,
        message: "Oh My Pi is not installed",
      });
    }

    const ymlContent = await readModelsYml();
    const hasBeeRouter = hasBeeRouterInYml(ymlContent);

    return NextResponse.json({
      installed: true,
      hasBeeRouter,
      configPath: getOmpModelsYmlPath(),
    });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}

export async function POST(request) {
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  try {
    const { baseUrl, apiKey } = rawBody || {};
    if (!baseUrl) {
      return NextResponse.json({ error: { message: "baseUrl is required" } }, { status: 400 });
    }

    const resolvedKey = await resolveCliApiKey(apiKey);

    await fs.mkdir(getOmpDir(), { recursive: true });

    let ymlContent = await readModelsYml();
    const providerBlock = buildOmpProviderYaml(baseUrl, resolvedKey);

    // Remove existing bee-router provider if present
    ymlContent = removeProviderBlock(ymlContent);

    if (!ymlContent.trim()) {
      ymlContent = `providers:\n${providerBlock}\n`;
    } else if (ymlContent.includes("providers:")) {
      ymlContent = ymlContent.replace(/providers:/, `providers:\n${providerBlock}`);
    } else {
      ymlContent = `${ymlContent.trim()}\n\nproviders:\n${providerBlock}\n`;
    }

    await fs.writeFile(getOmpModelsYmlPath(), ymlContent, "utf-8");

    // Best-effort update to agent.db if better-sqlite3 or node:sqlite is present
    try {
      let Database;
      try {
        // Match the dashboard DB driver: this native addon can crash Node 24.
        if (Number(process.versions.node.split(".")[0]) < 24) {
          const mod = await import("better-sqlite3");
          Database = mod.default || mod;
        }
      } catch {
        // fallback ignored
      }
      if (Database) {
        const dbPath = getOmpDbPath();
        const db = new Database(dbPath);
        db.prepare("DELETE FROM auth_credentials WHERE provider = ?").run(PROVIDER_ID);
        db.prepare(
          "INSERT INTO auth_credentials (provider, credential_type, data, disabled_cause, identity_key, created_at, updated_at) VALUES (?, ?, ?, NULL, NULL, ?, ?)"
        ).run(
          PROVIDER_ID,
          "api_key",
          JSON.stringify({ apiKey: resolvedKey, baseUrl }),
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000)
        );
        db.close();
      }
    } catch {
      // Non-critical: models.yml is primary
    }

    return NextResponse.json({
      success: true,
      message: "Oh My Pi settings applied! Run 'omp' and all BeeRouter models appear under bee-router in /model.",
      configPath: getOmpModelsYmlPath(),
    });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    let ymlContent = await readModelsYml();
    ymlContent = removeProviderBlock(ymlContent);

    if (ymlContent.trim() === "providers:") {
      await fs.rm(getOmpModelsYmlPath(), { force: true });
    } else {
      await fs.writeFile(getOmpModelsYmlPath(), ymlContent, "utf-8");
    }

    return NextResponse.json({
      success: true,
      message: "BeeRouter removed from Oh My Pi",
    });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}
