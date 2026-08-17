"use server";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  applyAntigravitySettings,
  has9RouterConfig,
  normalizeGeminiBaseUrl,
  parseRouterEnv,
  removeShellBlock,
  resetAntigravitySettings,
  serializeRouterEnv,
  upsertShellBlock,
} from "@/lib/antigravityCliConfig";

const execAsync = promisify(exec);

const getAgyDir = () => path.join(os.homedir(), ".gemini", "antigravity-cli");
const getSettingsPath = () => path.join(getAgyDir(), "settings.json");
const getEnvPath = () => path.join(getAgyDir(), "9router.env");
const getAgyBinPath = () => {
  if (os.platform() === "win32") {
    return path.join(os.homedir(), "AppData", "Local", "agy", "bin", "agy.exe");
  }
  return path.join(os.homedir(), ".local", "bin", "agy");
};

const checkAgyInstalled = async () => {
  try {
    const isWindows = os.platform() === "win32";
    await execAsync(isWindows ? "where agy" : "which agy", { windowsHide: true });
    return true;
  } catch {
    for (const candidate of [getAgyBinPath(), getSettingsPath()]) {
      try {
        await fs.access(candidate);
        return true;
      } catch { /* try next */ }
    }
    return false;
  }
};

const readJson = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
};

const readEnvFile = async () => {
  try {
    return parseRouterEnv(await fs.readFile(getEnvPath(), "utf-8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
};

const profileCandidates = () => {
  const home = os.homedir();
  const shell = path.basename(process.env.SHELL || "");
  const files = [];
  if (!shell || shell.includes("zsh")) {
    files.push(path.join(home, ".zshrc"), path.join(home, ".zprofile"));
  }
  if (shell.includes("bash")) {
    files.push(path.join(home, ".bashrc"), path.join(home, ".bash_profile"));
  }
  files.push(path.join(home, ".profile"));
  return [...new Set(files)];
};

const updateExistingProfiles = async (mutate) => {
  if (os.platform() === "win32") return;
  for (const filePath of profileCandidates()) {
    let text;
    try {
      text = await fs.readFile(filePath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const next = mutate(text);
    if (next !== text) await fs.writeFile(filePath, next);
  }
};

export async function GET() {
  try {
    const installed = await checkAgyInstalled();
    if (!installed) {
      return NextResponse.json({
        installed: false,
        settings: null,
        env: null,
        message: "Antigravity CLI is not installed",
      });
    }

    const settings = await readJson(getSettingsPath());
    const env = await readEnvFile();
    return NextResponse.json({
      installed: true,
      settings,
      env: {
        GOOGLE_GEMINI_BASE_URL: env.GOOGLE_GEMINI_BASE_URL || "",
        GEMINI_API_KEY: env.GEMINI_API_KEY || "",
      },
      has9Router: has9RouterConfig(settings, env),
      configPath: getSettingsPath(),
      envPath: getEnvPath(),
    });
  } catch (error) {
    console.log("Error checking antigravity settings:", error);
    return NextResponse.json({ error: "Failed to check antigravity settings" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { baseUrl, apiKey, model } = await request.json();
    const selectedModel = typeof model === "string" ? model.trim() : "";
    if (!baseUrl || !selectedModel) {
      return NextResponse.json({ error: "baseUrl and model are required" }, { status: 400 });
    }

    const dir = getAgyDir();
    await fs.mkdir(dir, { recursive: true });

    const currentSettings = await readJson(getSettingsPath());
    const currentEnv = await readEnvFile();
    const previousModel = currentEnv.NINEROUTER_PREV_MODEL
      || (currentSettings.modelProvider === "gemini" ? "" : currentSettings.model)
      || "";

    const settings = applyAntigravitySettings(currentSettings, { model: selectedModel });
    const normalizedBaseUrl = normalizeGeminiBaseUrl(baseUrl);
    const envText = serializeRouterEnv({
      apiKey: apiKey || "sk_9router",
      baseUrl: normalizedBaseUrl,
      previousModel,
    });

    await fs.writeFile(getSettingsPath(), `${JSON.stringify(settings, null, 2)}\n`);
    await fs.writeFile(getEnvPath(), envText);
    await updateExistingProfiles((text) => upsertShellBlock(text, getEnvPath()));

    return NextResponse.json({
      success: true,
      message: "Antigravity CLI settings applied. Open a new terminal so GEMINI_API_KEY is picked up.",
      configPath: getSettingsPath(),
      envPath: getEnvPath(),
    });
  } catch (error) {
    console.log("Error updating antigravity settings:", error);
    return NextResponse.json({ error: "Failed to update antigravity settings" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const settingsPath = getSettingsPath();
    let currentSettings = {};
    try {
      currentSettings = JSON.parse(await fs.readFile(settingsPath, "utf-8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const currentEnv = await readEnvFile();
    const settings = resetAntigravitySettings(currentSettings, {
      previousModel: currentEnv.NINEROUTER_PREV_MODEL,
    });
    await fs.mkdir(getAgyDir(), { recursive: true });
    await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);

    try {
      await fs.unlink(getEnvPath());
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await updateExistingProfiles(removeShellBlock);

    return NextResponse.json({
      success: true,
      message: "Antigravity CLI 9router settings removed",
    });
  } catch (error) {
    console.log("Error resetting antigravity settings:", error);
    return NextResponse.json({ error: "Failed to reset antigravity settings" }, { status: 500 });
  }
}
