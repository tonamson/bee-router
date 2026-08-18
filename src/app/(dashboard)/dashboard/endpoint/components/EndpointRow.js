"use client";

import { Input } from "@/shared/components";

/** Reusable endpoint row component */
export default function EndpointRow({ label, url, copyId, copied, onCopy, badge, actions }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md shrink-0 min-w-[96px] bg-black/40 dark:bg-black/60 border border-brand-500/30 text-brand-400 font-semibold shadow-[0_0_8px_rgba(255,199,0,0.1)]">
        <span className="size-1.5 rounded-full bg-brand-500 shadow-[0_0_6px_rgba(255,199,0,0.8)]" />
        {label}
      </span>
      <Input value={url} readOnly className="flex-1 font-mono text-sm bg-surface-2/60 border-border/80" />
      <button
        onClick={() => onCopy(url, copyId)}
        className="p-2 hover:bg-brand-500/10 rounded-lg text-text-muted hover:text-brand-400 transition-colors shrink-0"
        title="Copy endpoint URL"
      >
        <span className="material-symbols-outlined text-[18px]">{copied === copyId ? "check" : "content_copy"}</span>
      </button>
      {actions}
    </div>
  );
}
