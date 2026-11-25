import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProviderModelCatalog } from "../../src/shared/hooks/useProviderModelCatalog.js";
import {
  mergeProviderModelCatalog,
  normalizeProviderModelCatalog,
} from "../../src/shared/utils/providerModelCatalog.js";

const react = vi.hoisted(() => ({ state: null, effect: null, ref: { current: null } }));
vi.mock("react", () => ({
  useState: () => [react.state, (update) => { react.state = update(react.state); }],
  useEffect: (effect) => { react.effect = effect; },
  useRef: () => react.ref,
}));

const connections = [{ provider: "codex", id: "inactive", isActive: false }, { provider: "codex", id: "active" }];
const catalogResponse = (id) => ({ ok: true, json: async () => ({ models: [{ id }] }) });

describe("automatic provider model discovery", () => {
  let dispose;
  let page;
  let fetchCatalog;

  beforeEach(() => {
    react.state = null;
    react.ref.current = null;
    vi.useFakeTimers();
    page = Object.assign(new EventTarget(), { visibilityState: "visible" });
    fetchCatalog = vi.fn();
    vi.stubGlobal("document", page);
    vi.stubGlobal("fetch", fetchCatalog);
  });

  afterEach(() => {
    dispose?.();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetches for the active account, refreshes after visibility changes, and polls while visible", async () => {
    fetchCatalog
      .mockResolvedValueOnce(catalogResponse("initial"))
      .mockResolvedValueOnce(catalogResponse("new-on-focus"))
      .mockResolvedValueOnce(catalogResponse("new-on-poll"))
      .mockRejectedValueOnce(new Error("offline"));
    useProviderModelCatalog("codex", connections);
    dispose = react.effect();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchCatalog).toHaveBeenCalledWith("/api/providers/active/models", expect.objectContaining({ cache: "no-store" }));
    expect(useProviderModelCatalog("codex", connections).liveModels[0].id).toBe("initial");

    page.visibilityState = "hidden";
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchCatalog).toHaveBeenCalledTimes(1);

    page.visibilityState = "visible";
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(useProviderModelCatalog("codex", connections).liveModels[0].id).toBe("new-on-focus");

    await vi.advanceTimersByTimeAsync(300_000);
    expect(useProviderModelCatalog("codex", connections).liveModels[0].id).toBe("new-on-poll");
    await vi.advanceTimersByTimeAsync(300_000);
    expect(useProviderModelCatalog("codex", connections).liveModels[0].id).toBe("new-on-poll");
    expect(useProviderModelCatalog("openai", connections).liveModels).toEqual([]);
  });

  it("stops refreshing when the models endpoint marks the provider unsupported", async () => {
    fetchCatalog.mockResolvedValue({
      ok: false,
      json: async () => ({ code: "MODELS_LIST_UNSUPPORTED" }),
    });
    useProviderModelCatalog("codex", connections);
    dispose = react.effect();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(fetchCatalog).toHaveBeenCalledTimes(1);
    expect(useProviderModelCatalog("codex", connections).canRefreshModels).toBe(false);
  });

  it("fetches immediately on demand and blocks overlapping clicks", async () => {
    let resolveManualFetch;
    fetchCatalog
      .mockResolvedValueOnce(catalogResponse("initial"))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveManualFetch = resolve; }));
    const { refreshModels } = useProviderModelCatalog("codex", connections);
    dispose = react.effect();
    await vi.advanceTimersByTimeAsync(0);

    const request = refreshModels();
    refreshModels();
    expect(fetchCatalog).toHaveBeenCalledTimes(2);
    expect(useProviderModelCatalog("codex", connections).fetchingModels).toBe(true);

    resolveManualFetch(catalogResponse("new-on-click"));
    await request;
    const catalog = useProviderModelCatalog("codex", connections);
    expect(catalog.fetchingModels).toBe(false);
    expect(catalog.liveModels[0].id).toBe("new-on-click");
  });

  it("merges new IDs while keeping static metadata and vendor namespaces", () => {
    const existing = { id: "stepfun/standard", name: "Standard", type: "llm" };
    const live = normalizeProviderModelCatalog("nous", [
      { id: "nous/stepfun/standard" },
      { id: "nous/stepfun/new", display_name: "New" },
      { id: "nous/stepfun/new" },
      { id: "nous/" },
      null,
    ]);
    expect(mergeProviderModelCatalog([existing], live)).toEqual([
      existing,
      { id: "stepfun/new", display_name: "New", name: "New" },
    ]);
  });
});
