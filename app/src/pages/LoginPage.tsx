import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMeProgress, login } from "../api";
import { useAuthStore } from "../auth/useAuthStore";
import { useXpStore } from "../xp/useXpStore";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuthed = useAuthStore((s) => s.setAuthed);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);
  const setDefer = useAuthStore((s) => s.setDeferOnboardingThisSession);
  const navigate = useNavigate();

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
        setError("Login failed.");
      }
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-root">
      <div className="app-frame">
        <main className="app-main" style={{ display: "grid", placeItems: "center" }}>
          <div className="card" style={{ width: "min(420px, 92vw)" }}>
            <h2 className="page-title" style={{ marginBottom: 6 }}>Sign in</h2>
            <p className="muted" style={{ marginTop: 0 }}>Use your WordPress account.</p>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="muted">Username or email</span>
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
                <span className="muted">Password</span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={busy}
                  required
                />
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={busy}
                />
                <span className="muted">Keep me signed in</span>
              </label>

              {error && (
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Couldn’t sign in</div>
                  <div className="muted">{error}</div>
                </div>
              )}

              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
