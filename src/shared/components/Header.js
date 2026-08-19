"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PropTypes from "prop-types";
import { CaretDown, List, MagnifyingGlass, User } from "@phosphor-icons/react";
import HeaderMenu from "@/shared/components/HeaderMenu";
import HeaderLanguage from "@/shared/components/HeaderLanguage";
import ThemeToggle from "@/shared/components/ThemeToggle";
import CommandPalette from "@/shared/components/CommandPalette";
import ChangelogModal from "@/shared/components/ChangelogModal";
import { OAUTH_PROVIDERS, APIKEY_PROVIDERS, APP_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS, AI_PROVIDERS } from "@/shared/constants/providers";
import { ADMIN_NAV_GROUPS, getActiveGroupId } from "@/shared/constants/adminNav";
import { translate } from "@/i18n/runtime";

const getPageInfo = (pathname) => {
  if (!pathname) return { title: "", description: "" };

  const mediaDetailMatch = pathname.match(/\/media-providers\/([^/]+)\/([^/]+)$/);
  if (mediaDetailMatch) {
    const providerId = mediaDetailMatch[2];
    const provider = AI_PROVIDERS[providerId];
    return {
      title: provider?.name || providerId,
      description: "",
    };
  }

  const mediaKindMatch = pathname.match(/\/media-providers\/([^/]+)$/);
  if (mediaKindMatch) {
    const kindId = mediaKindMatch[1];
    const kindConfig = MEDIA_PROVIDER_KINDS.find((k) => k.id === kindId);
    return {
      title: kindConfig?.label || kindId,
      description: `Manage your ${kindConfig?.label || kindId} providers`,
    };
  }

  const providerMatch = pathname.match(/\/providers\/([^/]+)$/);
  if (providerMatch) {
    const providerId = providerMatch[1];
    const providerInfo = OAUTH_PROVIDERS[providerId] || APIKEY_PROVIDERS[providerId];
    if (providerInfo) {
      return {
        title: providerInfo.name,
        description: "",
      };
    }
  }

  if (pathname.includes("/providers") && !pathname.includes("/media-providers"))
    return {
      title: "Providers",
      description: "Manage your AI provider connections",
    };
  if (pathname.includes("/combos"))
    return {
      title: "Combos & Routing",
      description: "Model combos and smart routing fallback",
    };
  if (pathname.match(/\/analytics\/keys\/[^/]+/))
    return {
      title: "API Key usage",
      description: "Requests, tokens, cost, and breakdown for one key",
    };
  if (pathname.includes("/analytics/keys"))
    return {
      title: "API Key analytics",
      description: "Compare usage across gateway API keys",
    };
  if (pathname.includes("/analytics/token-save"))
    return {
      title: "Token Save",
      description: "Payload cut vs provider cache-read — two separate meters",
    };
  if (pathname.includes("/analytics/pricing"))
    return {
      title: "Pricing",
      description: "Input / output rates for cost estimates",
    };
  if (pathname.includes("/analytics"))
    return {
      title: "Analytics",
      description: "Compression and cost analytics",
    };
  if (pathname.includes("/usage"))
    return {
      title: "Usage & Stats",
      description: "Monitor your API usage, token consumption, and request logs",
    };
  if (pathname.includes("/auth-files"))
    return {
      title: "Auth Files",
      description: "Map provider credentials stored in the local database",
    };
  if (pathname.includes("/quota"))
    return {
      title: "Quota Tracker",
      description: "Track and manage your API quota limits",
    };
  if (pathname.includes("/mitm"))
    return {
      title: "MITM Proxy",
      description: `Intercept CLI tool traffic and route through ${APP_CONFIG.name}`,
    };
  if (pathname.includes("/token-saver"))
    return {
      title: "Token Saver",
      description: "Compress prompts and outputs to save tokens",
    };
  if (pathname.includes("/cli-tools"))
    return {
      title: "CLI Tools",
      description: "Configure CLI tools",
    };
  if (pathname.includes("/proxy-pools"))
    return {
      title: "Proxy Pools",
      description: "Manage your proxy pool configurations",
    };
  if (pathname.includes("/skills"))
    return {
      title: "Agent Skills",
      description: `Copy a link and paste to your AI to use ${APP_CONFIG.name} — no install needed`,
    };
  if (pathname.includes("/endpoint"))
    return {
      title: "Endpoint & Keys",
      description: "API endpoint and gateway keys configuration",
    };
  if (pathname.includes("/profile"))
    return {
      title: "Settings",
      description: "Manage your preferences",
    };
  if (pathname.includes("/translator"))
    return {
      title: "Translator",
      description: "Debug translation flow between formats",
    };
  if (pathname.includes("/console-log"))
    return {
      title: "Console Log",
      description: "Live server console output",
    };
  if (pathname === "/dashboard")
    return {
      title: "Endpoint & Keys",
      description: "API endpoint and gateway keys configuration",
    };
  return { title: "", description: "" };
};

function isNavCurrent(pathname, href) {
  if (href === "/dashboard/endpoint" && pathname === "/dashboard") return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hoverOpenDelayMs() {
  if (typeof window === "undefined") return 120;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 120;
}

function visibleItems(group, enableTranslator) {
  return group.items.filter((item) => item.flag !== "translator" || enableTranslator);
}

function menuItemsOf(root) {
  return root ? Array.from(root.querySelectorAll('[role="menuitem"]')) : [];
}

function GroupMenu({ group, pathname, enableTranslator }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const timerRef = useRef(null);
  const active = getActiveGroupId(pathname) === group.id;
  const items = visibleItems(group, enableTranslator);

  function closeMenu({ restore = false } = {}) {
    setOpen(false);
    if (restore) triggerRef.current?.focus();
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (document.activeElement === triggerRef.current) {
      menuItemsOf(menuRef.current)[0]?.focus();
    }

    function onKey(e) {
      const menuitems = menuItemsOf(menuRef.current);
      const inside = wrapRef.current?.contains(document.activeElement);

      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu({ restore: inside });
        return;
      }

      if (!inside) return;

      if (e.key === "Tab") {
        if (!menuitems.length) return;
        e.preventDefault();
        const i = menuitems.indexOf(document.activeElement);
        const next = e.shiftKey
          ? (i <= 0 ? menuitems.length - 1 : i - 1)
          : (i === -1 || i === menuitems.length - 1 ? 0 : i + 1);
        menuitems[next].focus();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!menuitems.length) return;
        const i = menuitems.indexOf(document.activeElement);
        const next = e.key === "ArrowDown"
          ? (i === -1 || i === menuitems.length - 1 ? 0 : i + 1)
          : (i <= 0 ? menuitems.length - 1 : i - 1);
        menuitems[next].focus();
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        menuitems[0]?.focus();
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        menuitems[menuitems.length - 1]?.focus();
      }
    }

    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        closeMenu();
      }
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onPointerEnter={() => {
        clearTimer();
        timerRef.current = setTimeout(() => setOpen(true), hoverOpenDelayMs());
      }}
      onPointerLeave={() => {
        clearTimer();
        const restore = wrapRef.current?.contains(document.activeElement);
        closeMenu({ restore });
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-current={active ? "true" : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex items-center gap-1 self-stretch px-2 text-sm ${
          active
            ? "border-b-2 border-brand-500 text-text-main"
            : "border-b-2 border-transparent text-text-muted hover:text-text-main"
        }`}
      >
        {group.label}
        <CaretDown size={14} />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute left-0 top-full z-50 min-w-[200px] rounded-[8px] border border-border bg-surface py-1 shadow-lg"
        >
          {items.map((item) => {
            const current = isNavCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={current ? "page" : undefined}
                onClick={() => closeMenu()}
                className={`block px-3 py-2 text-sm ${
                  current
                    ? "bg-surface-2 text-text-main"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

GroupMenu.propTypes = {
  group: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        href: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        flag: PropTypes.string,
      })
    ).isRequired,
  }).isRequired,
  pathname: PropTypes.string,
  enableTranslator: PropTypes.bool,
};

export default function Header({ updateInfo, onRequestUpdate }) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("");
  const [loginMethod, setLoginMethod] = useState("");
  const [enableTranslator, setEnableTranslator] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const pageInfo = useMemo(() => getPageInfo(pathname), [pathname]);

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.enableTranslator) setEnableTranslator(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthStatus() {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setDisplayName(data?.displayName || data?.samlName || data?.samlEmail || data?.oidcName || data?.oidcEmail || "");
          setLoginMethod(data?.loginMethod || "");
        }
      } catch {
        if (!cancelled) {
          setDisplayName("");
          setLoginMethod("");
        }
      }
    }

    loadAuthStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.assign("/login");
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-subtle bg-surface px-4">
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png?v=2" alt="" width={20} height={20} unoptimized />
          <span className="font-semibold text-text-main hidden lg:inline">{APP_CONFIG.name}</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1 self-stretch" aria-label="Primary">
          {ADMIN_NAV_GROUPS.map((group) => (
            <GroupMenu
              key={group.id}
              group={group}
              pathname={pathname}
              enableTranslator={enableTranslator}
            />
          ))}
        </nav>
        {pageInfo.title ? (
          <h1 className="lg:hidden min-w-0 flex-1 text-sm font-semibold text-text-main truncate">
            {translate(pageInfo.title)}
          </h1>
        ) : (
          <div className="lg:hidden min-w-0 flex-1" />
        )}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="ml-auto hidden lg:flex h-9 min-w-[200px] items-center gap-2 rounded-[8px] border border-border bg-bg px-3 text-sm text-text-muted"
        >
          <MagnifyingGlass size={16} />
          Search
          <kbd className="ml-auto font-mono text-[11px]">⌘K</kbd>
        </button>
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          {updateInfo ? (
            <button
              type="button"
              onClick={onRequestUpdate}
              className="flex items-center gap-1.5 shrink-0 text-sm text-text-main"
            >
              <span className="size-2 rounded-full bg-amber-500" />
              update
            </button>
          ) : (
            <span className="flex items-center gap-1.5 shrink-0 text-sm text-text-muted">
              <span className="size-2 rounded-full bg-green-500" />
              online
            </span>
          )}
          {displayName && (loginMethod === "OIDC" || loginMethod === "SAML") && (
            <div
              className="flex items-center max-w-[220px] px-2.5 py-1 rounded-full border border-border bg-surface text-xs text-text-muted truncate shadow-xs"
              title={displayName}
            >
              <User size={14} className="mr-1.5 text-primary shrink-0" />
              <span className="truncate font-medium">{displayName}</span>
              <span className="ml-2 shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                {loginMethod}
              </span>
            </div>
          )}
          <ThemeToggle />
          <HeaderLanguage />
          <HeaderMenu onLogout={handleLogout} />
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="lg:hidden flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-text-main"
          aria-label="Search"
        >
          <MagnifyingGlass size={20} />
        </button>
        <button
          type="button"
          onClick={() => setSheetOpen((v) => !v)}
          className="lg:hidden flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-text-main"
          aria-expanded={sheetOpen}
          aria-label="Open navigation"
        >
          <List size={20} />
        </button>
      </header>

      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSheetOpen(false)}
          />
          <nav
            className="fixed inset-x-0 bottom-0 z-50 lg:hidden max-h-[80dvh] overflow-y-auto rounded-t-[10px] border-t border-border bg-surface p-4 pb-8"
            aria-label="Primary"
          >
            {ADMIN_NAV_GROUPS.map((group) => (
              <details
                key={group.id}
                className="border-b border-border-subtle py-1"
                open={getActiveGroupId(pathname) === group.id}
              >
                <summary className="cursor-pointer list-none flex items-center justify-between py-2 text-sm font-medium text-text-main">
                  {group.label}
                  <CaretDown size={14} className="text-text-muted" />
                </summary>
                <div className="pb-2">
                  {visibleItems(group, enableTranslator).map((item) => {
                    const current = isNavCurrent(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={current ? "page" : undefined}
                        onClick={() => setSheetOpen(false)}
                        className={`block rounded-[8px] px-3 py-2 text-sm ${
                          current
                            ? "bg-surface-2 text-text-main"
                            : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </details>
            ))}
          </nav>
        </>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        enableTranslator={enableTranslator}
        onLogout={handleLogout}
        onOpenChangelog={() => setChangelogOpen(true)}
      />
      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </>
  );
}

Header.propTypes = {
  updateInfo: PropTypes.shape({
    hasUpdate: PropTypes.bool,
    latestVersion: PropTypes.string,
  }),
  onRequestUpdate: PropTypes.func,
};
