"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input } from "@/shared/components";

export default function LoginPage() {
  const [password, setPassword] = useState("");
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
      <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-9 w-9 border-2 border-brand-500 border-t-transparent"></div>
          <p className="text-text-muted text-sm mt-4">Connecting to the Hive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden">
      {/* Amber radial glow background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />
      {/* Honeycomb grid overlay */}
      <div className="landing-grid absolute inset-0 pointer-events-none opacity-40 dark:opacity-20" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 shadow-[0_0_24px_rgba(255,199,0,0.38)] text-black mb-4">
            <svg className="size-8" viewBox="0 0 24 24" fill="currentColor">
              {/* Outer hexagon */}
              <path
                d="M12 2L3.5 6.9v10.2L12 22l8.5-4.9V6.9L12 2zm0 2.4l6.5 3.75v7.5L12 19.4l-6.5-3.75v-7.5L12 4.4z"
                opacity="0.9"
              />
              {/* Bee wings & body */}
              <ellipse cx="12" cy="12" rx="3" ry="4" />
              <path
                d="M7.8 9.5c.8-1.5 2.3-2.5 4.2-2.5s3.4 1 4.2 2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M10 11.5h4M9.5 13.5h5"
                stroke="#0D0E12"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-text-main mb-2">
            Bee<span className="text-brand-500">Router</span>
          </h1>
          <p className="text-text-muted text-sm max-w-xs">
            {samlAvailable
              ? "Sign in with SAML 2.0 Single Sign-On"
              : oidcAvailable
              ? "Sign in with your OIDC provider to access the Hive"
              : "Enter the Hive — Sign in to manage your AI Infrastructure"}
          </p>
        </div>

        {/* Card */}
        <Card className="bg-surface border border-border shadow-[var(--shadow-elevated)] rounded-[16px] p-6 sm:p-7">
          {mustChange ? (
            <form onSubmit={handleSetNewPassword} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                <span className="material-symbols-outlined text-[18px] shrink-0">lock_reset</span>
                <span>Set a new password before accessing the dashboard remotely.</span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-main">New password</label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
              <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={!newPassword}>
                Set password
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {samlAvailable && (
                <Button type="button" variant="primary" className="w-full" onClick={handleSamlLogin}>
                  {samlLoginLabel}
                </Button>
              )}

              {oidcAvailable && (
                <Button type="button" variant="primary" className="w-full" onClick={handleOidcLogin}>
                  {oidcLoginLabel}
                </Button>
              )}

              {ssoAvailable && passwordAvailable && <div className="h-px bg-border" />}

              {passwordAvailable ? (
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  {isSsoEnabled && !ssoAvailable && (
                    <div className="flex items-center gap-2 p-2.5 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                      <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
                      <span>
                        {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} login is enabled, but configuration is incomplete. Password login is still available for recovery.
                      </span>
                    </div>
                  )}

                  {authMode === "both" && ssoAvailable && (
                    <p className="text-xs text-text-muted text-center">
                      Password and {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} login are both enabled.
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-main">Password</label>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus={!oidcAvailable}
                    />
                    {error && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        {error}
                      </p>
                    )}
                    {retryAfter > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">timer</span>
                        Locked. Retry in <span className="font-mono font-bold">{retryAfter}s</span>.
                      </p>
                    )}
                    {resetHint && (
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        Forgot password? Open <code className="bg-surface-2 px-1.5 py-0.5 rounded border border-border text-brand-500 font-mono text-[11px]">beerouter</code> CLI on the host → <b>Settings</b> → <b>Reset Password to Default</b>.
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full mt-1"
                    loading={loading}
                    disabled={retryAfter > 0}
                  >
                    {retryAfter > 0 ? `Wait ${retryAfter}s` : "Login to Hive"}
                  </Button>

                  <p className="text-xs text-center text-text-muted mt-1">
                    Default password is <code className="bg-surface-2 px-1.5 py-0.5 rounded border border-border text-brand-500 font-mono">123456</code>
                  </p>
                  {hasPassword === false && (
                    <div className="flex items-center gap-1.5 p-2 rounded-[8px] bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 justify-center">
                      <span className="material-symbols-outlined text-[14px]">shield</span>
                      <span>Security risk: no password set. You will be asked to set one when logging in remotely.</span>
                    </div>
                  )}
                </form>
              ) : (
                error && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {error}
                  </p>
                )
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
