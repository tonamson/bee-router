#!/usr/bin/env node
/**
 * Bump root package.json, sync satellite packages, then git commit + annotated tag.
 *
 * Usage:
 *   yarn bump                      patch (0.1.2 → 0.1.3), commit, tag v0.1.3
 *   yarn bump minor                0.1.2 → 0.2.0
 *   yarn bump major                0.1.2 → 1.0.0
 *   yarn bump 1.4.0                set exact semver
 *   yarn bump --push               bump patch, commit, tag, push HEAD + tag
 *   yarn bump minor --push         bump minor and push (triggers Docker CI on v*)
 *   yarn bump --no-git             write JSON only (no commit/tag)
 *   yarn version                   --sync-only: copy root version to satellites, no bump/tag
 *
 * npm:  npm run bump -- patch
 *       npm run bump -- --push
 *
 * Satellites: cli/package.json, gitbook/package.json, cli/app/package.json
 * Tag:        v{version} annotated. Skip if tag already exists.
 * Push tag:   starts .github/workflows/docker-publish.yml
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const USAGE = `bump-version — bump root + satellites, commit, tag vX.Y.Z

  yarn bump                 patch, commit, tag (no push)
  yarn bump minor           0.x.y → 0.(x+1).0
  yarn bump major           x.y.z → (x+1).0.0
  yarn bump 1.4.0           set exact version
  yarn bump --push          patch + push HEAD and tag
  yarn bump minor --push    minor + push (Docker CI on v*)
  yarn bump --no-git        JSON only
  yarn version              --sync-only (no bump, no tag)

  npm run bump -- patch
  npm run bump -- --push

  Satellites: cli/, gitbook/, cli/app/
  Tag: v{version}  Skip if exists.`;

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

function git(args, { allowFail = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    if (allowFail) return "";
    const msg = (err.stderr || err.stdout || err.message).toString().trim();
    throw new Error(msg || `git ${args.join(" ")} failed`);
  }
}

function tagRelease(version, { push }) {
  const files = [
    path.join(rootDir, "package.json"),
    ...SATELLITE_PKGS.filter((p) => fs.existsSync(p)),
  ].map((p) => path.relative(rootDir, p));

  git(["add", "--", ...files]);
  const staged = git(["diff", "--cached", "--name-only"], { allowFail: true });
  if (staged) {
    git(["commit", "-m", `chore(release): v${version}`]);
    console.log(`  ✓ commit chore(release): v${version}`);
  } else {
    console.log("  • no version file changes to commit");
  }

  const tag = `v${version}`;
  const exists = git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { allowFail: true });
  if (exists) {
    console.log(`  • tag ${tag} already exists`);
  } else {
    git(["tag", "-a", tag, "-m", tag]);
    console.log(`  ✓ tag ${tag}`);
  }

  if (push) {
    git(["push"]);
    git(["push", "origin", tag]);
    console.log(`  ✓ pushed HEAD and ${tag}`);
  } else {
    console.log(`  → git push && git push origin ${tag}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return;
  }

  const rootPkgPath = path.join(rootDir, "package.json");
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
  const currentVersion = rootPkg.version;

  const isSyncOnly = args.includes("--sync-only");
  const noGit = args.includes("--no-git");
  const push = args.includes("--push");
  const bumpArg = args.find((a) => !a.startsWith("--"));

  let targetVersion = currentVersion;

  if (!isSyncOnly) {
    try {
      targetVersion = bumpSemver(currentVersion, bumpArg || "patch");
    } catch (err) {
      console.error(err.message);
      console.error(USAGE);
      process.exit(1);
    }
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

  if (!isSyncOnly && !noGit) {
    tagRelease(targetVersion, { push });
  }

  console.log("✅ Version synchronization complete.");
}

main();
