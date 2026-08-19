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
  const [showNewPassword, setShowNewPassword] = useState(false);

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
    <div className="min-h-screen bg-[#0D0E12] text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#FFC700] selection:text-black">
      {/* Ambient background glow and grid */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#FFC700]/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#282B37_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-2xl mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16181F] border border-[#282B37] hover:border-[#FFC700]/40 text-xs font-semibold text-gray-300 hover:text-white transition-all group"
        >
          <span className="material-symbols-outlined text-[16px] text-gray-400 group-hover:text-[#FFC700] transition-colors">
            arrow_back
          </span>
          Back to Home
        </Link>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16181F] border border-[#282B37] text-[11px] font-mono text-gray-400">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>local:20128</span>
        </div>
      </header>

      {/* Main Terminal Window */}
      <main className="relative z-10 w-full max-w-xl mx-auto my-auto">
        <div className="rounded-2xl bg-[#12141A]/95 border border-[#282B37] shadow-[0_0_50px_rgba(255,199,0,0.12)] overflow-hidden backdrop-blur-xl">
          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#16181F] border-b border-[#282B37] select-none">
            {/* macOS Window Controls */}
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <div className="size-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <div className="size-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>

            {/* Title */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400 font-semibold">
              <span className="material-symbols-outlined text-[14px] text-[#FFC700]">lock</span>
              <span>bash — bee-router auth v{APP_CONFIG?.version || "1.0"}</span>
            </div>

            {/* Status */}
            <div className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              READY
            </div>
          </div>

          {/* Terminal Body */}
          <div className="p-6 sm:p-8 font-mono text-xs leading-relaxed flex flex-col gap-6">
            {/* Brand Intro & Stream Lines */}
            <div className="flex items-center gap-4 pb-5 border-b border-[#282B37]">
              <div className="size-14 relative flex-none flex items-center justify-center p-2 rounded-2xl bg-[#16181F] border border-[#282B37] shadow-[0_0_20px_rgba(255,199,0,0.2)]">
                <Image
                  src="/logo.png?v=2"
                  alt="BeeRouter Logo"
                  width={44}
                  height={44}
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white font-sans tracking-tight">BeeRouter</h1>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FFC700]/10 text-[#FFC700] border border-[#FFC700]/30 font-mono">
                    AI GATEWAY
                  </span>
                </div>
                <p className="text-gray-400 text-[11px] font-sans">
                  Unified AI Proxy &amp; Routing Engine
                </p>
                <div className="text-[10px] text-gray-500 flex items-center gap-2">
                  <span>&gt; Sub-millisecond routing</span>
                  <span>•</span>
                  <span>&gt; SQLite Vault</span>
                </div>
              </div>
            </div>

            {/* SSO Action Buttons (if configured) */}
            {ssoAvailable && (
              <div className="flex flex-col gap-2.5">
                {samlAvailable && (
                  <button
                    type="button"
                    onClick={handleSamlLogin}
                    className="w-full h-10 px-4 rounded-xl bg-[#16181F] hover:bg-[#1F222B] border border-[#FFC700]/30 hover:border-[#FFC700] text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#FFC700]">key</span>
                    <span>[ 🔑 {samlLoginLabel} ]</span>
                  </button>
                )}

                {oidcAvailable && (
                  <button
                    type="button"
                    onClick={handleOidcLogin}
                    className="w-full h-10 px-4 rounded-xl bg-[#16181F] hover:bg-[#1F222B] border border-[#FFC700]/30 hover:border-[#FFC700] text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#FFC700]">account_circle</span>
                    <span>[ 🔑 {oidcLoginLabel} ]</span>
                  </button>
                )}

                {passwordAvailable && (
                  <div className="relative my-2 text-center text-[10px] text-gray-500 uppercase tracking-widest">
                    <div className="border-t border-[#282B37] absolute inset-x-0 top-1/2 -translate-y-1/2" />
                    <span className="relative bg-[#12141A] px-2">or password auth</span>
                  </div>
                )}
              </div>
            )}

            {/* Authentication Forms */}
            {mustChange ? (
              /* Forced Password Setup */
              <form onSubmit={handleSetNewPassword} className="flex flex-col gap-4">
                <div className="text-amber-400 text-[11px] bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                  <span>Set a new password before accessing the dashboard remotely.</span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-gray-300 text-[11px] flex items-center gap-1.5 font-bold">
                    <span className="text-[#FFC700]">$</span>
                    <span>passwd --new</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new master password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#0D0E12] border border-[#282B37] focus:border-[#FFC700] focus:ring-1 focus:ring-[#FFC700] text-white text-xs outline-none transition-all placeholder:text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer p-1"
                      title={showNewPassword ? "Hide" : "Show"}
                      aria-label="Toggle new password visibility"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showNewPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {error && <div className="text-red-400 text-[11px] mt-1">[!] Error: {error}</div>}
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword}
                  className="w-full h-11 rounded-xl bg-[#FFC700] hover:bg-[#FFD633] text-black text-xs font-bold font-sans transition-all shadow-[0_0_20px_rgba(255,199,0,0.4)] hover:shadow-[0_0_25px_rgba(255,199,0,0.6)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? "Setting Password..." : "Set Password & Enter Hive [ ↵ ]"}
                </button>
              </form>
            ) : passwordAvailable ? (
              /* Standard Password Login */
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-[11px] flex items-center gap-1.5 font-bold">
                      <span className="text-[#FFC700]">$</span>
                      <span>enter password:</span>
                    </label>
                    <span className="text-[10px] text-gray-500">
                      Default: <code className="text-[#FFC700]">123456</code>
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus={!oidcAvailable}
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#0D0E12] border border-[#282B37] focus:border-[#FFC700] focus:ring-1 focus:ring-[#FFC700] text-white text-xs outline-none transition-all placeholder:text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer p-1"
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label="Toggle password visibility"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>

                  {/* Feedback Messages */}
                  {error && (
                    <div className="text-red-400 text-[11px] mt-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      <span>[!] Error: {error}</span>
                    </div>
                  )}

                  {retryAfter > 0 && (
                    <div className="text-amber-400 text-[11px] mt-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      <span>[!] Rate limited: Retry in {retryAfter}s</span>
                    </div>
                  )}

                  {resetHint && (
                    <div className="text-gray-400 text-[11px] mt-1 bg-[#0D0E12] p-2.5 rounded-lg border border-[#282B37]">
                      [?] Hint: Run <code className="text-[#FFC700]">bee-router</code> CLI → <b>Settings</b> → <b>Reset Password to Default</b>.
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || retryAfter > 0}
                  className="w-full h-11 rounded-xl bg-[#FFC700] hover:bg-[#FFD633] text-black text-xs font-bold font-sans transition-all shadow-[0_0_20px_rgba(255,199,0,0.4)] hover:shadow-[0_0_25px_rgba(255,199,0,0.6)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                >
                  {loading ? (
                    <>
                      <span className="size-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : retryAfter > 0 ? (
                    `Wait ${retryAfter}s`
                  ) : (
                    "Authenticate & Enter Hive [ ↵ ]"
                  )}
                </button>
              </form>
            ) : null}

            {/* Quickstart Command Box */}
            <div className="pt-4 border-t border-[#282B37]">
              <div
                onClick={() => copy("npx @tonamson2/bee-router", "terminal-npx")}
                className="p-2.5 rounded-xl bg-[#0D0E12] border border-[#282B37] hover:border-[#FFC700]/40 flex items-center justify-between cursor-pointer transition-colors group"
                title="Click to copy quickstart command"
              >
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="text-[#FFC700]">$</span>
                  <span>npx @tonamson2/bee-router</span>
                </div>
                <span className="text-[10px] text-gray-500 group-hover:text-[#FFC700] transition-colors font-sans">
                  {copied === "terminal-npx" ? "✓ Copied" : "Copy"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Bar */}
      <footer className="relative z-10 w-full max-w-xl mx-auto text-center text-[11px] text-gray-500 py-2">
        <p>© {new Date().getFullYear()} BeeRouter • Open Source AI Gateway • MIT License</p>
      </footer>
    </div>
  );
}
