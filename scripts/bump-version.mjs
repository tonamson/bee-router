#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const SATELLITE_PKGS = [
  path.join(rootDir, "cli/package.json"),
  path.join(rootDir, "gitbook/package.json"),
  path.join(rootDir, "cli/app/package.json"),
];

function bumpSemver(current, type) {
  const parts = current.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid current version: ${current}`);
  }
  let [major, minor, patch] = parts;
  switch (type.toLowerCase()) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      if (/^\d+\.\d+\.\d+/.test(type)) {
        return type;
      }
      throw new Error(`Invalid bump type or semver string: ${type}`);
  }
}

function updateJsonVersion(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  const pkg = JSON.parse(content);
  if (pkg.version === newVersion) return true;
  pkg.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  return true;
}

function main() {
  const args = process.argv.slice(2);
  const rootPkgPath = path.join(rootDir, "package.json");
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
  const currentVersion = rootPkg.version;

  let targetVersion = currentVersion;
  const isSyncOnly = args.includes("--sync-only");
  const bumpArg = args.find((a) => a !== "--sync-only");

  if (!isSyncOnly) {
    targetVersion = bumpSemver(currentVersion, bumpArg || "patch");
    updateJsonVersion(rootPkgPath, targetVersion);
    console.log(`🚀 Bumped root version: ${currentVersion} → ${targetVersion}`);
  } else {
    console.log(`🔄 Syncing satellite packages with version: ${targetVersion}`);
  }

  for (const pkgPath of SATELLITE_PKGS) {
    if (fs.existsSync(pkgPath)) {
      const relPath = path.relative(rootDir, pkgPath);
      updateJsonVersion(pkgPath, targetVersion);
      console.log(`  ✓ Synced ${relPath} → ${targetVersion}`);
    }
  }

  console.log("✅ Version synchronization complete.");
}

main();
