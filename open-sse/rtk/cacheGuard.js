// Shared guards for token savers.

export function hasCacheControl(obj) {
  return !!(obj && typeof obj === "object" && obj.cache_control != null);
}
