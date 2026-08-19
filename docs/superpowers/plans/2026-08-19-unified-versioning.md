# Unified Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish root `package.json` as the single source of truth for versioning, provide a central version module `src/shared/constants/version.js`, eliminate runtime `process.cwd()` dependencies, and provide a one-touch bump script `scripts/bump-version.mjs`.

**Architecture:** A single JS module `src/shared/constants/version.js` loads root `package.json` and exports constants (`APP_VERSION`, `APP_NAME`, `NPM_PACKAGE_NAME`). All frontend, backend, CLI, and database version utilities consume this module. A standalone Node script `scripts/bump-version.mjs` handles version bumping and automatic bidirectional sync to satellite packages.

**Tech Stack:** Node.js (ESM & CommonJS interop), Next.js, Vitest.

## Global Constraints
- Single source of truth is `/package.json`.
- Satellite files (`cli/package.json`, `gitbook/package.json`, `cli/app/package.json`) must remain in exact version sync with `/package.json`.
- No runtime reading of `path.join(process.cwd(), "package.json")`.

---

### Task 1: Create Centralized Version Module & Consistency Test

**Files:**
- Create: `src/shared/constants/version.js`
- Create: `tests/unit/version-consistency.test.js`

**Interfaces:**
- Produces: `APP_VERSION: string`, `APP_NAME: string`, `NPM_PACKAGE_NAME: string` from `src/shared/constants/version.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/version-consistency.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run -c tests/vitest.config.js tests/unit/version-consistency.test.js`
Expected: FAIL with "Cannot find module '@/shared/constants/version.js'"

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/constants/version.js`:
```javascript
import pkg from "../../../package.json" with { type: "json" };

export const APP_VERSION = pkg.version;
export const APP_NAME = pkg.name;
export const NPM_PACKAGE_NAME = "@tonamson2/bee-router";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run -c tests/vitest.config.js tests/unit/version-consistency.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/constants/version.js tests/unit/version-consistency.test.js
git commit -m "feat(version): add central version module and consistency tests"
```

---

### Task 2: Refactor Code Consumers to Central Version Module

**Files:**
- Modify: `src/shared/constants/config.js`
- Modify: `src/app/api/version/route.js`
- Modify: `src/lib/db/version.js`
- Modify: `open-sse/config/appConstants.js`
- Modify: `open-sse/shared/clineAuth.js`
- Modify: `tests/unit/version-consistency.test.js`

**Interfaces:**
- Consumes: `APP_VERSION`, `APP_NAME`, `NPM_PACKAGE_NAME` from `src/shared/constants/version.js`
- Produces: `getAppVersion(): string` from `src/lib/db/version.js` returning `APP_VERSION` without reading `process.cwd()`

- [ ] **Step 1: Add tests for `getAppVersion()` and consumers**

Add to `tests/unit/version-consistency.test.js`:
```javascript
import { getAppVersion } from "@/lib/db/version.js";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config.js";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run -c tests/vitest.config.js tests/unit/version-consistency.test.js`
Expected: FAIL on `process.chdir("/tmp")` because `getAppVersion()` reads `process.cwd()/package.json`.

- [ ] **Step 3: Refactor consumers**

1. Update `src/lib/db/version.js`:
```javascript
import { APP_VERSION } from "@/shared/constants/version.js";

export function getAppVersion() {
  return APP_VERSION;
}

export function timestampSlug(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
```

2. Update `src/shared/constants/config.js`:
```javascript
import { APP_VERSION, APP_NAME, NPM_PACKAGE_NAME } from "./version.js";

// App configuration
export const APP_CONFIG = {
  name: APP_NAME || "BeeRouter",
  description: "The Smartest AI Hive — Fast AI Routing & Unified Proxy",
  version: APP_VERSION,
};

// ... keep remaining unchanged, use NPM_PACKAGE_NAME in UPDATER_CONFIG:
// npmPackageName: NPM_PACKAGE_NAME,
```

3. Update `src/app/api/version/route.js`:
```javascript
import https from "https";
import { APP_VERSION, NPM_PACKAGE_NAME } from "@/shared/constants/version.js";

const VERSION_CACHE_TTL_MS = 3600000; // cache npm latest lookup for 1h

// Survive hot reload; one cache per process
const versionCache = (global.__npmVersionCache ??= { value: null, fetchedAt: 0 });

// Fetch latest version from npm registry
function fetchLatestVersion() {
  return new Promise((resolve) => {
    const req = https.get(
      `https://registry.npmjs.org/${NPM_PACKAGE_NAME}/latest`,
      { timeout: 4000 },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data).version || null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

async function getLatestVersionCached() {
  if (versionCache.value && Date.now() - versionCache.fetchedAt < VERSION_CACHE_TTL_MS) {
    return versionCache.value;
  }
  const latest = await fetchLatestVersion();
  if (latest) {
    versionCache.value = latest;
    versionCache.fetchedAt = Date.now();
  }
  return latest;
}

export async function GET() {
  const latestVersion = await getLatestVersionCached();
  const currentVersion = APP_VERSION;
  const hasUpdate = latestVersion ? compareVersions(latestVersion, currentVersion) > 0 : false;

  return Response.json({ currentVersion, latestVersion, hasUpdate });
}
```

4. Update `open-sse/config/appConstants.js`:
Replace `getAppPackageVersion` to return `APP_VERSION` directly (or import `APP_VERSION` from `@/shared/constants/version.js`).

5. Update `open-sse/shared/clineAuth.js`:
Replace `import pkg from "../../package.json"` with `import { APP_VERSION } from "@/shared/constants/version.js"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run -c tests/vitest.config.js tests/unit/version-consistency.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/constants/config.js src/app/api/version/route.js src/lib/db/version.js open-sse/config/appConstants.js open-sse/shared/clineAuth.js tests/unit/version-consistency.test.js
git commit -m "refactor(version): unify version consumers to central version module"
```

---

### Task 3: Create Automated Version Bump & Sync Script

**Files:**
- Create: `scripts/bump-version.mjs`
- Modify: `package.json`
- Test: `tests/unit/bump-version-script.test.js`

**Interfaces:**
- CLI usage: `node scripts/bump-version.mjs [patch|minor|major|x.y.z]` or `node scripts/bump-version.mjs --sync-only`

- [ ] **Step 1: Write test for bump-version script logic**

Create `tests/unit/bump-version-script.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run -c tests/vitest.config.js tests/unit/bump-version-script.test.js`
Expected: FAIL with "Cannot find module ... scripts/bump-version.mjs"

- [ ] **Step 3: Implement `scripts/bump-version.mjs` and update `package.json`**

Create `scripts/bump-version.mjs`:
```javascript
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

  if (!isSyncOnly && args[0]) {
    targetVersion = bumpSemver(currentVersion, args[0]);
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
```

In `package.json`, add to `"scripts"`:
```json
"bump": "node scripts/bump-version.mjs",
"version": "node scripts/bump-version.mjs --sync-only"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run -c tests/vitest.config.js tests/unit/bump-version-script.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/bump-version.mjs package.json tests/unit/bump-version-script.test.js
git commit -m "feat(version): add automated bump-version script and npm lifecycle hook"
```

---

### Task 4: Integrate Scripts (`publish-cli.sh` & `build-cli.js`)

**Files:**
- Modify: `scripts/publish-cli.sh`
- Modify: `cli/scripts/build-cli.js`

**Interfaces:**
- `publish-cli.sh`: calls `node "$ROOT/scripts/bump-version.mjs" "$BUMP"`
- `build-cli.js`: calls `node "$rootDir/scripts/bump-version.mjs" --sync-only` or validates sync from root

- [ ] **Step 1: Update `scripts/publish-cli.sh`**

Replace manual version bumping logic in `scripts/publish-cli.sh` with:
```bash
echo "→ bump $BUMP"
node "$ROOT/scripts/bump-version.mjs" "$BUMP"
VER="$(node -p "require('$ROOT/package.json').version")"
```

- [ ] **Step 2: Update `cli/scripts/build-cli.js`**

In `cli/scripts/build-cli.js` (Step 0):
```javascript
  // Step 0: Ensure version is synchronized from root package.json to cli/package.json
  console.log("0️⃣  Validating version sync from root package.json...");
  try {
    execSync("node scripts/bump-version.mjs --sync-only", { stdio: "inherit", cwd: rootDir });
  } catch (err) {
    console.warn("⚠️  Version sync check warning:", err.message);
  }
```

- [ ] **Step 3: Run integration test**

Run: `node scripts/bump-version.mjs --sync-only`
Expected: Successfully verifies and logs all synced files.

- [ ] **Step 4: Commit**

```bash
git add scripts/publish-cli.sh cli/scripts/build-cli.js
git commit -m "chore(cli): harmonize publish and build scripts with unified bump system"
```

---

### Task 5: Full Suite Verification & Final Check

**Files:**
- Verify: `tests/unit/version-consistency.test.js`
- Verify: `tests/unit/bump-version-script.test.js`

- [ ] **Step 1: Run dedicated version test suites**

Run: `npx vitest run -c tests/vitest.config.js tests/unit/version-consistency.test.js tests/unit/bump-version-script.test.js`
Expected: All tests PASS.

- [ ] **Step 2: Verify git status is clean**

Run: `git status`
Expected: Clean working tree.
