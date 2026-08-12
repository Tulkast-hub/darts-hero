import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import { getMeProgress, login } from "../api";
import { useAuthStore } from "../auth/useAuthStore";
import { useXpStore } from "../xp/useXpStore";
import AuthCard from "../components/auth/AuthCard";

export default function LoginPage() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuthed = useAuthStore((s) => s.setAuthed);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);
  const setDefer = useAuthStore((s) => s.setDeferOnboardingThisSession);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await login(username.trim(), password, remember);
      if (res?.ok && res.user?.id) {
        // Hydrate server-synced progression right after login.
        try {
          const prog = await getMeProgress();
          if (typeof prog?.needsOnboarding !== "undefined") {
            setNeedsOnboarding(!!prog.needsOnboarding);
            setDefer(false);
          }
          if (prog?.xpState) {
            useXpStore.getState().setState(prog.xpState as any);
          }
        } catch {
          // ignore; local cache will be used
        }

        setAuthed({ id: res.user.id });
        navigate("/", { replace: true });
      } else {
        setError(t("Login failed."));
      }
    } catch (err: any) {
      setError(err?.message || t("Login failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title={t("Sign in")}
      subtitle={t("Sign in to continue")}
    >
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="muted">{t("Username")}</span>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={busy}
                required
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span className="muted">{t("Password")}</span>
              <div style={{ position: "relative" }}>
  <input
    className="input"
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    autoComplete="current-password"
    disabled={busy}
    required
    style={{ paddingRight: 42 }}
  />

  <button
    type="button"
    onClick={() => setShowPassword((v) => !v)}
    disabled={busy}
    aria-label={showPassword ? t("Hide password") : t("Show password")}
    style={{
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--muted)",
    }}
  >
    {showPassword ? t("Hide") : t("Show")}
  </button>
</div>

            </label>
            <a
  href="#/password/reset"
  className="muted"
  style={{
    textAlign: "right",
    fontSize: 13,
    fontWeight: 600,
  }}
>
  {t("Forgot password?")}
</a>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={busy}
              />
              <span className="muted">{t("Keep me signed in")}</span>
            </label>

            {error && (
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("Couldn’t sign in")}</div>
                <div className="muted">{error}</div>
              </div>
            )}

            <button className="btn" type="submit" disabled={busy}>
              {busy ? t("Signing in…") : t("Sign in")}
            </button>

            <a className="muted" href="#/admin/create-user" style={{ textAlign: "center", fontWeight: "bold", textDecoration: "underline" }}>
              {t("Create User")}
            </a>
          </form>
        </AuthCard>
  );
}
