# Split-Screen Cyber Login Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/login` into a high-tech Split-Screen Cyber UI matching the BeeRouter landing page design language while preserving all existing authentication logic (Password, SAML/OIDC SSO, rate-limiting, reset hints, forced password change).

**Architecture:** Split-screen layout (Left: brand showcase + live metrics + quick copy; Right: modern glassmorphism login card with password show/hide toggle and Back to Home navigation). Responsively collapses on mobile devices.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Material Symbols icons.

## Global Constraints

- Preserve all existing auth states and API hooks (`/api/auth/status`, `/api/auth/login`, `/api/auth/oidc/start`, `/api/auth/saml/start`, `/api/settings`).
- Use official logo `/logo.png?v=2` with `next/image`.
- Ensure 100% English copy throughout the login interface.
- Support responsive viewport: $\ge 1024\text{px}$ split screen, $< 1024\text{px}$ single centered column.

---

### Task 1: Implement Split-Screen Layout and Enhanced Features in `src/app/login/page.js`

**Files:**
- Modify: `src/app/login/page.js`

**Interfaces:**
- Consumes: `/api/auth/status`, `/api/auth/login`, `/api/auth/oidc/start`, `/api/auth/saml/start`, `/api/settings`
- Produces: Updated React client component for `/login`

- [ ] **Step 1: Update `src/app/login/page.js` with split-screen layout, brand showcase, password toggle, and back to home button**

```javascript
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { APP_CONFIG } from "@/shared/constants/config";

export default function LoginPage() {
  const router = useRouter();
  const { copied, copy } = useCopyToClipboard();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [resetHint, setResetHint] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(null);
  const [authMode, setAuthMode] = useState("password");
  const [ssoType, setSsoType] = useState("oidc");
  const [oidcConfigured, setOidcConfigured] = useState(false);
  const [oidcLoginLabel, setOidcLoginLabel] = useState("Sign in with OIDC");
  const [samlConfigured, setSamlConfigured] = useState(false);
  const [samlLoginLabel, setSamlLoginLabel] = useState("Sign in with SAML SSO");
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Countdown for rate-limit
  useEffect(() => {
    if (retryAfter <= 0) return;
    const id = setInterval(() => setRetryAfter((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  useEffect(() => {
    async function checkAuth() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      try {
        const res = await fetch(`${baseUrl}/api/auth/status`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated === true || data.requireLogin === false) {
            router.push("/dashboard");
            return;
          }
          setHasPassword(!!data.hasPassword);
          setAuthMode(data.authMode || "password");
          setSsoType(data.ssoType || "oidc");
          setOidcConfigured(data.oidcConfigured === true);
          setOidcLoginLabel(data.oidcLoginLabel || "Sign in with OIDC");
          setSamlConfigured(data.samlConfigured === true);
          setSamlLoginLabel(data.samlLoginLabel || "Sign in with SAML SSO");
        } else {
          setHasPassword(true);
        }
      } catch {
        clearTimeout(timeoutId);
        setHasPassword(true);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetHint("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mustChangePassword) {
          setMustChange(true);
          return;
        }
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
        if (data.resetHint) setResetHint(data.resetHint);
        if (data.retryAfter) setRetryAfter(Number(data.retryAfter));
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password, newPassword }),
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to set password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOidcLogin = () => {
    window.location.href = "/api/auth/oidc/start";
  };

  const handleSamlLogin = () => {
    window.location.href = "/api/auth/saml/start";
  };

  const isSsoEnabled = ["sso", "oidc", "saml", "both"].includes(authMode);
  const activeSsoType = ssoType || (authMode === "saml" ? "saml" : "oidc");
  const samlAvailable = isSsoEnabled && activeSsoType === "saml" && samlConfigured;
  const oidcAvailable = isSsoEnabled && activeSsoType === "oidc" && oidcConfigured;
  const ssoAvailable = samlAvailable || oidcAvailable;
  const passwordAvailable = authMode === "password" || authMode === "both" || !ssoAvailable;

  // Initial Loading state
  if (hasPassword === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0E12] text-white p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 rounded-full border-2 border-[#FFC700] border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm font-mono">Connecting to Hive gateway...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0E12] text-white flex flex-col lg:flex-row relative overflow-hidden font-sans selection:bg-[#FFC700] selection:text-black">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#FFC700]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* ================= LEFT PANEL: BRAND & ECOSYSTEM SHOWCASE ================= */}
      <div className="hidden lg:flex lg:w-[48%] bg-[#12141A] border-r border-[#282B37] p-12 flex-col justify-between relative overflow-hidden">
        {/* Glowing background grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#282B37_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFC700]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          {/* Brand Header */}
          <Link href="/" className="inline-flex items-center gap-3 group mb-12">
            <div className="size-10 relative flex items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="/logo.png?v=2"
                alt="BeeRouter Logo"
                width={40}
                height={40}
                className="object-contain drop-shadow-[0_0_12px_rgba(255,199,0,0.5)]"
                priority
                unoptimized
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-white group-hover:text-[#FFC700] transition-colors">
                BeeRouter
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFC700]/10 text-[#FFC700] border border-[#FFC700]/20">
                v{APP_CONFIG?.version || "1.0"}
              </span>
            </div>
          </Link>

          {/* Headline */}
          <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight mb-4 text-white">
            Intelligent AI Gateway for <br />
            <span className="bg-gradient-to-r from-[#FFC700] via-[#FFD633] to-[#F59E0B] bg-clip-text text-transparent">
              High-Scale Agent Systems
            </span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md mb-8">
            Manage models, monitor real-time token traffic, configure multi-provider combos, and orchestrate intelligent failovers locally.
          </p>

          {/* Capability Badges */}
          <div className="flex flex-col gap-3 max-w-md mb-8">
            <div className="p-3.5 rounded-xl bg-[#16181F] border border-[#282B37] flex items-center gap-3">
              <div className="size-8 rounded-lg bg-[#FFC700]/10 border border-[#FFC700]/20 text-[#FFC700] flex items-center justify-center flex-none">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
              </div>
              <div className="text-xs">
                <strong className="text-white block font-semibold">&lt; 0.8ms Overhead Routing</strong>
                <span className="text-gray-400">Local in-memory proxy with zero cloud network hops.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#16181F] border border-[#282B37] flex items-center gap-3">
              <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-none">
                <span className="material-symbols-outlined text-[18px]">shield_check</span>
              </div>
              <div className="text-xs">
                <strong className="text-white block font-semibold">99.99% Reliability Fallbacks</strong>
                <span className="text-gray-400">Instant multi-provider cascade on 429 rate limits.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#16181F] border border-[#282B37] flex items-center gap-3">
              <div className="size-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center flex-none">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
              <div className="text-xs">
                <strong className="text-white block font-semibold">100% Local Encrypted Vault</strong>
                <span className="text-gray-400">All credentials and tokens stay on your local disk.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick CLI copy banner */}
        <div className="relative z-10 pt-6 border-t border-[#282B37]">
          <div 
            onClick={() => copy("npx @tonamson2/bee-router", "login-npx")}
            className="p-3 rounded-xl bg-[#16181F] border border-[#282B37] hover:border-[#FFC700]/40 flex items-center justify-between cursor-pointer transition-colors group"
            title="Click to copy quickstart command"
          >
            <div className="flex items-center gap-2 font-mono text-xs text-gray-300">
              <span className="text-[#FFC700]">$</span>
              <span>npx @tonamson2/bee-router</span>
            </div>
            <span className="text-xs text-gray-500 group-hover:text-[#FFC700] transition-colors font-mono">
              {copied === "login-npx" ? "✓ Copied" : "Copy"}
            </span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL: AUTHENTICATION FORM ================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 relative z-10 min-h-screen lg:min-h-0">
        {/* Top Bar: Back to Home link */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Home
          </Link>

          {/* Mobile Logo indicator */}
          <div className="flex lg:hidden items-center gap-2">
            <Image
              src="/logo.png?v=2"
              alt="BeeRouter Logo"
              width={24}
              height={24}
              className="object-contain"
              unoptimized
            />
            <span className="text-sm font-bold text-white">BeeRouter</span>
          </div>
        </div>

        {/* Center Card Container */}
        <div className="w-full max-w-md mx-auto my-auto">
          {/* Card Header */}
          <div className="mb-6 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Sign In to BeeRouter
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              {samlAvailable
                ? "Sign in with SAML 2.0 Single Sign-On"
                : oidcAvailable
                ? "Sign in with your enterprise OIDC provider"
                : "Enter your password to access the Hive dashboard"}
            </p>
          </div>

          {/* Glassmorphic Form Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#16181F]/90 border border-[#282B37] shadow-2xl backdrop-blur-md">
            {mustChange ? (
              /* Forced Password Change Form */
              <form onSubmit={handleSetNewPassword} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  <span className="material-symbols-outlined text-[18px] shrink-0">lock_reset</span>
                  <span>Set a new password before accessing the dashboard remotely.</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-300">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0D0E12] border border-[#282B37] focus:border-[#FFC700] focus:ring-1 focus:ring-[#FFC700] text-sm text-white outline-none transition-all placeholder:text-gray-600"
                  />
                  {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                </div>
                <button
                  type="submit"
                  disabled={loading || !newPassword}
                  className="w-full h-11 rounded-xl bg-[#FFC700] hover:bg-[#FFD633] text-black text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,199,0,0.4)] hover:shadow-[0_0_25px_rgba(255,199,0,0.6)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? "Setting Password..." : "Set Password & Continue"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                {/* 1-Click SAML SSO */}
                {samlAvailable && (
                  <button
                    type="button"
                    onClick={handleSamlLogin}
                    className="w-full h-11 rounded-xl bg-[#1F222B] hover:bg-[#282B37] border border-[#FFC700]/30 hover:border-[#FFC700] text-white text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#FFC700]">key</span>
                    {samlLoginLabel}
                  </button>
                )}

                {/* 1-Click OIDC SSO */}
                {oidcAvailable && (
                  <button
                    type="button"
                    onClick={handleOidcLogin}
                    className="w-full h-11 rounded-xl bg-[#1F222B] hover:bg-[#282B37] border border-[#FFC700]/30 hover:border-[#FFC700] text-white text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#FFC700]">account_circle</span>
                    {oidcLoginLabel}
                  </button>
                )}

                {ssoAvailable && passwordAvailable && (
                  <div className="relative my-2 flex items-center justify-center">
                    <div className="border-t border-[#282B37] w-full" />
                    <span className="bg-[#16181F] px-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider absolute">
                      Or continue with
                    </span>
                  </div>
                )}

                {/* Password Form */}
                {passwordAvailable ? (
                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    {isSsoEnabled && !ssoAvailable && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                        <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
                        <span>
                          {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} login is enabled but configuration is incomplete. Password login is active.
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-300">Password</label>
                        <span className="text-[11px] font-mono text-gray-500">
                          Default: <code className="text-[#FFC700]">123456</code>
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your gateway password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoFocus={!oidcAvailable}
                          className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#0D0E12] border border-[#282B37] focus:border-[#FFC700] focus:ring-1 focus:ring-[#FFC700] text-sm text-white outline-none transition-all placeholder:text-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer p-1"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>

                      {error && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">error</span>
                          {error}
                        </p>
                      )}

                      {retryAfter > 0 && (
                        <p className="text-xs text-amber-400 mt-1 flex items-center gap-1.5 font-mono">
                          <span className="material-symbols-outlined text-[14px]">timer</span>
                          Too many attempts. Retry in <strong className="text-white">{retryAfter}s</strong>.
                        </p>
                      )}

                      {resetHint && (
                        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed bg-[#0D0E12] p-2.5 rounded-lg border border-[#282B37]">
                          Forgot password? Run <code className="text-[#FFC700] font-mono">bee-router</code> CLI → <b>Settings</b> → <b>Reset Password to Default</b>.
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || retryAfter > 0}
                      className="w-full h-11 rounded-xl bg-[#FFC700] hover:bg-[#FFD633] text-black text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,199,0,0.4)] hover:shadow-[0_0_25px_rgba(255,199,0,0.6)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                    >
                      {loading ? (
                        <>
                          <span className="size-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Authenticating...
                        </>
                      ) : retryAfter > 0 ? (
                        `Wait ${retryAfter}s`
                      ) : (
                        "Sign In to Dashboard"
                      )}
                    </button>
                  </form>
                ) : (
                  error && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {error}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-md mx-auto text-center text-xs text-gray-500 mt-8">
          <p>© {new Date().getFullYear()} BeeRouter • Open Source Local AI Gateway</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation and bundle build**

Run: `npm run build`
Expected: Exits with code 0.

- [ ] **Step 3: Commit implementation**

```bash
git add src/app/login/page.js
git commit -m "feat(login): redesign login page with split-screen cyber UI"
```
