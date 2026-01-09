import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminCreateUser } from "../api";

export default function CreateUserPage() {
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

      setSuccess({ id: res.user.id, username: res.user.username });

      // Optional: clear password after success
      setPassword("");
    } catch (err: any) {
      setError(err?.message || "Failed to create user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Create User (Staging)</h1>
        <p style={{ opacity: 0.8 }}>
          This page is for staging only. It requires an admin key.
        </p>

        <form onSubmit={onSubmit}>
          <label style={{ display: "block", marginTop: 12 }}>
            Admin key
            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              autoComplete="off"
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            Email (optional)
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            Display name (optional)
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>

          {error && (
            <div style={{ marginTop: 12, color: "crimson" }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ marginTop: 12 }}>
              ✅ User created: <b>{success.username}</b> (ID: {success.id})
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create user"}
            </button>

            <button
              type="button"
              onClick={() => nav("/login")}
              disabled={busy}
            >
              Go to login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
