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
};

type RankConfig25 = {
  labelLong: string;         // full description of the rank goal
  objectiveShort: string;    // text shown in the objective pill (e.g. "6 checkouts (double out)")
  targetFinishes: number;    // number of checkouts needed to win
};

type VisitEvent = {
  isHit: boolean; // true = finished 25 this visit, false = bust
};

const TARGET_SCORE = 25;
// In this drill, one "throw" = one dart. A visit is always 3 darts.
const MAX_THROWS = 90; // 30 visits (3 darts each)

/* ------------------ RANK CONFIG ----------------------- */

function makeConfig(
  labelLong: string,
  threshold: number,
  mode: "single" | "double" | "any"
): RankConfig25 {
  // "Above X finishes" → need X+1 checkouts
  const targetFinishes = threshold + 1;

  let suffix = "";
  if (mode === "single") suffix = " (single out)";
  if (mode === "double") suffix = " (double out)";

  return {
    labelLong,
    objectiveShort: `${targetFinishes} checkouts${suffix}`,
    targetFinishes,
  };
}

function getRankConfig25(tier: Tier, level: number): RankConfig25 {
  if (tier === "Bronze") {
    if (level <= 3) {
      return makeConfig("Above 10 finishes, single checkout", 10, "single");
    }
    return makeConfig("Above 15 finishes, single checkout", 15, "single");
  }

  if (tier === "Silver") {
    if (level <= 3) {
      return makeConfig("Above 5 finishes, double out", 5, "double");
    }
    return makeConfig("Above 7 finishes, double out", 7, "double");
  }

  if (tier === "Gold") {
    if (level <= 3) {
      return makeConfig("Above 10 finishes", 10, "any");
    }
    return makeConfig("Above 12 finishes", 12, "any");
  }

  if (tier === "Platinum") {
    return makeConfig("Above 15 finishes", 15, "any");
  }

  // Diamond
  return makeConfig("Above 20 finishes", 20, "any");
}

/* ------------------ HELPERS ----------------------- */

function computeStats(events: VisitEvent[]) {
  const legsPlayed = events.length;
  const dartsUsed = legsPlayed * 3;
  const checkoutCount = events.filter((e) => e.isHit).length;

  // streaks
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
    legsPlayed > 0 ? Math.round((checkoutCount / legsPlayed) * 100) : 0;

  const avgDartsPerCheckout =
    checkoutCount > 0 ? (dartsUsed / checkoutCount).toFixed(1) : "—";

  return {
    legsPlayed,
    dartsUsed,
    checkoutCount,
    accuracy,
    bestStreak,
    avgDartsPerCheckout,
  };
}

/* ------------------ COMPONENT ----------------------- */

export default function Finish25({ onFinish, disabled, tier, level }: Props) {
  const rankConfig = useMemo(
    () => getRankConfig25(tier, level),
    [tier, level]
  );

  const [visitHistory, setVisitHistory] = useState<VisitEvent[]>([]);
  const [finished, setFinished] = useState(false);

  const {
    legsPlayed,
    dartsUsed,
    checkoutCount,
    accuracy,
    bestStreak,
    avgDartsPerCheckout,
  } = computeStats(visitHistory);

  const dartsLeft = MAX_THROWS - dartsUsed;
  const legsTotal = MAX_THROWS / 3;

  /* ---------- WIN / FINISH LOGIC ---------- */

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
      // Normalized fields used by the WP backend XP calculation
      throws_used: stats.dartsUsed,
      max_throws: MAX_THROWS,

      // legacy-style fields
      single_finishes: 0,
      double_finishes: 0,
      total_finishes: stats.checkoutCount,

      // Objective + stats (used by the Results page)
      objective: {
        label: "Checkouts",
        target: rankConfig.targetFinishes,
        progress: stats.checkoutCount,
      },
      stats: {
        accuracy: stats.accuracy,
        checkout_count: stats.checkoutCount,
        best_streak: stats.bestStreak,
        legs_played: stats.legsPlayed,
        avg_darts_per_checkout: stats.avgDartsPerCheckout,
      },
    };

    onFinish({ payload, win });
  }

  function applyVisit(isHit: boolean) {
    const newHistory = [...visitHistory, { isHit }];
    const stats = computeStats(newHistory);

    const outOfDarts = stats.dartsUsed >= MAX_THROWS;
    const targetReached = hasReachedObjective(stats.checkoutCount);

    setVisitHistory(newHistory);

    if (targetReached || outOfDarts) {
      const win = targetReached;
      finishGame(win, newHistory);
    }
  }

  /* ---------- HANDLERS ---------- */

  function handleCheck() {
    if (disabled || finished) return;
    if (dartsUsed >= MAX_THROWS) return;
    applyVisit(true);
  }

  function handleBust() {
    if (disabled || finished) return;
    if (dartsUsed >= MAX_THROWS) return;
    applyVisit(false);
  }

  function handleUndo() {
    if (disabled || finished) return;
    if (visitHistory.length === 0) return;
    const newHistory = visitHistory.slice(0, -1);
    setVisitHistory(newHistory);
  }

  const buttonsDisabled = disabled || finished || dartsUsed >= MAX_THROWS;
  const canUndo = !disabled && !finished && visitHistory.length > 0;

  /* ------------------ RENDER ----------------------- */

  return (
    <div className="bullout">
      {/* header */}
      <div className="bullout-header">
        <div>
          {/* keep only the first line as you requested */}
          <div className="muted">Finish 25 · 3 darts per visit</div>
        </div>
        <div className="objective-pill">
          <div className="objective-label">Objective</div>
          <div className="objective-value">{rankConfig.objectiveShort}</div>
        </div>
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
          {/* No suggestions – just show the board */}
          <DartboardHighlight segments={[]} />
          <div
            style={{
              marginTop: 12,
              fontSize: 16,
              fontWeight: 600,
              textAlign: "center",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            TARGET {TARGET_SCORE}
          </div>
        </div>

        <div className="bullout-stats card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="small muted">Curent target</div>
              <div className="title-lg">{TARGET_SCORE}</div>
            </div>
            <div>
              <div className="small muted">Darts left</div>
              <div className="title-lg">{dartsLeft}</div>
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
                <div className="pill-label"># of checkouts</div>
                <div className="pill-value">{checkoutCount}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Checkout streak</div>
                <div className="pill-value">{bestStreak}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* bottom controls – Check / Bust / Undo */}
      <div className="checkout25-controls" style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn"
            style={{ flex: 1, minWidth: 140 }}
            disabled={buttonsDisabled}
            onClick={handleCheck}
          >
            Check
          </button>
          <button
            className="btn secondary"
            style={{ flex: 1, minWidth: 140 }}
            disabled={buttonsDisabled}
            onClick={handleBust}
          >
            Bust
          </button>
          <button
            className="btn outline"
            style={{ flex: 1, minWidth: 140 }}
            disabled={!canUndo}
            onClick={handleUndo}
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}
