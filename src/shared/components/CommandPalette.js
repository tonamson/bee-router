"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, ArrowRight } from "@phosphor-icons/react";
import { useTheme } from "@/shared/hooks/useTheme";
import {
  PALETTE_ACTIONS,
  filterPaletteItems,
  getPaletteItems,
} from "@/shared/constants/adminNav";

const RECENT_KEY = "bee-router.palette.recent";

function readRecents() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((h) => typeof h === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function pushRecent(href) {
  const next = [href, ...readRecents().filter((h) => h !== href)].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function CommandPalette({
  open,
  onClose,
  enableTranslator = false,
  onLogout,
  onOpenChangelog,
}) {
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(
    () => getPaletteItems({ enableTranslator }),
    [enableTranslator]
  );
  const filtered = useMemo(() => filterPaletteItems(items, query), [items, query]);
  const recents = useMemo(() => {
    if (query.trim()) return [];
    const hrefs = readRecents();
    return hrefs
      .map((href) => items.find((i) => i.href === href))
      .filter(Boolean);
  }, [items, query, open]);

  const recentHrefs = new Set(recents.map((i) => i.href));
  const rows = query.trim()
    ? filtered.map((i) => ({ kind: "nav", ...i }))
    : [
        ...recents.map((i) => ({ kind: "recent", ...i })),
        ...filtered
          .filter((i) => !recentHrefs.has(i.href))
          .map((i) => ({ kind: "nav", ...i })),
      ];

  const actionRows = PALETTE_ACTIONS.map((a) => ({ kind: "action", id: a.id, label: a.label }));
  const list = query.trim()
    ? [...rows, ...actionRows.filter((a) => a.label.toLowerCase().includes(query.trim().toLowerCase()))]
    : [...rows, ...actionRows];

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(list.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = list[active];
        if (row) choose(row);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list, active, onClose]);

  function choose(row) {
    if (row.kind === "action") {
      if (row.id === "theme") toggleTheme();
      if (row.id === "copy-base-url") navigator.clipboard?.writeText(window.location.origin);
      if (row.id === "changelog") onOpenChangelog?.();
      if (row.id === "logout") onLogout?.();
      onClose();
      return;
    }
    pushRecent(row.href);
    router.push(row.href);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4">
      <button type="button" className="absolute inset-0 bg-bg/60" aria-label="Close search" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative w-full max-w-[560px] rounded-[8px] border border-border bg-surface shadow-[var(--shadow-soft)]"
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-3">
          <MagnifyingGlass size={18} className="text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search"
            className="h-12 w-full bg-transparent text-sm text-text-main outline-none"
          />
        </div>
        <ul className="max-h-[360px] overflow-y-auto py-1">
          {list.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-text-muted">No match</li>
          ) : (
            list.map((row, i) => (
              <li key={row.href || row.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(row)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    i === active ? "bg-surface-3" : ""
                  }`}
                >
                  <span>
                    {row.kind !== "action" && (
                      <span className="mr-2 text-[11px] text-text-muted">{row.groupLabel}</span>
                    )}
                    {row.label}
                  </span>
                  {row.kind !== "action" && <ArrowRight size={14} className="text-text-subtle" />}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
