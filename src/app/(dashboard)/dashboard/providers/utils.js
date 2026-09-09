export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "none", label: "No connection" },
];

// noAuth providers (e.g. free proxies) are always usable even though they
// never have a stored connection record, so they never fall into "none".
export function getConnectionStatus(stats, isNoAuth = false) {
  if (isNoAuth) return "active";
  if (!stats || stats.total === 0) return "none";
  return stats.allDisabled ? "inactive" : "active";
}

export function matchesStatusFilter(statusFilter, stats, isNoAuth = false) {
  if (!statusFilter || statusFilter === "all") return true;
  const status = getConnectionStatus(stats, isNoAuth);
  if (statusFilter === "connected") return status === "active" || status === "inactive";
  if (statusFilter === "disconnected") return status === "none";
  return status === statusFilter;
}

export function filterProvidersByStatus(providers = [], filter = "all") {
  if (!filter || filter === "all") return providers;
  return providers.filter((p) => matchesStatusFilter(filter, p?.stats || p, p?.noAuth));
}
