"use client";

import { useState, useEffect, useRef } from "react";
import { Card, Button } from "@/shared/components";
import { CONSOLE_LOG_CONFIG } from "@/shared/constants/config";

const LOG_LEVEL_COLORS = {
  LOG: "text-green-400",
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
  DEBUG: "text-purple-400",
};

function colorLine(line) {
  const match = line.match(/\[(\w+)\]/g);
  const levelTag = match ? match[1]?.replace(/\[|\]/g, "") : null;
  const color = LOG_LEVEL_COLORS[levelTag] || "text-green-400";
  return <span className={color}>{line}</span>;
}

export default function ConsoleLogClient() {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const logRef = useRef(null);

  const handleClear = async () => {
    try {
      await fetch("/api/translator/console-logs", { method: "DELETE" });
      // UI cleared via SSE "clear" event
    } catch (err) {
      console.error("Failed to clear console logs:", err);
    }
  };

  useEffect(() => {
    const es = new EventSource("/api/translator/console-logs/stream");

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "init") {
        setLogs(msg.logs.slice(-CONSOLE_LOG_CONFIG.maxLines));
      } else if (msg.type === "line") {
        setLogs((prev) => {
          const next = [...prev, msg.line];
          return next.length > CONSOLE_LOG_CONFIG.maxLines ? next.slice(-CONSOLE_LOG_CONFIG.maxLines) : next;
        });
      } else if (msg.type === "lines") {
        setLogs((prev) => {
          const next = [...prev, ...msg.lines];
          return next.length > CONSOLE_LOG_CONFIG.maxLines ? next.slice(-CONSOLE_LOG_CONFIG.maxLines) : next;
        });
      } else if (msg.type === "clear") {
        setLogs([]);
      }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/80 bg-surface/80 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0 shadow-[0_0_15px_rgba(255,199,0,0.15)]">
            <span className="material-symbols-outlined text-[22px]">terminal</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-main">Live Gateway Console Stream</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 border ${
                connected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}>
                <span className={`size-1.5 rounded-full ${
                  connected
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse"
                    : "bg-amber-400 animate-ping"
                }`} />
                {connected ? "SSE Stream Connected" : "Reconnecting..."}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Real-time stdout/stderr stream from translator engine and reverse proxy router.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button size="sm" variant="outline" icon="delete" onClick={handleClear}>
            Clear Logs
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border/80 p-0">
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2/60 border-b border-border/70 text-xs font-mono text-text-muted">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-red-500/60" />
            <span className="size-2.5 rounded-full bg-yellow-500/60" />
            <span className="size-2.5 rounded-full bg-green-500/60" />
            <span className="ml-2 text-text-muted">console.log stream · {logs.length} lines</span>
          </div>
        </div>
        <div
          ref={logRef}
          className="bg-[#0D0E12] p-4 text-xs font-mono h-[calc(100vh-280px)] min-h-[400px] overflow-y-auto selection:bg-brand-500/30 selection:text-white"
        >
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-muted/60 italic text-xs">
              Waiting for incoming log stream...
            </div>
          ) : (
            <div className="space-y-1 leading-relaxed">
              {logs.map((line, i) => (
                <div key={i} className="hover:bg-white/[0.03] px-1 py-0.5 rounded transition-colors">{colorLine(line)}</div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
