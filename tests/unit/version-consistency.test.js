import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_VERSION, APP_NAME, NPM_PACKAGE_NAME } from "@/shared/constants/version.js";

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
