// src/pages/OnboardingPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout, submitOnboardingChoice } from "../api";
import { useAuthStore } from "../auth/useAuthStore";
import { useXpStore } from "../xp/useXpStore";
import { useI18n } from "../i18n/I18nProvider";

type Choice = "new_player" | "advanced_player" | "later";

function OnboardCard({
  accent,
  title,
  subtitle,
  body,
  onClick,
  disabled,
  loading,
}: {
  accent: "scoring" | "doubles" | "finishing";
  title: string;
  subtitle: string;
  body: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`onboard-card accent-${accent}`}
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading ? "true" : "false"}
    >
      <div className="onboard-card-inner">
        <div className="onboard-card-title">{title}</div>
        <div className="onboard-card-subtitle">{subtitle}</div>
        <div className="onboard-card-body">{body}</div>
      </div>

      {loading && <div className="onboard-card-loading">{t("Saving…")}</div>}
    </button>
  );
}

export default function OnboardingPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [busy, setBusy] = useState<Choice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);
  const setDefer = useAuthStore((s) => s.setDeferOnboardingThisSession);
  const setGuest = useAuthStore((s) => s.setGuest);
  const setXpState = useXpStore((s) => s.setState);

  async function handleLogout() {
    if (busy) return;
    setError(null);

    try {
      setBusy("later");
      await logout();
    } catch {
      // ignore
    } finally {
      setGuest();
      setXpState({
        totalXp: 0,
        categoryXp: {
          scoring: 0,
          finishing: 0,
          doubles: 0,
          bull: 0,
          other: 0,
        },
        drillXp: {},
      } as any);

      nav("/login", { replace: true });
      setBusy(null);
    }
  }

  async function pick(choice: Choice) {
    if (busy) return;
    setError(null);

    if (choice === "later") {
      setDefer(true);
      nav("/", { replace: true });
      return;
    }

    try {
      setBusy(choice);
      const res = await submitOnboardingChoice(choice);
      if (res?.xpState) setXpState(res.xpState);

      setNeedsOnboarding(false);
      setDefer(false);
      nav("/", { replace: true });
    } catch (e: any) {
      setError(
        e?.message
          ? String(e.message)
          : "Failed to save your choice. Please try again."
      );
    } finally {
      setBusy(null);
    }
  }

  const isBusy = !!busy;

  return (
      <div className="app-root">
        {/* vertically centered container like Login */}
        <div className="page page-centered">
          <div className="card onboard-card-shell">
            <div
              className="row"
              style={{ justifyContent: "flex-end", marginBottom: 12 }}
            >
              <button
                className="btn outline"
                type="button"
                onClick={handleLogout}
                disabled={isBusy}
              >
                Log out
              </button>
            </div>

            <h1 className="page-title" style={{ marginTop: 0 }}>
              Quick setup
            </h1>
            <p className="page-subtitle">
              This helps us start you at a sensible rank. You can change how you
              train later.
            </p>

            {error && (
              <div className="card" style={{ marginTop: 12 }}>
                <div className="muted danger-text">{error}</div>
              </div>
            )}

            <div className="onboard-card-list">
              <OnboardCard
                accent="scoring"
                title="New player"
                subtitle="Start at Bronze I"
                body="You’re building fundamentals or you’re new to structured practice. You’ll progress from the basics and unlock difficulty naturally."
                onClick={() => pick("new_player")}
                disabled={isBusy}
                loading={busy === "new_player"}
              />

              <OnboardCard
                accent="doubles"
                title="Advanced player"
                subtitle="Start at Silver I"
                body="You already have solid consistency and want tougher targets sooner. We’ll start you one tier higher so sessions feel challenging right away."
                onClick={() => pick("advanced_player")}
                disabled={isBusy}
                loading={busy === "advanced_player"}
              />

              <OnboardCard
                accent="finishing"
                title="Choose later"
                subtitle="Ask me again next login"
                body="Skip this for now. We’ll show this screen again the next time you log in."
                onClick={() => pick("later")}
                disabled={isBusy}
                loading={busy === "later"}
              />
            </div>

            {isBusy && (
              <div className="muted small" style={{ marginTop: 12 }}>
                Saving…
              </div>
            )}
          </div>
        </div>
      </div>
  );
}