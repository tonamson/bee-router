"use client";

import Link from "next/link";
import Image from "next/image";
import { Card } from "@/shared/components";

// Derive simple connected/configured/not-installed status from API payload
function getStatus(status) {
  if (!status) return { label: "Unknown", cls: "bg-surface-2 text-text-muted border-border/40", dot: "bg-text-subtle" };
  if (!status.installed) return { label: "Not installed", cls: "bg-surface-2 text-text-muted border-border/40", dot: "bg-text-subtle/60" };
  if (status.hasBeeRouter) return { label: "Connected", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" };
  return { label: "Ready to configure", cls: "bg-brand-500/10 text-brand-400 border-brand-500/20", dot: "bg-brand-400 shadow-[0_0_6px_rgba(255,199,0,0.8)]" };
}

export default function ToolSummaryCard({ toolId, tool, status }) {
  const s = getStatus(status);
  return (
    <Link href={`/dashboard/cli-tools/${toolId}`} className="group block">
      <Card
        padding="sm"
        className="h-full overflow-hidden border-border/80 hover:border-brand-500/40 hover:shadow-[0_0_16px_rgba(255,199,0,0.08)] transition-all duration-200 cursor-pointer"
      >
        <div className="flex h-full flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-surface-2 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {tool.image ? (
                <Image src={tool.image} alt={tool.name} width={30} height={30} className="size-7 object-contain rounded-lg" sizes="30px" onError={(e) => { e.target.style.display = "none"; }} loading="lazy" decoding="async" />
              ) : tool.icon ? (
                <span className="material-symbols-outlined text-[24px]" style={{ color: tool.color }}>{tool.icon}</span>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate text-text-main group-hover:text-brand-400 transition-colors">{tool.name}</h3>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${s.cls}`}>
                  <span className={`size-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-text-subtle group-hover:text-brand-400 group-hover:translate-x-0.5 text-[18px] shrink-0 transition-all">
              chevron_right
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
