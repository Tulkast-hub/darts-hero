import React, { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useNavigate } from "react-router-dom";
import { adminCreateUser } from "../api";
import AuthCard from "../components/auth/AuthCard";

export default function CreateUserPage() {
  const { t } = useI18n();
  const nav = useNavigate();

  const [adminKey, setAdminKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: number; username: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!adminKey.trim()) return setError("Admin key is required.");
    if (!username.trim()) return setError("Username is required.");
    if (!password) return setError("Password is required.");

    setBusy(true);
    try {
      const res = await adminCreateUser({
        admin_key: adminKey.trim(),
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        display_name: displayName.trim() || undefined,
      });

      if (!res?.user?.id) throw new Error("Create user failed (no user returned).");
      setSuccess({ id: res.user.id, username: res.user.username });
      setPassword("");
    } catch (err: any) {
      setError(err?.message || "Failed to create user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create user (Staging)"
      subtitle="This is for staging only. Requires an admin key."
    >
      <form onSubmit={onSubmit} className="auth-form">
        <label className="auth-label">
          Admin key
          <input className="auth-input" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
        </label>

        <label className="auth-label">
          Username
          <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>

        <label className="auth-label">
          Password
          <input className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" />
        </label>

        <label className="auth-label">
          Email (optional)
          <input className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
        </label>

        <label className="auth-label">
          Display name (optional)
          <input className="auth-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
        </label>

        {error ? <div className="auth-error">{error}</div> : null}
        {success ? (
          <div className="auth-success">
            ✅ User created: <b>{success.username}</b> (ID: {success.id})
          </div>
        ) : null}

        <div className="auth-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Creating..." : t("Create user")}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => nav("/login")} disabled={busy}>
            Go to login
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
