import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

describe("bump-version script", () => {
  it("sync-only flag propagates root version to satellite packages", () => {
    const rootPkgPath = path.join(rootDir, "package.json");
    const cliPkgPath = path.join(rootDir, "cli/package.json");
    const gitbookPkgPath = path.join(rootDir, "gitbook/package.json");

    const rootVersion = JSON.parse(fs.readFileSync(rootPkgPath, "utf8")).version;

    execSync("node scripts/bump-version.mjs --sync-only", { cwd: rootDir });

    const cliVersion = JSON.parse(fs.readFileSync(cliPkgPath, "utf8")).version;
    const gitbookVersion = JSON.parse(fs.readFileSync(gitbookPkgPath, "utf8")).version;

    expect(cliVersion).toBe(rootVersion);
    expect(gitbookVersion).toBe(rootVersion);
  });
});
