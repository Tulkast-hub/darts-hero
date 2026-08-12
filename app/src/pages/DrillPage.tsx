// src/pages/DrillPage.tsx
import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useNavigate, useParams } from "react-router-dom";

import { getDrillDef } from "../drills/registry";

import { startSession, endSession } from "../api";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
import { useXpStore } from "../xp/useXpStore";
import { loadXpState, saveXpState } from "../xp/store";
import type { DrillResult, Tier, XpCategory } from "../xp/types";
import { useAbortStore } from "../session/useAbortStore";
import { useAuthStore } from "../auth/useAuthStore";

type FinishResult = {
  payload: any;
  win: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  scoring: "Scoring",
  finishing: "Finishing",
  doubles: "Doubling",
  bull: "Bull",
  other: "Other",
};

export default function DrillPage() {
  const { t } = useI18n();
  const { key } = useParams();
  const nav = useNavigate();

  const setXpState = useXpStore((s) => s.setState);
  const xpState = useXpStore((s) => s.state);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const setAbortHandler = useAbortStore((s) => s.setHandler);
  const status = useAuthStore((s) => s.status);

  const drillKey = key || "";

  // While inside a drill, make the global back button behave like "Abort".
  useEffect(() => {
    if (!drillKey) return;

    // If not authed, go to login (this removes WP dependency)
    if (status !== "authed") {
      nav("/login", { replace: true });
      return;
    }

    setSessionId(null);
    setShowRules(true);
    setLoading(true);

    startSession(drillKey)
      .then(({ id }) => setSessionId(id))
      .catch((e) => {
        // If session start fails due to auth/cookie issues, send to login
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("not authenticated")) {
          nav("/login", { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [drillKey, status, nav]);

  const drillDef = getDrillDef(drillKey);

  // Rank for THIS drill (drives tier/level to be used by the drill to set objectives)
  const drillXp = xpState.drillXp?.[drillKey] ?? 0;
  const drillRank = getRankStateFromXp(drillXp, XP_CAPS.drillTierMax, "Bronze");
  const currentTier: Tier = drillRank.tier;
  const currentLevel: number = drillRank.level;

  // Start a new session whenever the drill key changes
  useEffect(() => {
    if (!drillKey) return;

    setSessionId(null);
    setShowRules(true);
    setLoading(true);

    startSession(drillKey)
      .then(({ id }) => setSessionId(id))
      .finally(() => setLoading(false));
  }, [drillKey]);

  const title = drillDef?.title ?? "Drill";

  async function handleFinish(resultIn: FinishResult) {
    if (!sessionId || !drillKey) return;

    setLoading(true);
    try {
      const xpBeforeState = loadXpState();
      const drillResult = toDrillResult(drillKey, resultIn.win, resultIn.payload);

      // Server is the source of truth for XP/progression (syncs across devices).
      const res = await endSession(sessionId, drillKey, resultIn.payload, drillResult);

      const xpAfterState = res.xpState;
      saveXpState(xpAfterState as any);
      setXpState(xpAfterState as any);

      const cat = drillResult.category;
      const xpAward = {
        total: res.xp,
        byCategory: {
          scoring: 0,
          finishing: 0,
          doubles: 0,
          bull: 0,
          other: 0,
          [cat]: res.xp,
        } as any,
        breakdown: [{ label: "Session XP", xp: res.xp }],
        multiplier: 1,
      };

      nav(`/result/${drillKey}`, {
        state: {
          win: resultIn.win,
          xp: res.xp,
          xpAward,
          xpBeforeState,
          xpAfterState,
          drillResult,
          payload: resultIn.payload,
          drillKey,
        },
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line no-console
    console.log("DRILL PAYLOAD", resultIn.payload);
  }

  function requestAbort() {
    setShowAbortConfirm(true);
  }

  // While inside a drill, make the global NavBar back button behave like "Abort".
  useEffect(() => {
    setAbortHandler(() => requestAbort);
    return () => setAbortHandler(null);
    // We intentionally re-register when the drill changes.
  }, [setAbortHandler, drillKey]);

  async function handleAbortConfirm() {
    setShowAbortConfirm(false);

    if (!sessionId || !drillKey) {
      nav(-1);
      return;
    }

    setLoading(true);
    try {
      const xpBeforeState = loadXpState();
      const drillResult = toDrillResult(drillKey, false, { aborted: true });
      const res = await endSession(sessionId, drillKey, { aborted: true }, drillResult);

      const xpAfterState = res.xpState;
      saveXpState(xpAfterState as any);
      setXpState(xpAfterState as any);

      const cat = drillResult.category;
      const xpAward = {
        total: res.xp,
        byCategory: {
          scoring: 0,
          finishing: 0,
          doubles: 0,
          bull: 0,
          other: 0,
          [cat]: res.xp,
        } as any,
        breakdown: [{ label: "Session XP", xp: res.xp }],
        multiplier: 1,
      };

      nav(`/result/${drillKey}`, {
        state: {
          win: false,
          xp: res.xp,
          xpAward,
          xpBeforeState,
          xpAfterState,
          drillResult,
          payload: { aborted: true },
          drillKey,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  function toTier(v: any): Tier {
    if (v === "Bronze" || v === "Silver" || v === "Gold" || v === "Platinum" || v === "Diamond") return v;
    return "Bronze";
  }

  function toDrillResult(k: string, win: boolean, payload: any): DrillResult {
    const tier = toTier(payload?.tier);
    const level = typeof payload?.level === "number" ? payload.level : 1;

    const throws_used =
      payload?.throws_used ?? payload?.throwsUsed ?? payload?.throws ?? payload?.darts_used ?? undefined;

    const max_throws =
      payload?.max_throws ?? payload?.maxThrows ?? payload?.max_throws_total ?? payload?.maxThrowsTotal ?? undefined;

    let progress: number | undefined = typeof payload?.progress === "number" ? payload.progress : undefined;

    let objective: { label: string; current?: number; target?: number; unit?: string } | undefined;

    if (progress == null) {
      if (k === "checkouts_popular_leaves") {
        const cur = payload?.total_checkouts ?? payload?.totalCheckouts;
        const req = payload?.required_checkouts ?? payload?.requiredCheckouts;
        if (typeof cur === "number" && typeof req === "number" && req > 0) progress = cur / req;
      }

      if (k === "scoring_ladder") {
        const cur = payload?.current_step;
        const goal = payload?.goal_steps;
        if (typeof cur === "number" && typeof goal === "number" && goal > 0) progress = cur / goal;
      }

      if (k === "scoring_bingo") {
        const cc = payload?.completed_count;
        if (typeof cc === "number") progress = cc / 9;
      }

      if (k === "t20_scoring") {
        const points = payload?.total_points ?? payload?.points ?? payload?.total;
        const target = payload?.target_points ?? payload?.target;
        if (typeof points === "number" && typeof target === "number" && target > 0) progress = points / target;
      }
    }

    if (k === "checkouts_popular_leaves") {
      const current = payload?.total_checkouts ?? payload?.totalCheckouts;
      const target = payload?.required_checkouts ?? payload?.requiredCheckouts;
      if (typeof current === "number" && typeof target === "number") objective = { label: "Checkouts", current, target, unit: "outs" };
    } else if (k === "scoring_ladder") {
      const current = payload?.current_step;
      const target = payload?.goal_steps;
      if (typeof current === "number" && typeof target === "number") objective = { label: "Steps", current, target, unit: "steps" };
    } else if (k === "scoring_bingo") {
      const current = payload?.completed_count;
      if (typeof current === "number") objective = { label: "Tiles", current, target: 9, unit: "tiles" };
    } else if (k === "t20_scoring") {
      const current = payload?.total_points ?? payload?.points ?? payload?.total;
      const target = payload?.target_points ?? payload?.target;
      if (typeof current === "number" && typeof target === "number") objective = { label: "Target points", current, target, unit: "pts" };
    }

    // Force Bull Out into doubles (defensive: ensures XP category always matches registry intent)
    const forcedCategory: XpCategory | undefined =
      k === "bull_out" ? "doubles" : undefined;

    return {
      game_key: k,
      category: forcedCategory ?? drillDef?.category ?? "other",
      tier,
      level,
      win,
      aborted: Boolean(payload?.aborted),
      throws_used: typeof throws_used === "number" ? throws_used : undefined,
      max_throws: typeof max_throws === "number" ? max_throws : undefined,
      progress: typeof progress === "number" ? progress : undefined,
      objective,
      stats: payload ?? undefined,
    };
  }

  // NavBar back integration
  useEffect(() => {
    function onDrillBack() {
      if (showRules) nav(-1);
      else requestAbort();
    }
    window.addEventListener("dt-drill-back", onDrillBack);
    return () => window.removeEventListener("dt-drill-back", onDrillBack);
  }, [showRules, nav]);

  if (!drillKey || !drillDef) {
    return (
      <div className="page">
        <div className="card">
          <p>{t("Unknown drill.")}</p>
        </div>
      </div>
    );
  }

  const Component = drillDef.Component;
  const Rules = drillDef.Rules;

  return (
    <div className="page">
      {/* Game surface */}
      <Component onFinish={handleFinish} disabled={loading || showRules} tier={currentTier} level={currentLevel} />

      {/* Abort button */}
      <div style={{ marginTop: 12 }}>
        <button className="btn danger" onClick={requestAbort}>
          Abort game
        </button>
      </div>

      {/* Rules modal */}
      {showRules && (
        <div className="overlay open">
          <div className="overlay-inner">
            <div className="overlay-panel">
              <div className="overlay-panel-head">
                <div className="overlay-panel-title">
                  <h3 style={{ margin: 0 }}>{t(drillDef.title)}</h3>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {t(drillDef.blurb)}
                  </div>
                </div>

                <div className="pill pill-stat overlay-badge">
                  <div className="pill-label">{t("Category")}</div>
                  <div className="pill-value">
                    {t(CATEGORY_LABELS[drillDef.category] ?? drillDef.category)}
                  </div>
                </div>
              </div>

              <div className="overlay-rules" style={{ marginTop: 12 }}>
                <Rules />
              </div>

              <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn outline" onClick={() => nav("/")}>{t("Back to Home")}</button>
                <button
                  className="btn"
                  style={{ marginLeft: 8 }}
                  onClick={() => setShowRules(false)}
                  disabled={loading || !sessionId}
                >
                  {t("Start game")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Abort confirm modal */}
      {showAbortConfirm && (
        <div className="overlay open">
          <div className="overlay-panel">
            <h3>{t("Abort game?")}</h3>
            <p className="muted">
              {t("Are you sure you want to abort? This counts as a loss and you will lose XP.")}
            </p>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn outline" onClick={() => setShowAbortConfirm(false)}>
                {t("No, continue")}
              </button>
              <button className="btn danger" style={{ marginLeft: 8 }} onClick={handleAbortConfirm}>
                {t("Yes, abort")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
