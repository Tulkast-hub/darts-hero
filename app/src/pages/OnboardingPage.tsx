import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout, submitOnboardingChoice } from "../api";
import { useAuthStore } from "../auth/useAuthStore";
import { useXpStore } from "../xp/useXpStore";

type Choice = "new_player" | "advanced_player" | "later";

function Option({
  title,
  subtitle,
  body,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  body: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="onboard-option"
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <div className="onboard-option-head">
        <div className="onboard-option-title">{title}</div>
        <div className="onboard-option-subtitle">{subtitle}</div>
      </div>
      <div className="onboard-option-body">{body}</div>
    </button>
  );
}

export default function OnboardingPage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState<Choice | null>(null);

  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);
  const setDefer = useAuthStore((s) => s.setDeferOnboardingThisSession);
  const setGuest = useAuthStore((s) => s.setGuest);
  const setXpState = useXpStore((s) => s.setState);

  async function handleBack() {
    // Treat "Back" as "Choose later" for this session so the user doesn't get stuck in a loop.
    setDefer(true);
    nav("/", { replace: true });
  }

  async function handleLogout() {
    if (busy) return;
    try {
      setBusy("later");
      await logout();
    } catch {
      // even if logout fails, drop local auth state so the UI doesn't stay stuck
    } finally {
      setGuest();
      // Clear local XP mirror so another user on the same device won't see it.
      setXpState({
        totalXp: 0,
        categoryXp: { scoring: 0, finishing: 0, doubles: 0, bull: 0, other: 0 },
        drillXp: {},
      } as any);
      nav("/login", { replace: true });
      setBusy(null);
    }
  }

  async function pick(choice: Choice) {
    if (busy) return;

    if (choice === "later") {
      // Skip this screen for the remainder of this login session.
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
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page onboard">
      <div className="onboard-header">
        <div className="onboard-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={handleBack}
            disabled={!!busy}
          >
            Back
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={handleLogout}
            disabled={!!busy}
          >
            Log out
          </button>
        </div>

        <h1 className="page-title">Quick setup</h1>
        <p className="page-subtitle">
          This helps us start you at a sensible rank. You can change how you train later.
        </p>
      </div>

      {/* NEW: match Categories layout */}
      <div className="stack-wrap">
        <div className="stack-list">
          <Option
            title="New player"
            subtitle="Start at Bronze I"
            body="You’re building fundamentals or you’re new to structured practice. You’ll progress from the basics and unlock difficulty naturally."
            onClick={() => pick("new_player")}
            disabled={!!busy}
          />
          <Option
            title="Advanced player"
            subtitle="Start at Silver I"
            body="You already have solid consistency and want tougher targets sooner. We’ll start you one tier higher so sessions feel challenging right away."
            onClick={() => pick("advanced_player")}
            disabled={!!busy}
          />
          <Option
            title="Choose later"
            subtitle="Ask me again next login"
            body="Skip this for now. We’ll show this screen again the next time you log in."
            onClick={() => pick("later")}
            disabled={!!busy}
          />
        </div>
      </div>

      {busy && <div className="onboard-busy">Saving…</div>}
    </div>
  );
}
