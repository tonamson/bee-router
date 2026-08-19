# Unified Versioning Management Design

## Overview
This specification establishes a Single Source of Truth for versioning across the entire BeeRouter repository, unifies runtime version access across all application layers, eliminates runtime bugs caused by `process.cwd()` package lookup, and provides a one-touch automated version bumping mechanism.

## Problem Statement
Currently:
1. **Multiple package.json files**: Root `package.json`, `cli/package.json`, and `gitbook/package.json` maintain independent `version` fields.
2. **Conflicting sync directions**: `scripts/publish-cli.sh` synchronizes version from root to `cli/package.json`, whereas `cli/scripts/build-cli.js` synchronizes from `cli/package.json` to root `package.json`.
3. **Runtime `process.cwd()` lookup bug**: `src/lib/db/version.js` attempts to read `path.join(process.cwd(), "package.json")`. When running the global `bee-router` CLI binary from an arbitrary working directory, it reads whatever `package.json` happens to be in that directory or falls back to `"0.0.0"`.
4. **Scattered relative imports**: `src/shared/constants/config.js`, `src/app/api/version/route.js`, `open-sse/config/appConstants.js`, and `open-sse/shared/clineAuth.js` each independently import or require `../../package.json` with differing relative path depths.

## Architecture & Design

### 1. Single Source of Truth
- Root `package.json` (`/package.json`) is the definitive, single source of truth for the application version.
- Satellite package definitions (`cli/package.json`, `gitbook/package.json`, `cli/app/package.json`) must strictly mirror the root version.

### 2. Centralized Version Module
Create `src/shared/constants/version.js`:
```javascript
import pkg from "../../../package.json" with { type: "json" };

export const APP_VERSION = pkg.version;
export const APP_NAME = pkg.name;
export const NPM_PACKAGE_NAME = "@tonamson2/bee-router";
```

#### Consumer Refactoring:
- **`src/shared/constants/config.js`**: Imports `APP_VERSION` and `NPM_PACKAGE_NAME` from `@/shared/constants/version.js` (or `./version.js`). `APP_CONFIG.version` is set to `APP_VERSION`.
- **`src/app/api/version/route.js`**: Imports `APP_VERSION` and `NPM_PACKAGE_NAME` from `@/shared/constants/version.js`.
- **`src/lib/db/version.js`**: Directly exports `getAppVersion() => APP_VERSION`, removing file system operations on `process.cwd()`.
- **`open-sse/config/appConstants.js`**: Replaces dynamic `require("../../package.json")` with `APP_VERSION` from `@/shared/constants/version.js` or directly from `open-sse/config/version.js` / shared constant.
- **`open-sse/shared/clineAuth.js`**: Replaces `import pkg from "../../package.json"` with `APP_VERSION`.
- **`cli/cli.js`**: Reads from `cli/package.json` (which is kept in sync).

### 3. Automated Version Bumping & Synchronization
Create `scripts/bump-version.mjs`:
- **Capabilities**:
  - Accept bump type (`patch`, `minor`, `major`) or explicit semver (`x.y.z`).
  - `--sync-only` mode: Reads current root `package.json` version and propagates it to all satellite packages without bumping.
  - Updates:
    - Root `package.json`
    - `cli/package.json`
    - `gitbook/package.json`
    - `cli/app/package.json` (if present)
- **NPM Integration** (`package.json`):
  ```json
  "scripts": {
    "bump": "node scripts/bump-version.mjs",
    "version": "node scripts/bump-version.mjs --sync-only"
  }
  ```
  *(The `"version"` script automatically runs during standard `npm version <type>` before git commits and tags).*
- **`scripts/publish-cli.sh` Integration**:
  - Replaces custom bump logic with `node "$ROOT/scripts/bump-version.mjs" "$BUMP"`.
- **`cli/scripts/build-cli.js` Integration**:
  - Step 0 verifies or syncs version unidirectionally from root `package.json` to `cli/package.json`.

## Verification & Testing
1. **Consistency Unit Test** (`tests/unit/version-consistency.test.js`):
   - Asserts root `package.json`, `cli/package.json`, `gitbook/package.json`, `APP_CONFIG.version`, and `getAppVersion()` all yield the exact same version string.
   - Asserts `getAppVersion()` remains consistent regardless of `process.cwd()`.
2. **Bump Script Verification**:
   - Run `node scripts/bump-version.mjs --sync-only` to verify all satellite files match root.
