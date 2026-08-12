// src/drills/Finish25.tsx
import React, { useMemo, useState } from "react";
import DartboardHighlight from "../ui/DartboardHighlight";
import type { Tier } from "../xp/types";

type FinishResult = {
  payload: any;
  win: boolean;
};

type Props = {
  onFinish: (result: FinishResult) => void;
  disabled?: boolean;
  tier: Tier;
  level: number;
  onDartsUsed?: (count: number) => void;
  externalUndo?: { token: number; steps: number };
};

type RankConfig25 = {
  labelLong: string;
  objectiveShort: string;
  targetFinishes: number;
  ruleDetail?: string;
};

type VisitEvent = {
  isHit: boolean; // true = finished 25 this visit, false = miss
  darts: number; // 1..3 (last visit can be partial)
};

const TARGET_SCORE = 25;

// One click = one throw/visit (3 darts)
const DARTS_PER_VISIT = 3;

// You want 40 throws total:
const MAX_THROWS = 40;

// Derived dart cap (so it is always consistent):
const MAX_DARTS = MAX_THROWS * DARTS_PER_VISIT; // 120 darts


/* ------------------ RANK CONFIG ----------------------- */

function makeConfig(
  labelLong: string,
  threshold: number,
  mode: "single_odd" | "double" | "any"
): RankConfig25 {
  const targetFinishes = threshold + 1;

  let objectiveShort = `${targetFinishes} checkouts`;
  let ruleDetail: string | undefined;

  if (mode === "single_odd") {
    objectiveShort = `${targetFinishes} checkouts (single odd out)`;
    ruleDetail =
      "Single odd out: hit an even number, then an odd number to finish 25.";
  }

  // As requested: no "(double out)" suffix shown.
  return { labelLong, objectiveShort, targetFinishes, ruleDetail };
}

function getRankConfig25(tier: Tier, level: number): RankConfig25 {
  if (tier === "Bronze") {
    return level <= 3
      ? makeConfig("Above 10 finishes, single odd out", 10, "single_odd")
      : makeConfig("Above 15 finishes, single odd out", 15, "single_odd");
  }

  if (tier === "Silver") {
    return level <= 3
      ? makeConfig("Above 5 finishes", 5, "double")
      : makeConfig("Above 7 finishes", 7, "double");
  }

  if (tier === "Gold") {
    return level <= 3
      ? makeConfig("Above 10 finishes", 10, "any")
      : makeConfig("Above 12 finishes", 12, "any");
  }

  if (tier === "Platinum") {
    return makeConfig("Above 15 finishes", 15, "any");
  }

  return makeConfig("Above 20 finishes", 20, "any");
}

/* ------------------ HELPERS ----------------------- */

function computeStats(events: VisitEvent[]) {
  const throwsUsed = events.length;
  const dartsUsed = events.reduce((sum, e) => sum + (e.darts || 0), 0);
  const checkoutCount = events.filter((e) => e.isHit).length;

  let currentStreak = 0;
  let bestStreak = 0;
  for (const ev of events) {
    if (ev.isHit) {
      currentStreak += 1;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  const accuracy =
    throwsUsed > 0 ? Math.round((checkoutCount / throwsUsed) * 100) : 0;

  const avgDartsPerCheckout =
    checkoutCount > 0 ? (dartsUsed / checkoutCount).toFixed(1) : "—";

  return {
    throwsUsed,
    dartsUsed,
    checkoutCount,
    accuracy,
    bestStreak,
    avgDartsPerCheckout,
  };
}

/* ------------------ COMPONENT ----------------------- */

export default function Finish25({ onFinish, disabled, tier, level, onDartsUsed, externalUndo }: Props) {
  const rankConfig = useMemo(() => getRankConfig25(tier, level), [tier, level]);

  const [visitHistory, setVisitHistory] = useState<VisitEvent[]>([]);
  const [finished, setFinished] = useState(false);

  const {
    throwsUsed,
    dartsUsed,
    checkoutCount,
    accuracy,
    bestStreak,
    avgDartsPerCheckout,
  } = computeStats(visitHistory);

  const throwsLeft = Math.max(0, MAX_THROWS - throwsUsed);

  function hasReachedObjective(newCheckoutCount: number): boolean {
    return newCheckoutCount >= rankConfig.targetFinishes;
  }

  function finishGame(win: boolean, history: VisitEvent[]) {
    if (finished) return;
    setFinished(true);

    const stats = computeStats(history);

    const payload = {
      game_key: "checkout_25_repeat",
      tier,
      level,
      win,

      // Backend expects darts-based fields for Great Win ratio checks
      throws_used: stats.dartsUsed,
      max_throws: MAX_DARTS,

      single_finishes: 0,
      double_finishes: 0,
      total_finishes: stats.checkoutCount,

      objective: {
        label: "Checkouts",
        target: rankConfig.targetFinishes,
        progress: stats.checkoutCount,
      },
      stats: {
        accuracy: stats.accuracy,
        checkout_count: stats.checkoutCount,
        best_streak: stats.bestStreak,
        throws_used: stats.throwsUsed,
        darts_used: stats.dartsUsed,
        avg_darts_per_checkout: stats.avgDartsPerCheckout,
      },
    };

    onFinish({ payload, win });
  }

  function applyVisit(isHit: boolean) {
    if (disabled || finished) return;

    const remaining = Math.max(0, MAX_DARTS - dartsUsed);
    if (remaining <= 0) return;

    const dartsThisVisit = Math.min(DARTS_PER_VISIT, remaining);
    if (dartsThisVisit <= 0) return;

    onDartsUsed?.(dartsThisVisit);

    const newHistory = [...visitHistory, { isHit, darts: dartsThisVisit }];
    const stats = computeStats(newHistory);

    setVisitHistory(newHistory);

    const outOfDarts = stats.dartsUsed >= MAX_DARTS;
    const targetReached = hasReachedObjective(stats.checkoutCount);

    if (targetReached || outOfDarts) {
      finishGame(targetReached, newHistory);
    }
  }

  function handleUndo() {
    if (disabled || finished) return;
    if (visitHistory.length === 0) return;
    setVisitHistory((h) => h.slice(0, -1));
  }

  React.useEffect(() => {
    if (!externalUndo) return;
    if (externalUndo.steps <= 0) return;
    const t = window.setTimeout(() => {
      for (let i = 0; i < externalUndo.steps; i++) {
        handleUndo();
      }
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUndo?.token]);

  React.useEffect(() => {
    if (!externalUndo) return;
    if (externalUndo.steps <= 0) return;
    const t = window.setTimeout(() => {
      for (let i = 0; i < externalUndo.steps; i++) {
        handleUndo();
      }
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUndo?.token]);

  // Disable input when the drill is finished or the dart limit is reached.
  const buttonsDisabled = disabled || finished || dartsUsed >= MAX_DARTS;
  const canUndo = !disabled && !finished && visitHistory.length > 0;

  return (
    <div className="bullout">
      {/* header */}
      <div className="bullout-header">
        <div>
          <div className="muted">Finish 25 · 3 darts per visit</div>
        </div>
        <div className="objective-pill">
          <div className="objective-label">Objective</div>
          <div className="objective-value">{rankConfig.objectiveShort}</div>
        </div>
      </div>
          {/* Board */}
          <DartboardHighlight segments={[]} />

          {/* Target label (same style as your earlier version) */}
          <div
            style={{
              marginTop: 12,
              marginBottom: 16,
              fontSize: 16,
              fontWeight: 600,
              textAlign: "center",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            TARGET {TARGET_SCORE}
          </div>
      {/* main row: board left, stats right */}
      <div className="bullout-main">
        <div
          className="bull-board-wrapper card"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >


          {/* Controls (under board, on the left) */}
          <div className="checkout25-controls" data-hotkeys="drill">
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn success"
                style={{ flex: 1, minWidth: 140 }}
                disabled={buttonsDisabled}
                data-hotkey="1"
            onClick={() => applyVisit(true)}
              >
                Check
              </button>
              <button
                className="btn secondary"
                style={{ flex: 1, minWidth: 140 }}
                disabled={buttonsDisabled}
                data-hotkey="2"
            onClick={() => applyVisit(false)}
              >
                Bust/Miss
              </button>
              <button
                className="btn outline"
                style={{ flex: 1, minWidth: 140 }}
                disabled={!canUndo}
                data-hotkey="0"
	                onClick={handleUndo}
	              >
                Undo
              </button>
            </div>
          </div>
        </div>

        {/* Stats (right) */}
        <div className="bullout-stats card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="small muted">Checkouts</div>
              <div className="title-lg">{checkoutCount}</div>
            </div>
            <div>
              <div className="small muted">Throws left</div>
              <div className="title-lg">{throwsLeft}</div>
            </div>
            <div>
              <div className="small muted">Avg darts / checkout</div>
              <div className="title-lg">{avgDartsPerCheckout}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">Accuracy</div>
                <div className="pill-value">{accuracy}%</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Target</div>
                <div className="pill-value">{TARGET_SCORE}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Checkout streak</div>
                <div className="pill-value">{bestStreak}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* (Optional) Keep dartsUsed in state for debugging if needed:
          dartsUsed={dartsUsed} / MAX_DARTS={MAX_DARTS}
      */}
    </div>
  );
}
