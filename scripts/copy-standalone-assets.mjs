import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Sibling binaries for open-sse/lib/deepseek-pow.js. Webpack rewrites import.meta.url
// and does not trace dynamic fs.readFile / createRequire — copy into standalone root so
// runtime can find them under process.cwd()/open-sse/lib (CLI sets cwd to app/).
export const DEEPSEEK_POW_ASSETS = [
  "sha3_wasm_bg.wasm",
  "deepseek-pow-solver.cjs",
  "deepseek-pow.js",
];

export function copyDeepSeekPowAssets({ projectRoot = process.cwd(), destinationRoot } = {}) {
  if (!destinationRoot) return;
  const srcDir = resolve(projectRoot, "open-sse", "lib");
  const destDir = resolve(destinationRoot, "open-sse", "lib");
  let copied = 0;
  for (const name of DEEPSEEK_POW_ASSETS) {
    const src = resolve(srcDir, name);
    if (!existsSync(src)) continue;
    mkdirSync(destDir, { recursive: true });
    cpSync(src, resolve(destDir, name), { force: true });
    copied += 1;
  }
  if (copied > 0) {
    console.log(`[standalone-assets] Copied DeepSeek PoW assets (${copied}) to ${destDir}`);
  }
}

export function copyStandaloneAssets({ projectRoot = process.cwd(), distDir = process.env.NEXT_DIST_DIR || ".next" } = {}) {
  if (process.env.NEXT_TRACING_ROOT_MODE === "workspace") {
    console.log("[standalone-assets] Skipping workspace-traced CLI build; CLI packaging handles assets");
    return;
  }

  const buildDir = resolve(projectRoot, distDir);
  const standaloneDir = resolve(buildDir, "standalone");

  if (!existsSync(standaloneDir)) {
    console.log(`[standalone-assets] No standalone build found at ${standaloneDir}`);
    return;
  }

  const staticSource = resolve(buildDir, "static");
  const staticDestination = resolve(standaloneDir, distDir, "static");
  if (existsSync(staticSource)) {
    cpSync(staticSource, staticDestination, { recursive: true, force: true });
    console.log(`[standalone-assets] Copied static assets to ${staticDestination}`);
  }

  const publicSource = resolve(projectRoot, "public");
  const publicDestination = resolve(standaloneDir, "public");
  if (existsSync(publicSource)) {
    cpSync(publicSource, publicDestination, { recursive: true, force: true });
    console.log(`[standalone-assets] Copied public assets to ${publicDestination}`);
  }

  // Without it beside server.js the standalone build serves requests unsanitized.
  const serverWrapperSource = resolve(projectRoot, "custom-server.js");
  const serverWrapperDestination = resolve(standaloneDir, "custom-server.js");
  if (existsSync(serverWrapperSource)) {
    cpSync(serverWrapperSource, serverWrapperDestination, { force: true });
    console.log(`[standalone-assets] Copied custom-server.js to ${serverWrapperDestination}`);
  }

  // Nested under project name when outputFileTracingRoot is a parent workspace.
  const pkgName = projectRoot.split(/[/\\]/).filter(Boolean).pop();
  const nestedStandalone = resolve(standaloneDir, pkgName);
  const powDest = existsSync(resolve(nestedStandalone, "server.js")) && !existsSync(resolve(standaloneDir, "server.js"))
    ? nestedStandalone
    : standaloneDir;
  copyDeepSeekPowAssets({ projectRoot, destinationRoot: powDest });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(dirname(fileURLToPath(import.meta.url)), "copy-standalone-assets.mjs")) {
  copyStandaloneAssets();
}
