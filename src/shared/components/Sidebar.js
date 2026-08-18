"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import Button from "./Button";
import { ConfirmModal } from "./Modal";

// const VISIBLE_MEDIA_KINDS = ["embedding", "image", "imageToText", "tts", "stt", "webSearch", "webFetch", "video", "music"];
const VISIBLE_MEDIA_KINDS = ["embedding", "image", "video", "tts", "stt"];
// Combined entry: webSearch + webFetch share one page at /dashboard/media-providers/web
const COMBINED_WEB_ITEM = { id: "web", label: "Web Fetch & Search", icon: "travel_explore", href: "/dashboard/media-providers/web" };

const navItems = [
  { href: "/dashboard/endpoint", label: "Endpoint & Keys", icon: "key" },
  { href: "/dashboard/providers", label: "Providers", icon: "dns" },
  { href: "/dashboard/combos", label: "Combos & Routing", icon: "layers" },
  { href: "/dashboard/usage", label: "Usage & Stats", icon: "bar_chart" },
  { href: "/dashboard/quota", label: "Quota Tracker", icon: "data_usage" },
  { href: "/dashboard/token-saver", label: "Token Saver", icon: "savings" },
  { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal" },
];

const debugItems = [
  { href: "/dashboard/console-log", label: "Console Log", icon: "dvr" },
  { href: "/dashboard/translator", label: "Translator", icon: "translate" },
];

const systemItems = [
  { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan" },
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(pathname.startsWith("/dashboard/analytics"));
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.enableTranslator) setEnableTranslator(true);
      })
      .catch(() => {});
  }, []);

  // Lazy check for new npm version on mount
  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasUpdate) setUpdateInfo(data);
      })
      .catch(() => {});
  }, []);

  const isActive = (href) => {
    if (href === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  // Open manual update panel (no countdown yet — user must click Copy to trigger shutdown)
  const handleUpdate = () => {
    setShowUpdateModal(false);
    setIsUpdating(true);
  };

  // Triggered by Copy button inside ManualUpdatePanel: copy + countdown + shutdown
  const handleCopyAndShutdown = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
    } catch {
      /* clipboard blocked */
    }
    copy(INSTALL_CMD);
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
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false);
    setShutdownCountdown(0);
  };

  return (
    <>
      <aside className="flex w-72 flex-col border-r border-border-subtle bg-vibrancy backdrop-blur-xl transition-colors duration-300 min-h-full">
        {/* Traffic lights */}
        <div className="flex items-center gap-2 px-6 pt-5 pb-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>

        {/* Brand Header */}
        <div className="px-5 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              {/* BeeRouter Logo */}
              <div className="relative flex items-center justify-center size-9 transition-transform duration-200 group-hover:scale-105">
                <Image
                  src="/logo.png?v=2"
                  alt="BeeRouter Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-text-main group-hover:text-brand-500 transition-colors">
                    {APP_CONFIG.name}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-text-muted">v{APP_CONFIG.version}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {updateInfo && (
            <div className="flex flex-col gap-1.5 rounded-lg p-2 bg-brand-500/10 border border-brand-500/20 mt-1">
              <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                ↑ Update available: v{updateInfo.latestVersion}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="px-2 py-1 rounded bg-brand-500 hover:bg-brand-400 text-black text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Update now
                </button>
                <button
                  onClick={() => copy(INSTALL_CMD)}
                  title="Copy install command"
                  className="flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer min-w-0"
                >
                  <code className="block text-[10px] text-brand-600/80 dark:text-brand-400/80 font-mono truncate">
                    {copied ? "✓ copied!" : INSTALL_CMD}
                  </code>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-r-lg transition-all group border-l-2",
                isActive(item.href)
                  ? "bg-primary/10 text-primary border-primary font-medium shadow-[inset_2px_0_8px_rgba(255,199,0,0.12)]"
                  : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  isActive(item.href) ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                )}
              >
                {item.icon}
              </span>
              <span className="text-[13px]">{item.label}</span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setAnalyticsOpen((v) => !v)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-r-lg transition-all group border-l-2",
              pathname.startsWith("/dashboard/analytics")
                ? "bg-primary/10 text-primary border-primary font-medium shadow-[inset_2px_0_8px_rgba(255,199,0,0.12)]"
                : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined text-[18px]",
                pathname.startsWith("/dashboard/analytics") ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
              )}
            >
              insights
            </span>
            <span className="text-[13px] flex-1 text-left">Analytics</span>
            <span
              className="material-symbols-outlined text-[14px] transition-transform"
              style={{ transform: analyticsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              expand_more
            </span>
          </button>
          {analyticsOpen && (
            <div className="pl-4 space-y-0.5 mt-0.5">
              <Link
                href="/dashboard/analytics/keys"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-r-lg transition-all group border-l-2",
                  pathname.startsWith("/dashboard/analytics/keys")
                    ? "bg-primary/10 text-primary border-primary font-medium"
                    : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[16px]",
                    pathname.startsWith("/dashboard/analytics/keys") ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                  )}
                >
                  key
                </span>
                <span className="text-xs">API Keys</span>
              </Link>
              <Link
                href="/dashboard/analytics/token-save"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-r-lg transition-all group border-l-2",
                  pathname.startsWith("/dashboard/analytics/token-save")
                    ? "bg-primary/10 text-primary border-primary font-medium"
                    : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[16px]",
                    pathname.startsWith("/dashboard/analytics/token-save") ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                  )}
                >
                  savings
                </span>
                <span className="text-xs">Token Save</span>
              </Link>
              <Link
                href="/dashboard/analytics/pricing"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-r-lg transition-all group border-l-2",
                  pathname.startsWith("/dashboard/analytics/pricing")
                    ? "bg-primary/10 text-primary border-primary font-medium"
                    : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[16px]",
                    pathname.startsWith("/dashboard/analytics/pricing") ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                  )}
                >
                  attach_money
                </span>
                <span className="text-xs">Pricing</span>
              </Link>
            </div>
          )}

          {/* System section */}
          <div className="pt-3 mt-2 space-y-0.5">
            <p className="px-3 text-[11px] font-bold text-text-muted/60 uppercase tracking-wider mb-2">
              System
            </p>

            {/* Media Providers accordion */}
            <button
              onClick={() => setMediaOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-r-lg transition-all group border-l-2",
                pathname.startsWith("/dashboard/media-providers")
                  ? "bg-primary/10 text-primary border-primary font-medium shadow-[inset_2px_0_8px_rgba(255,199,0,0.12)]"
                  : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  pathname.startsWith("/dashboard/media-providers") ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                )}
              >
                perm_media
              </span>
              <span className="text-[13px] flex-1 text-left">Media Providers</span>
              <span
                className="material-symbols-outlined text-[14px] transition-transform"
                style={{ transform: mediaOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                expand_more
              </span>
            </button>
            {mediaOpen && (
              <div className="pl-4 space-y-0.5 mt-0.5">
                {MEDIA_PROVIDER_KINDS.filter((k) => VISIBLE_MEDIA_KINDS.includes(k.id)).map((kind) => (
                  <Link
                    key={kind.id}
                    href={`/dashboard/media-providers/${kind.id}`}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-r-lg transition-all group border-l-2",
                      pathname.startsWith(`/dashboard/media-providers/${kind.id}`)
                        ? "bg-primary/10 text-primary border-primary font-medium"
                        : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
                    )}
                  >
                    <span
                      className={cn(
                        "material-symbols-outlined text-[16px]",
                        pathname.startsWith(`/dashboard/media-providers/${kind.id}`) ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                      )}
                    >
                      {kind.icon}
                    </span>
                    <span className="text-xs">{kind.label}</span>
                  </Link>
                ))}
                <Link
                  key={COMBINED_WEB_ITEM.id}
                  href={COMBINED_WEB_ITEM.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-r-lg transition-all group border-l-2",
                    pathname.startsWith(COMBINED_WEB_ITEM.href)
                      ? "bg-primary/10 text-primary border-primary font-medium"
                      : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-[16px]",
                      pathname.startsWith(COMBINED_WEB_ITEM.href) ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                    )}
                  >
                    {COMBINED_WEB_ITEM.icon}
                  </span>
                  <span className="text-xs">{COMBINED_WEB_ITEM.label}</span>
                </Link>
              </div>
            )}

            {systemItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-r-lg transition-all group border-l-2",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary border-primary font-medium shadow-[inset_2px_0_8px_rgba(255,199,0,0.12)]"
                    : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[18px]",
                    isActive(item.href) ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                  )}
                >
                  {item.icon}
                </span>
                <span className="text-[13px]">{item.label}</span>
              </Link>
            ))}

            {/* Debug items (inside System section, before Settings) */}
            {debugItems.map((item) => {
              const show = item.href !== "/dashboard/translator" || enableTranslator;
              return show ? (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-r-lg transition-all group border-l-2",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary border-primary font-medium shadow-[inset_2px_0_8px_rgba(255,199,0,0.12)]"
                      : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-[18px]",
                      isActive(item.href) ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[13px]">{item.label}</span>
                </Link>
              ) : null;
            })}

            {/* Settings */}
            <Link
              href="/dashboard/profile"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-r-lg transition-all group border-l-2",
                isActive("/dashboard/profile")
                  ? "bg-primary/10 text-primary border-primary font-medium shadow-[inset_2px_0_8px_rgba(255,199,0,0.12)]"
                  : "border-transparent text-text-muted hover:bg-surface-2 hover:text-text-main"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  isActive("/dashboard/profile") ? "fill-1 text-primary" : "group-hover:text-primary transition-colors"
                )}
              >
                settings
              </span>
              <span className="text-[13px]">Settings</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Update Confirmation Modal */}
      <ConfirmModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onConfirm={handleUpdate}
        title={`Update ${APP_CONFIG.name}`}
        message={`Show install command for v${updateInfo?.latestVersion || ""}? You can copy it and shutdown to install manually.`}
        confirmText="Show Command"
        cancelText="Cancel"
        variant="primary"
      />

      {/* Disconnected / Updating Overlay */}
      {(isDisconnected || isUpdating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          {isUpdating ? (
            <ManualUpdatePanel
              latestVersion={updateInfo?.latestVersion}
              installCmd={INSTALL_CMD}
              copied={copied}
              onCopyAndShutdown={handleCopyAndShutdown}
              onCancel={handleCancelUpdate}
              countdown={shutdownCountdown}
              isDisconnected={isDisconnected}
            />
          ) : (
            <div className="text-center p-8">
              <div className="flex items-center justify-center size-16 rounded-full bg-red-500/20 text-red-500 mx-auto mb-4 border border-red-500/30">
                <span className="material-symbols-outlined text-[32px]">power_off</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Server Disconnected</h2>
              <p className="text-text-muted mb-6">The proxy server has been stopped.</p>
              <Button variant="secondary" onClick={() => globalThis.location.reload()}>
                Reload Page
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};

function ManualUpdatePanel({
  latestVersion,
  installCmd,
  copied,
  onCopyAndShutdown,
  onCancel,
  countdown,
  isDisconnected,
}) {
  const isCountingDown = countdown > 0;
  return (
    <div className="w-full max-w-lg rounded-xl bg-neutral-900/95 border border-white/10 p-6 text-white shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center size-11 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
          <span className="material-symbols-outlined text-[24px]">content_copy</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            Update {APP_CONFIG.name}
            {latestVersion ? ` to v${latestVersion}` : ""}
          </h2>
          <p className="text-xs text-white/60">
            {isDisconnected
              ? "Server stopped. Paste the command into a terminal to install."
              : isCountingDown
                ? `Command copied. Server will stop in ${countdown}s...`
                : "Click the button below to copy the install command and shutdown."}
          </p>
        </div>
      </div>

      <p className="text-sm text-white/80 mb-2">Install command:</p>
      <div className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 mb-4">
        <code className="text-xs font-mono text-brand-400 break-all">{installCmd}</code>
      </div>

      <ol className="text-xs text-white/70 space-y-1.5 list-decimal list-inside mb-4">
        <li>
          Click <strong>Copy & Shutdown</strong> below.
        </li>
        <li>Paste the command into your terminal and press Enter.</li>
        <li>
          Run <code className="px-1.5 py-0.5 rounded bg-white/10 text-brand-400 font-mono">bee-router</code> again after install.
        </li>
      </ol>

      {isDisconnected ? (
        <Button variant="secondary" fullWidth onClick={() => globalThis.location.reload()}>
          Reload Page
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isCountingDown}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth onClick={onCopyAndShutdown} disabled={isCountingDown}>
            {copied
              ? "✓ Copied — shutting down..."
              : isCountingDown
                ? `Shutting down in ${countdown}s`
                : "Copy & Shutdown"}
          </Button>
        </div>
      )}
    </div>
  );
}

ManualUpdatePanel.propTypes = {
  latestVersion: PropTypes.string,
  installCmd: PropTypes.string.isRequired,
  copied: PropTypes.bool,
  onCopyAndShutdown: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  countdown: PropTypes.number,
  isDisconnected: PropTypes.bool,
};

