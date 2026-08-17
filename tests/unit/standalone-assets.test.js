import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { copyStandaloneAssets } from "../../scripts/copy-standalone-assets.mjs";

function createBuildFixture(distDir) {
  const projectRoot = mkdtempSync(join(tmpdir(), "9router-standalone-assets-"));
  const buildRoot = join(projectRoot, distDir);
  mkdirSync(join(buildRoot, "standalone"), { recursive: true });
  mkdirSync(join(buildRoot, "static", "chunks"), { recursive: true });
  mkdirSync(join(projectRoot, "public"), { recursive: true });
  writeFileSync(join(buildRoot, "static", "chunks", "app.js"), "static asset");
  writeFileSync(join(projectRoot, "public", "favicon.svg"), "public asset");
  return projectRoot;
}

describe("standalone build assets", () => {
  it("copies static and public assets into the default standalone layout", () => {
    const projectRoot = createBuildFixture(".next");

    copyStandaloneAssets({ projectRoot, distDir: ".next" });

    expect(readFileSync(join(projectRoot, ".next", "standalone", ".next", "static", "chunks", "app.js"), "utf8"))
      .toBe("static asset");
    expect(readFileSync(join(projectRoot, ".next", "standalone", "public", "favicon.svg"), "utf8"))
      .toBe("public asset");
  });

  it("uses a custom Next dist directory", () => {
    const projectRoot = createBuildFixture(".next-cli-build");

    copyStandaloneAssets({ projectRoot, distDir: ".next-cli-build" });

    expect(readFileSync(join(projectRoot, ".next-cli-build", "standalone", ".next-cli-build", "static", "chunks", "app.js"), "utf8"))
      .toBe("static asset");
  });

  // Without the wrapper beside server.js nothing can prove a request is local.
  it("copies the request-sanitizing server wrapper into the standalone output", () => {
    const projectRoot = createBuildFixture(".next");
    writeFileSync(join(projectRoot, "custom-server.js"), "wrapper");

    copyStandaloneAssets({ projectRoot, distDir: ".next" });

    expect(readFileSync(join(projectRoot, ".next", "standalone", "custom-server.js"), "utf8"))
      .toBe("wrapper");
  });

  it("does not modify workspace-traced CLI builds", () => {
    const projectRoot = createBuildFixture(".next-cli-build");
    const previousMode = process.env.NEXT_TRACING_ROOT_MODE;
    process.env.NEXT_TRACING_ROOT_MODE = "workspace";

    try {
      copyStandaloneAssets({ projectRoot, distDir: ".next-cli-build" });
    } finally {
      if (previousMode === undefined) delete process.env.NEXT_TRACING_ROOT_MODE;
      else process.env.NEXT_TRACING_ROOT_MODE = previousMode;
    }

    expect(() => readFileSync(join(projectRoot, ".next-cli-build", "standalone", ".next-cli-build", "static", "chunks", "app.js")))
      .toThrow();
  });

  // DeepSeek web PoW loads wasm/cjs via import.meta.url siblings. Webpack rewrites that
  // URL to the build-machine path and file tracing does not follow dynamic fs.readFile /
  // createRequire, so standalone must copy the binaries next to a runtime-findable root.
  it("copies DeepSeek PoW wasm and cjs into standalone open-sse/lib", () => {
    const projectRoot = createBuildFixture(".next");
    mkdirSync(join(projectRoot, "open-sse", "lib"), { recursive: true });
    writeFileSync(join(projectRoot, "open-sse", "lib", "sha3_wasm_bg.wasm"), "wasm-bytes");
    writeFileSync(join(projectRoot, "open-sse", "lib", "deepseek-pow-solver.cjs"), "module.exports={U:1}");
    writeFileSync(join(projectRoot, "open-sse", "lib", "deepseek-pow.js"), "export {}");

    copyStandaloneAssets({ projectRoot, distDir: ".next" });

    const dest = join(projectRoot, ".next", "standalone", "open-sse", "lib");
    expect(readFileSync(join(dest, "sha3_wasm_bg.wasm"), "utf8")).toBe("wasm-bytes");
    expect(readFileSync(join(dest, "deepseek-pow-solver.cjs"), "utf8")).toBe("module.exports={U:1}");
    expect(readFileSync(join(dest, "deepseek-pow.js"), "utf8")).toBe("export {}");
  });
});
