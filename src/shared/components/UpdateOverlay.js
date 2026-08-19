"use client";

import PropTypes from "prop-types";
import { Copy, Power } from "@phosphor-icons/react";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import Button from "./Button";
import { ConfirmModal } from "./Modal";

export default function UpdateOverlay({
  updateInfo,
  isUpdating,
  isDisconnected,
  shutdownCountdown,
  onCopyAndShutdown,
  onCancel,
  showConfirm,
  onCloseConfirm,
  onConfirmUpdate,
}) {
  const { copied, copy } = useCopyToClipboard(2000);
  const installCmd = UPDATER_CONFIG.installCmdLatest;

  const handleCopyAndShutdown = async () => {
    copy(installCmd);
    await onCopyAndShutdown?.();
  };

  return (
    <>
      <ConfirmModal
        isOpen={!!showConfirm}
        onClose={onCloseConfirm}
        onConfirm={onConfirmUpdate}
        title={`Update ${APP_CONFIG.name}`}
        message={`Show install command for v${updateInfo?.latestVersion || ""}? You can copy it and shutdown to install manually.`}
        confirmText="Show Command"
        cancelText="Cancel"
        variant="primary"
      />

      {(isDisconnected || isUpdating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          {isUpdating ? (
            <ManualUpdatePanel
              latestVersion={updateInfo?.latestVersion}
              installCmd={installCmd}
              copied={copied}
              onCopyAndShutdown={handleCopyAndShutdown}
              onCancel={onCancel}
              countdown={shutdownCountdown}
              isDisconnected={isDisconnected}
            />
          ) : (
            <div className="text-center p-8">
              <div className="flex items-center justify-center size-16 rounded-full bg-red-500/20 text-red-500 mx-auto mb-4 border border-red-500/30">
                <Power size={32} />
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

UpdateOverlay.propTypes = {
  updateInfo: PropTypes.shape({
    hasUpdate: PropTypes.bool,
    latestVersion: PropTypes.string,
  }),
  isUpdating: PropTypes.bool,
  isDisconnected: PropTypes.bool,
  shutdownCountdown: PropTypes.number,
  onCopyAndShutdown: PropTypes.func,
  onCancel: PropTypes.func,
  showConfirm: PropTypes.bool,
  onCloseConfirm: PropTypes.func,
  onConfirmUpdate: PropTypes.func,
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
          <Copy size={24} />
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
