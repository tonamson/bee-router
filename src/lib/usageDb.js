// Shim → re-export from new SQLite-based DB layer (src/lib/db/)
export {
  statsEmitter, trackPendingRequest, getActiveRequests,
  saveRequestUsage, getUsageHistory, getUsageStats, getUsageStatsForApiKey, getChartData,
  getUsageHistoryForApiKey,
  appendRequestLog, getRecentLogs, clearAllUsage, clearUsageByApiKey,
  saveRequestDetail, getRequestDetails, getRequestDetailById,
} from "@/lib/db/index.js";
