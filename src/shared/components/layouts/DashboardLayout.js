"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle, Info, Warning, X, XCircle } from "@phosphor-icons/react";
import { UPDATER_CONFIG } from "@/shared/constants/config";
import { useNotificationStore } from "@/store/notificationStore";
import Header from "../Header";
import UpdateOverlay from "../UpdateOverlay";

function getToastStyle(type) {
  if (type === "success") {
    return {
      wrapper: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
      Icon: CheckCircle,
    };
  }
  if (type === "error") {
    return {
      wrapper: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
      Icon: XCircle,
    };
  }
  if (type === "warning") {
    return {
      wrapper: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      Icon: Warning,
    };
  }
  return {
    wrapper: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Icon: Info,
  };
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((data) => { if (data.hasUpdate) setUpdateInfo(data); })
      .catch(() => {});
  }, []);

  async function onCopyAndShutdown() {
    let remaining = UPDATER_CONFIG.shutdownCountdownSec;
    setShutdownCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setShutdownCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        fetch("/api/version/shutdown", { method: "POST" }).catch(() => {});
        setIsDisconnected(true);
      }
    }, 1000);
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg">
      <div className="fixed top-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        {notifications.map((n) => {
          const style = getToastStyle(n.type);
          const ToastIcon = style.Icon;
          return (
            <div
              key={n.id}
              className={`rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm ${style.wrapper}`}
            >
              <div className="flex items-start gap-2">
                <ToastIcon size={18} className="shrink-0 leading-5" />
                <div className="min-w-0 flex-1">
                  {n.title ? <p className="text-xs font-semibold mb-0.5">{n.title}</p> : null}
                  <p className="text-xs whitespace-pre-wrap break-words">{n.message}</p>
                </div>
                {n.dismissible ? (
                  <button
                    type="button"
                    onClick={() => removeNotification(n.id)}
                    className="text-current/70 hover:text-current"
                    aria-label="Dismiss notification"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <Header
        updateInfo={updateInfo}
        onRequestUpdate={() => setShowUpdateModal(true)}
      />
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${pathname === "/dashboard/basic-chat" ? "" : "p-6 lg:p-10"}`}>
          <div className={pathname === "/dashboard/basic-chat" ? "flex-1 w-full h-full flex flex-col" : "w-full"}>
            {children}
          </div>
        </div>
      </main>
      <UpdateOverlay
        updateInfo={updateInfo}
        isUpdating={isUpdating}
        isDisconnected={isDisconnected}
        shutdownCountdown={shutdownCountdown}
        onCopyAndShutdown={onCopyAndShutdown}
        onCancel={() => { setIsUpdating(false); setShutdownCountdown(0); }}
        showConfirm={showUpdateModal}
        onCloseConfirm={() => setShowUpdateModal(false)}
        onConfirmUpdate={() => { setShowUpdateModal(false); setIsUpdating(true); }}
      />
    </div>
  );
}
