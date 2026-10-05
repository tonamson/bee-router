import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as providers from "../../src/shared/constants/providers.js";
import * as models from "../../src/shared/constants/models.js";

let ModelSelectModal;
let stateIndex = 0;
let savedCombos = [];

beforeAll(() => {
  // Compile the real component with the same JSX fixture used by tool-catalog tests.
  const require = createRequire(import.meta.url);
  const { transformSync } = require("next/dist/compiled/babel/core");
  const source = fs.readFileSync(new URL("../../src/shared/components/ModelSelectModal.js", import.meta.url), "utf8");
  const { code } = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: "ModelSelectModal.jsx",
    presets: [[require.resolve("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]],
    plugins: [require.resolve("next/dist/compiled/babel/plugin-transform-modules-commonjs")],
  });
  const imports = {
    react: {
      ...React,
      useState: (initial) => [stateIndex++ === 1 ? savedCombos : initial, () => {}],
      useMemo: (compute) => compute(),
      useEffect: () => {},
    },
    "./Modal": ({ children }) => React.createElement("div", null, children),
    "./ProviderIcon": () => null,
    "./CapacityBadges": () => null,
    "@/shared/hooks/useModelCaps": { useModelCaps: () => ({ getCaps: () => ({}) }) },
    "@/shared/constants/providers": providers,
    "@/shared/constants/models": models,
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id) => Object.hasOwn(imports, id) ? imports[id] : require(id),
  });
  ModelSelectModal = module.exports.default;
});

function render(props = {}, combos = []) {
  stateIndex = 0;
  savedCombos = combos;
  return renderToStaticMarkup(ModelSelectModal({
    isOpen: true, onClose: () => {}, onSelect: () => {}, ...props,
  }));
}

describe("ModelSelectModal hidden provider visibility", () => {
  it("excludes retired no-auth providers while retaining usable free models", () => {
    expect(providers.FREE_PROVIDERS["mimo-free"]).toMatchObject({ hidden: true, noAuth: true });
    const html = render();
    expect(html).not.toContain("MiMo Code Free");
    expect(html).not.toContain("MiMo Auto");
    expect(html).toContain("OpenCode");
  });

  it.each([null, "llm"])("does not reinsert connected hidden providers or their aliases (kind %s)", (kindFilter) => {
    const html = render({
      kindFilter,
      activeProviders: [
        { provider: "mimo-free", id: "retired-account" },
        { provider: "bluesminds", id: "hidden-connected-account" },
      ],
      modelAliases: { "Retired custom alias": "mmf/custom-model" },
    });
    expect(html).not.toContain("MiMo Code Free");
    expect(html).not.toContain("Retired custom alias");
    expect(html).not.toContain("BluesMinds");
  });

  it("also excludes hidden providers from typed modality selection", () => {
    expect(providers.AI_PROVIDERS.cartesia).toMatchObject({ hidden: true, serviceKinds: ["tts"] });
    const html = render({ kindFilter: "tts", activeProviders: [{ provider: "cartesia", id: "tts-account" }] });
    expect(html).not.toContain("Cartesia");
  });

  it("preserves unknown and compatible connected providers, and saved combos", () => {
    const html = render({
      activeProviders: [
        { provider: "unknown-provider", id: "unknown-account" },
        { provider: "openai-compatible-custom", id: "custom-account" },
      ],
      modelAliases: { "Unknown model": "unknown-provider/model" },
    }, [{ id: "saved-combo", name: "Existing retired-provider combo", models: ["mmf/mimo-auto"] }]);
    expect(html).toContain("Unknown model");
    expect(html).toContain("openai-compatible-custom");
    expect(html).toContain("Existing retired-provider combo");
  });
});
