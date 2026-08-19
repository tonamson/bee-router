"use client";

import Link from "next/link";
import { Card } from "@/shared/components";
import Image from "next/image";

/**
 * Clickable card for MITM tools — navigates to /dashboard/mitm on click.
 */
export default function MitmLinkCard({ tool }) {
  return (
    <Link href="/dashboard/mitm" className="group block">
      <Card
        padding="sm"
        className="overflow-hidden border-border/80 hover:border-purple-500/40 hover:shadow-[0_0_16px_rgba(168,85,247,0.1)] transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-surface-2 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src={tool.image}
                alt={tool.name}
                width={30}
                height={30}
                className="size-7 object-contain rounded-lg"
                sizes="30px"
                onError={(e) => { e.target.style.display = "none"; }}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-text-main group-hover:text-purple-400 transition-colors">{tool.name}</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">MITM</span>
              </div>
              <p className="text-xs text-text-muted truncate mt-0.5">{tool.description}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-text-subtle group-hover:text-purple-400 group-hover:translate-x-0.5 text-[18px] shrink-0 transition-all">
            chevron_right
          </span>
        </div>
      </Card>
    </Link>
  );
}
