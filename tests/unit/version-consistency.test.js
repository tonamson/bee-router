import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_VERSION, APP_NAME, NPM_PACKAGE_NAME } from "@/shared/constants/version.js";
import { getAppVersion } from "@/lib/db/version.js";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

describe("Version Consistency", () => {
  it("exports APP_VERSION matching root package.json", () => {
    const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    expect(APP_VERSION).toBe(rootPkg.version);
    expect(APP_NAME).toBe(rootPkg.name);
    expect(NPM_PACKAGE_NAME).toBe("@tonamson2/bee-router");
  });

  it("ensures cli/package.json matches root package.json version", () => {
    const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    const cliPkg = JSON.parse(fs.readFileSync(path.join(rootDir, "cli/package.json"), "utf8"));
    expect(cliPkg.version).toBe(rootPkg.version);
  });
});

describe("Consumer Version Integration", () => {
  it("getAppVersion returns APP_VERSION independent of process.cwd()", () => {
    const originalCwd = process.cwd();
    try {
      process.chdir("/tmp");
      expect(getAppVersion()).toBe(APP_VERSION);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("APP_CONFIG.version reflects APP_VERSION", () => {
    expect(APP_CONFIG.version).toBe(APP_VERSION);
    expect(UPDATER_CONFIG.npmPackageName).toBe(NPM_PACKAGE_NAME);
  });
});

