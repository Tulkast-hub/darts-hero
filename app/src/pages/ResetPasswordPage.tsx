import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/auth/AuthCard";
import { confirmPasswordReset, requestPasswordReset } from "../api";
import { useI18n } from "../i18n/I18nProvider";

function getHashParam(name: string) {
  // Works with HashRouter. Example:
  // #/reset-password?uid=12&token=abc
  const hash = window.location.hash || "";
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return "";
  const qs = hash.slice(qIndex + 1);
  const params = new URLSearchParams(qs);
  return params.get(name) || "";
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const nav = useNavigate();

  const uid = useMemo(() => Number(getHashParam("uid") || 0), []);
  const token = useMemo(() => getHashParam("token"), []);

  const hasTokenFlow = uid > 0 && token.length > 10;

  // request state
  const [identifier, setIdentifier] = useState("");
  const [reqBusy, setReqBusy] = useState(false);
  const [reqMsg, setReqMsg] = useState<string | null>(null);

  // confirm state
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setReqMsg(null);
    setReqBusy(true);
    try {
      await requestPasswordReset(identifier.trim());
      // Always show a generic message (avoid user enumeration)
      setReqMsg("If an account exists, you’ll receive an email with reset instructions.");
    } catch {
      setReqMsg("If an account exists, you’ll receive an email with reset instructions.");
    } finally {
      setReqBusy(false);
    }
  }

  async function submitConfirm(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!pw1 || pw1.length < 6) {
      setErr(t("Password must be at least 6 characters."));
      return;
    }
    if (pw1 !== pw2) {
      setErr(t("Passwords do not match."));
      return;
    }

    setBusy(true);
    try {
      await confirmPasswordReset({ uid, token, new_password: pw1 });
      setDone(true);
      setTimeout(() => nav("/login", { replace: true }), 250);
    } catch (e: any) {
      setErr(e?.message || t("Failed to reset password."));
    } finally {
      setBusy(false);
    }
  }

  if (!hasTokenFlow) {
    // Request reset
    return (
      <AuthCard title={t("Reset password")} subtitle={t("Enter your username or email")}>
        <form onSubmit={submitRequest} style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted">{t("Username or email")}</span>
            <input
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={reqBusy}
              required
            />
          </label>

          {reqMsg && (
            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ fontWeight: 700 }}>
                {reqMsg}
              </div>
            </div>
          )}

          <button className="btn" type="submit" disabled={reqBusy}>
            {reqBusy ? t("Sending…") : t("Send reset link")}
          </button>

          <button
            type="button"
            className="btn outline"
            onClick={() => nav("/login")}
            disabled={reqBusy}
          >
            Back to login
          </button>
        </form>
      </AuthCard>
    );
  }

  // Confirm reset
  return (
    <AuthCard title={t("Set new password")} subtitle={t("Choose a new password")}>
      <form onSubmit={submitConfirm} style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted">{t("New password")}</span>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPw ? "text" : "password"}
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              disabled={busy}
              required
              style={{ paddingRight: 86 }}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="btn outline"
              onClick={() => setShowPw((v) => !v)}
              disabled={busy}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                padding: "8px 10px",
                fontWeight: 800,
                borderRadius: 12,
              }}
            >
              {showPw ? "Hide" : "View"}
            </button>
          </div>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted">{t("Repeat new password")}</span>
          <input
            className="input"
            type={showPw ? "text" : "password"}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            disabled={busy}
            required
            autoComplete="new-password"
          />
        </label>

        {err && (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("Couldn’t reset password")}</div>
            <div className="muted">{err}</div>
          </div>
        )}

        {done && (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 800 }}>{t("Password updated.")}</div>
            <div className="muted">{t("Redirecting to login…")}</div>
          </div>
        )}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? t("Saving…") : t("Set new password")}
        </button>
      </form>
    </AuthCard>
  );
}