"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeProviderModelCatalog } from "../utils/providerModelCatalog.js";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 30 * 1000;
const EMPTY_MODELS = [];

export function useProviderModelCatalog(providerId, connections) {
  const connectionId = connections.find(
    (connection) => connection.provider === providerId && connection.isActive !== false
  )?.id;
  const [catalog, setCatalog] = useState(null);
  const refreshRef = useRef(null);

  useEffect(() => {
    if (!connectionId) return;

    let disposed = false;
    let unsupported = false;
    let pending;

    const update = (changes) => {
      setCatalog((previous) => ({
        models: EMPTY_MODELS,
        ...(previous?.providerId === providerId && previous?.connectionId === connectionId ? previous : null),
        providerId,
        connectionId,
        ...changes,
      }));
    };

    const refresh = async () => {
      if (disposed || unsupported || pending || document.visibilityState !== "visible") return;

      const controller = new AbortController();
      pending = controller;
      update({ loading: true, warning: null, unsupported: false });
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`/api/providers/${encodeURIComponent(connectionId)}/models`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (disposed) return;
        if (data?.code === "MODELS_LIST_UNSUPPORTED") {
          unsupported = true;
          update({ loading: false, unsupported: true });
          return;
        }
        const models = response.ok && !data?.warning && Array.isArray(data?.models)
          ? normalizeProviderModelCatalog(providerId, data.models)
          : null;
        update({
          loading: false,
          ...(models && { models }),
          warning: data?.warning || data?.error || (models?.length ? null : "Provider returned no live models."),
        });
      } catch {
        if (!disposed) update({ loading: false, warning: "Failed to reach the provider model catalog." });
      } finally {
        clearTimeout(timeout);
        pending = null;
      }
    };

    refreshRef.current = refresh;
    const initialRefresh = setTimeout(refresh, 0);
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      refreshRef.current = null;
      clearTimeout(initialRefresh);
      clearInterval(interval);
      pending?.abort();
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [providerId, connectionId, connections]);

  const current = catalog?.providerId === providerId && catalog?.connectionId === connectionId ? catalog : null;
  return {
    liveModels: current?.models ?? EMPTY_MODELS,
    liveModelsError: current?.warning,
    canRefreshModels: Boolean(connectionId && !current?.unsupported),
    fetchingModels: Boolean(current?.loading),
    refreshModels: () => refreshRef.current?.(),
  };
}
