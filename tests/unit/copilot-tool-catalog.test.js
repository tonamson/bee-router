import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CLI_TOOLS, MITM_TOOLS } from "../../src/shared/constants/cliTools.js";
import * as catalog from "../../src/shared/constants/cliTools.js";

function loadJsxModule(relativePath, imports) {
  const require = createRequire(import.meta.url);
  const { transformSync } = require("next/dist/compiled/babel/core");
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { code } = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: "ToolDetail.jsx",
    presets: [[require.resolve("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]],
    plugins: [require.resolve("next/dist/compiled/babel/plugin-transform-modules-commonjs")],
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process: { env: {} },
    require: (id) => Object.hasOwn(imports, id) ? imports[id] : require(id),
  });
  return module.exports.default;
}

describe("Copilot tool catalog", () => {
  it("preserves the fork's MITM domain and concrete model mappings", () => {
    const tool = MITM_TOOLS.copilot;
    expect(tool).toMatchObject({
      id: "copilot",
      configType: "mitm",
      mitmDomain: "api.individual.githubcopilot.com",
    });
    const models = ["gpt-5-mini", "gpt-5.4-nano", "claude-haiku-4.5", "gpt-4o", "gpt-4.1"];
    expect(tool.modelAliases).toEqual(models);
    expect(tool.defaultModels.map(({ id, alias }) => [id, alias])).toEqual(models.map((id) => [id, id]));
  });

  it("keeps the VS Code extension guide distinct from the MITM tool", () => {
    const guide = CLI_TOOLS["copilot-vscode"];
    expect(guide).toMatchObject({ id: "copilot-vscode", configType: "guide" });
    expect(guide.name).not.toBe(MITM_TOOLS.copilot.name);
    expect(guide.docsUrl).toContain("hotrungnhan.9router-for-github-copilot");
    expect(guide.guideSteps[1].desc).toContain("9Router: Configure Server");
    expect(CLI_TOOLS.copilot).toBeUndefined();
    expect({ ...MITM_TOOLS, ...CLI_TOOLS }.copilot).toBe(MITM_TOOLS.copilot);
  });

  it("describes the new custom CLI integrations using BeeRouter config names", () => {
    for (const id of ["pi", "omp", "crush", "forge", "codewhale"]) {
      const notes = CLI_TOOLS[id].notes.map(({ text }) => text).join(" ");
      expect(notes).toContain("BeeRouter");
      expect(notes).not.toMatch(/9router/i);
    }
    expect(CLI_TOOLS.pi.notes[0].text).toContain('providers["bee-router"]');
  });
});

describe("Copilot detail route gates", () => {
  let ToolDetailPage;
  let ToolDetailClient;

  beforeAll(() => {
    const card = (name) => () => React.createElement("div", { "data-card": name });
    ToolDetailPage = loadJsxModule("../../src/app/(dashboard)/dashboard/cli-tools/[toolId]/page.js", {
      "next/navigation": { notFound: () => { throw new Error("NOT_FOUND"); } },
      "@/shared/constants/cliTools": catalog,
      "@/shared/utils/machine": { getMachineId: async () => "test-machine" },
      "./ToolDetailClient": card("ToolDetailClient"),
    });
    ToolDetailClient = loadJsxModule("../../src/app/(dashboard)/dashboard/cli-tools/[toolId]/ToolDetailClient.js", {
      react: {
        ...React,
        useState: (initial) => [initial === true ? false : initial, () => {}],
        useEffect: () => {},
        useCallback: (callback) => callback,
      },
      "next/link": ({ children }) => React.createElement("a", null, children),
      "@/shared/constants/cliTools": catalog,
      "@/shared/components": { CardSkeleton: card("skeleton") },
      "@/i18n/runtime": { translate: (text) => text },
      "@/shared/constants/models": { getModelsByProviderId: () => [], PROVIDER_ID_TO_ALIAS: {} },
      "../components": {
        CopilotToolCard: card("CopilotToolCard"),
        DefaultToolCard: card("DefaultToolCard"),
      },
    });
  });

  it.each(["copilot", "copilot-vscode"])("allows /cli-tools/%s through the server and client gates", async (toolId) => {
    const page = await ToolDetailPage({ params: Promise.resolve({ toolId }) });
    expect(page.props).toMatchObject({ toolId, machineId: "test-machine" });
    const html = renderToStaticMarkup(ToolDetailClient({ toolId, machineId: "test-machine" }));
    const expectedCard = toolId === "copilot" ? "CopilotToolCard" : "DefaultToolCard";
    expect(html).toContain(`data-card="${expectedCard}"`);
    expect(html).not.toContain("Tool not found or disabled.");
  });

  it("does not expose other MITM-only IDs as CLI details", async () => {
    const rejected = [...Object.keys(MITM_TOOLS).filter((id) => id !== "copilot" && !CLI_TOOLS[id]), "unknown-tool"];
    for (const toolId of rejected) {
      await expect(ToolDetailPage({ params: Promise.resolve({ toolId }) })).rejects.toThrow("NOT_FOUND");
      const html = renderToStaticMarkup(ToolDetailClient({ toolId, machineId: "test-machine" }));
      expect(html).toContain("Tool not found or disabled.");
    }
  });
});
