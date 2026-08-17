import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Regression guard for the Windows xAI/Grok token refresh failure.
//
// `open` computes its own directory from `import.meta.url`. When it is bundled, webpack
// replaces that with the BUILD machine's absolute path as a string literal, so a release
// built on macOS ships `fileURLToPath("file:///Users/.../open/index.js")`. On Windows that
// throws ERR_INVALID_FILE_URL_PATH ("File URL path must be absolute" — no drive letter) at
// module scope, which kills every importer. `refreshXaiToken` imports the xAI OAuth
// service, which imports `open`, so no Grok refresh could ever reach auth.x.ai on Windows.
//
// Keeping the package external preserves the real `import.meta.url` at runtime.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("open must not be bundled into the server build", () => {
  const config = readFileSync(path.join(repoRoot, "next.config.mjs"), "utf8");

  it("is declared in serverExternalPackages", () => {
    const match = config.match(/serverExternalPackages:\s*\[([^\]]*)\]/);
    expect(match, "serverExternalPackages not found in next.config.mjs").toBeTruthy();
    const packages = match[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    expect(packages).toContain("open");
  });

  it("stays a runtime dependency so the standalone output can resolve it", async () => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    expect(pkg.dependencies?.open).toBeTruthy();
  });

  it("resolves its own directory from import.meta.url, which is why it must stay external", async () => {
    const entry = path.join(repoRoot, "node_modules", "open", "index.js");
    const source = readFileSync(entry, "utf8");
    expect(source).toMatch(/import\.meta\.url/);
  });
});

// DeepSeek web PoW: same class of bug as `open`. Sibling wasm/cjs are loaded via
// import.meta.url + createRequire; webpack rewrites that URL and standalone tracing
// does not ship the binaries. Guard the packaging seams so CLI / next start can solve PoW.
describe("DeepSeek PoW assets must ship in standalone", () => {
  it("lists wasm and cjs in outputFileTracingIncludes", () => {
    const config = readFileSync(path.join(repoRoot, "next.config.mjs"), "utf8");
    expect(config).toMatch(/outputFileTracingIncludes/);
    expect(config).toMatch(/sha3_wasm_bg\.wasm/);
    expect(config).toMatch(/deepseek-pow-solver\.cjs/);
  });

  it("copy-standalone-assets places PoW binaries under open-sse/lib", () => {
    const script = readFileSync(path.join(repoRoot, "scripts", "copy-standalone-assets.mjs"), "utf8");
    expect(script).toMatch(/sha3_wasm_bg\.wasm/);
    expect(script).toMatch(/deepseek-pow-solver\.cjs/);
    expect(script).toMatch(/open-sse/);
  });

  it("CLI pack copies PoW assets when workspace-traced builds skip postbuild", () => {
    const script = readFileSync(path.join(repoRoot, "cli", "scripts", "build-cli.js"), "utf8");
    expect(script).toMatch(/sha3_wasm_bg\.wasm/);
    expect(script).toMatch(/deepseek-pow-solver\.cjs/);
  });

  it("solver resolves assets via cwd fallback, not bare top-level createRequire(import.meta.url)", () => {
    const source = readFileSync(path.join(repoRoot, "open-sse", "lib", "deepseek-pow.js"), "utf8");
    // Must not pin createRequire to rewritten import.meta.url at module scope only.
    expect(source).toMatch(/process\.cwd\(\)/);
    expect(source).toMatch(/open-sse/);
    expect(source).not.toMatch(/^const require = createRequire\(import\.meta\.url\);$/m);
  });
});
