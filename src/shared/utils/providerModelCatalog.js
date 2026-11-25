const ROUTED_MODEL_PREFIXES = new Map([
  ["gemini", "models/"],
  ["nous", "nous/"],
  ["qoder", "qoder/"],
  ["qoder-cn", "qoder-cn/"],
]);

export function normalizeProviderModelCatalog(providerId, models) {
  const byId = new Map();
  const prefix = ROUTED_MODEL_PREFIXES.get(providerId);

  for (const model of Array.isArray(models) ? models : []) {
    const rawId = model?.id || model?.model || model?.name;
    if (typeof rawId !== "string") continue;
    const id = (prefix && rawId.startsWith(prefix) ? rawId.slice(prefix.length) : rawId).trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, { ...model, id, name: model.display_name || model.displayName || model.name || id });
  }

  return [...byId.values()];
}

export function mergeProviderModelCatalog(staticModels, liveModels) {
  const staticIds = new Set(staticModels.map((model) => model.id));
  return [...staticModels, ...liveModels.filter((model) => !staticIds.has(model.id))];
}
