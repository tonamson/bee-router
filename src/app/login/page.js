"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import AnimatedBackground from "@/app/components/AnimatedBackground";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { APP_CONFIG } from "@/shared/constants/config";

export default function LoginPage() {
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

  const { copied, copy } = useCopyToClipboard();

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
            window.location.assign("/dashboard");
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
          // Safe fallback on non-OK response to avoid infinite loading state.
          setHasPassword(true);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        setHasPassword(true);
      }
    }
    checkAuth();
  }, []);

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
        window.location.assign("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
        if (data.resetHint) setResetHint(data.resetHint);
        if (data.retryAfter) setRetryAfter(Number(data.retryAfter));
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Force a new password before entering the dashboard (default + remote).
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
        window.location.assign("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to set password");
      }
    } catch (err) {
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

  // Show loading state while checking password
  if (hasPassword === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0E12] p-4 relative overflow-hidden text-white selection:bg-[#FFC700] selection:text-black">
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center size-14 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#FFC700]/20 animate-ping" />
            <div className="size-10 rounded-full border-2 border-[#FFC700] border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-300 text-sm font-medium tracking-wide">Connecting to Hive gateway...</p>
          <span className="text-gray-500 text-xs mt-1 font-mono">Initializing secure handshake</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative text-white font-sans overflow-x-hidden antialiased bg-[#0D0E12] selection:bg-[#FFC700] selection:text-black min-h-screen flex flex-col lg:flex-row">
      <AnimatedBackground />

      {/* Left Panel: Brand Showcase (Desktop only >= 1024px) */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[46%] flex-col justify-between p-10 xl:p-14 relative border-r border-[#282B37]/80 bg-[#0D0E12]/80 backdrop-blur-md overflow-hidden">
        {/* Top Brand Header */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center size-14 drop-shadow-[0_0_20px_rgba(255,199,0,0.45)]">
              <Image
                src="/logo.png?v=2"
                alt="BeeRouter Logo"
                width={56}
                height={56}
                className="object-contain"
                priority
                unoptimized
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-white">
                  Bee<span className="text-[#FFC700]">Router</span>
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-[#FFC700]/10 text-[#FFC700] border border-[#FFC700]/25 shadow-[0_0_10px_rgba(255,199,0,0.15)]">
                  v{APP_CONFIG?.version || "1.0"}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Local-first AI Gateway & Unified Proxy
              </p>
            </div>
          </div>

          {/* Hero pitch / tagline */}
          <div className="mt-2">
            <h2 className="text-xl xl:text-2xl font-bold text-white leading-snug">
              Intelligent multi-provider routing on your own hardware.
            </h2>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed font-light">
              Point Claude Code, Codex, Cursor, and any OpenAI-compatible client at your local gateway. Zero vendor lock-in.
            </p>
          </div>

          {/* Capability Badges */}
          <div className="flex flex-col gap-3 mt-4">
            {/* Badge 1 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#16181F]/70 border border-[#282B37] hover:border-[#FFC700]/30 transition-colors">
              <div className="flex items-center justify-center size-10 rounded-lg bg-[#FFC700]/10 border border-[#FFC700]/20 text-[#FFC700] shrink-0">
                <span className="material-symbols-outlined text-[22px]">bolt</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-wide">
                  &lt;0.8ms Overhead
                </span>
                <span className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Ultra-fast streaming proxy with native protocol translation and zero compute latency.
                </span>
              </div>
            </div>

            {/* Badge 2 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#16181F]/70 border border-[#282B37] hover:border-[#FFC700]/30 transition-colors">
              <div className="flex items-center justify-center size-10 rounded-lg bg-[#FFC700]/10 border border-[#FFC700]/20 text-[#FFC700] shrink-0">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-wide">
                  99.99% Reliability Fallbacks
                </span>
                <span className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Automatic failover across accounts, models, and providers when upstream hits rate limits.
                </span>
              </div>
            </div>

            {/* Badge 3 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#16181F]/70 border border-[#282B37] hover:border-[#FFC700]/30 transition-colors">
              <div className="flex items-center justify-center size-10 rounded-lg bg-[#FFC700]/10 border border-[#FFC700]/20 text-[#FFC700] shrink-0">
                <span className="material-symbols-outlined text-[22px]">lock</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-wide">
                  100% Local Encrypted Vault
                </span>
                <span className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  API keys and tokens remain in AES-GCM encrypted local SQLite on your disk, never in the cloud.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Command Box & Status */}
        <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-[#282B37]/60">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>QUICKSTART GATEWAY</span>
              <span className="text-[#FFC700]">CLI Launcher</span>
            </div>
            <div
              onClick={() => copy("npx @tonamson2/bee-router", "login-npx")}
              className="group relative flex items-center justify-between px-4 py-3 rounded-xl border border-[#282B37] bg-[#16181F]/90 hover:border-[#FFC700]/50 transition-all cursor-pointer shadow-inner"
              title="Click to copy CLI launch command"
            >
              <div className="flex items-center gap-2.5 font-mono text-xs overflow-hidden">
                <span className="text-[#FFC700] font-bold select-none">$</span>
                <span className="text-gray-200 select-all font-medium truncate">
                  npx @tonamson2/bee-router
                </span>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-[#0D0E12] border border-[#282B37] text-gray-400 group-hover:text-[#FFC700] group-hover:border-[#FFC700]/30 transition-colors shrink-0"
                aria-label="Copy quickstart command"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {copied === "login-npx" ? "check" : "content_copy"}
                </span>
                <span>{copied === "login-npx" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Live Gateway Indicator */}
          <div className="flex items-center justify-between text-xs text-gray-500 font-mono pt-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span>Port 20128 · Gateway Ready</span>
            </div>
            <span>Open Source MIT</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Authentication Container */}
      <div className="w-full lg:w-[52%] xl:w-[54%] flex flex-col justify-between p-6 sm:p-10 xl:p-14 min-h-screen relative z-10">
        {/* Top bar with Back to Home link */}
        <div className="flex items-center justify-between w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-[#FFC700] transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            <span>Back to Home</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-500 bg-[#16181F]/60 px-3 py-1 rounded-full border border-[#282B37]">
            <span className="size-1.5 rounded-full bg-[#FFC700] animate-pulse" />
            <span>BeeRouter v{APP_CONFIG?.version || "1.0"}</span>
          </div>
        </div>

        {/* Centered Glassmorphism Authentication Card */}
        <div className="flex-1 flex flex-col items-center justify-center py-8 w-full max-w-md mx-auto">
          {/* Mobile-only brand header */}
          <div className="lg:hidden flex flex-col items-center text-center mb-6">
            <div className="relative flex items-center justify-center size-14 mb-3 drop-shadow-[0_0_20px_rgba(255,199,0,0.45)]">
              <Image
                src="/logo.png?v=2"
                alt="BeeRouter Logo"
                width={48}
                height={48}
                className="object-contain"
                priority
                unoptimized
              />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">
                Bee<span className="text-[#FFC700]">Router</span>
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#FFC700]/10 text-[#FFC700] border border-[#FFC700]/25">
                v{APP_CONFIG?.version || "1.0"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Local AI Gateway & Routing Platform</p>
          </div>

          {/* Glassmorphism Card */}
          <div className="w-full bg-[#16181F]/90 backdrop-blur-xl border border-[#282B37] shadow-[0_16px_48px_rgba(0,0,0,0.7)] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Amber cyber top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFC700]/70 to-transparent" />

            {/* Card Title & Subtitle */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FFC700] text-[22px]">
                  {mustChange ? "lock_reset" : "shield_lock"}
                </span>
                {mustChange ? "Set Master Password" : "Sign In to Gateway"}
              </h2>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                {mustChange
                  ? "Set a new master password before accessing the dashboard remotely."
                  : samlAvailable
                  ? "Sign in with SAML 2.0 Single Sign-On"
                  : oidcAvailable
                  ? "Sign in with your OIDC identity provider"
                  : "Enter your password to unlock the BeeRouter control plane"}
              </p>
            </div>

            {mustChange ? (
              /* Forced Password Change Form */
              <form onSubmit={handleSetNewPassword} className="flex flex-col gap-4">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs leading-relaxed">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">lock_reset</span>
                  <span>Set a new password before accessing the dashboard remotely.</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                      <span className="material-symbols-outlined text-[18px]">key</span>
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                      className="w-full py-2.5 pl-10 pr-10 text-sm text-white bg-[#0D0E12] rounded-xl border border-[#282B37] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFC700]/30 focus:border-[#FFC700] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showNewPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {error && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword}
                  className="w-full h-11 rounded-xl bg-[#FFC700] hover:bg-[#FFD633] text-black font-bold text-sm shadow-[0_0_20px_rgba(255,199,0,0.35)] hover:shadow-[0_0_25px_rgba(255,199,0,0.5)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Saving Password...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Set Password & Proceed</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Normal Login Flow */
              <div className="flex flex-col gap-4">
                {samlAvailable && (
                  <button
                    type="button"
                    onClick={handleSamlLogin}
                    className="w-full h-11 px-4 rounded-xl bg-[#1F222B] hover:bg-[#282B37] border border-[#282B37] hover:border-[#FFC700]/40 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#FFC700]">security</span>
                    {samlLoginLabel}
                  </button>
                )}

                {oidcAvailable && (
                  <button
                    type="button"
                    onClick={handleOidcLogin}
                    className="w-full h-11 px-4 rounded-xl bg-[#1F222B] hover:bg-[#282B37] border border-[#282B37] hover:border-[#FFC700]/40 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#FFC700]">fingerprint</span>
                    {oidcLoginLabel}
                  </button>
                )}

                {ssoAvailable && passwordAvailable && (
                  <div className="relative my-2 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#282B37]" />
                    </div>
                    <span className="relative bg-[#16181F] px-3 text-xs uppercase tracking-wider text-gray-500 font-mono">
                      or password
                    </span>
                  </div>
                )}

                {passwordAvailable ? (
                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    {isSsoEnabled && !ssoAvailable && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                        <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">warning</span>
                        <span>
                          {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} login is enabled, but configuration is incomplete. Password login is still available for recovery.
                        </span>
                      </div>
                    )}

                    {authMode === "both" && ssoAvailable && (
                      <p className="text-xs text-gray-400 text-center">
                        Password and {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} login are both enabled.
                      </p>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Password
                        </label>
                        <span className="text-[11px] text-gray-500 font-mono">Master access</span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoFocus={!oidcAvailable}
                          disabled={retryAfter > 0}
                          className="w-full py-2.5 pl-10 pr-10 text-sm text-white bg-[#0D0E12] rounded-xl border border-[#282B37] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFC700]/30 focus:border-[#FFC700] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>

                      {error && (
                        <p className="text-xs text-red-400 flex items-center gap-1.5 mt-1">
                          <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                          {error}
                        </p>
                      )}

                      {retryAfter > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg mt-1">
                          <span className="material-symbols-outlined text-[15px] shrink-0">timer</span>
                          <span>
                            Too many attempts. Retry in <strong className="font-mono">{retryAfter}s</strong>.
                          </span>
                        </div>
                      )}

                      {resetHint && (
                        <p className="text-xs text-gray-400 bg-[#0D0E12] border border-[#282B37] p-2.5 rounded-lg mt-1 leading-relaxed">
                          Forgot password? Open <code className="bg-[#1F222B] px-1.5 py-0.5 rounded border border-[#282B37] text-[#FFC700] font-mono text-[11px]">beerouter</code> CLI on the host → <b>Settings</b> → <b>Reset Password to Default</b>.
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || retryAfter > 0 || !password}
                      className="w-full h-11 rounded-xl bg-[#FFC700] hover:bg-[#FFD633] text-black font-bold text-sm shadow-[0_0_20px_rgba(255,199,0,0.35)] hover:shadow-[0_0_25px_rgba(255,199,0,0.5)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                          <span>Authenticating...</span>
                        </>
                      ) : retryAfter > 0 ? (
                        <>
                          <span className="material-symbols-outlined text-[18px]">timer</span>
                          <span>Retry in {retryAfter}s</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">login</span>
                          <span>Login to Hive</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-1">
                      <span>Default password is</span>
                      <code className="bg-[#0D0E12] px-2 py-0.5 rounded border border-[#282B37] text-[#FFC700] font-mono font-semibold tracking-wider">
                        123456
                      </code>
                    </div>

                    {hasPassword === false && (
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
                        <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">shield</span>
                        <span>Security risk: no password set. You will be asked to set one when logging in remotely.</span>
                      </div>
                    )}
                  </form>
                ) : (
                  error && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5 mt-2">
                      <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                      {error}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 font-mono">
          <span>BeeRouter Gateway</span>
          <span>·</span>
          <span>Local Encrypted Vault</span>
        </div>
      </div>
    </div>
  );
}
