// src/drills/T20Scoring.tsx
import React, { useMemo, useState } from "react";
import DartboardHighlight, {
  tokensToSegments,
} from "../ui/DartboardHighlight";
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

type ThrowKind =
  | "MISS"
  | "GT60"
  | "GT80"
  | "GT100"
  | "GT120"
  | "GT140"
  | "H180";

type ThrowEvent = {
  kind: ThrowKind;
  points: number;
};

type RankConfigScoring = {
  labelLong: string;
  objectiveShort: string;
  targetPoints: number;
  maxThrows: number;
};

type ScoringStats = {
  totalPoints: number;
  throwsUsed: number;
  scoringThrows: number;
  accuracy: number;
  bestStreak: number;
  avgPointsPerThrow: number;
  gt60: number;
  gt80: number;
  gt100: number;
  gt120: number;
  gt140: number;
  h180: number;
  misses: number;
};

const MAX_THROWS = 100;

/* ---------- RANK CONFIG ---------- */

function getRankConfigScoring(
  tier: Tier,
  level: number
): RankConfigScoring {
  let target = 5;

  if (tier === "Bronze") {
    target = level <= 3 ? 5 : 10;
  } else if (tier === "Silver") {
    target = level <= 3 ? 20 : 30;
  } else if (tier === "Gold") {
    target = level <= 3 ? 50 : 100;
  } else if (tier === "Platinum") {
    target = level <= 3 ? 125 : 150;
  } else if (tier === "Diamond") {
    target = level <= 3 ? 200 : 250;
  }

  return {
    labelLong: `Score at least ${target} ladder points in ${MAX_THROWS} throws`,
    // just show X pts in the objective pill
    objectiveShort: `${target} pts`,
    targetPoints: target,
    maxThrows: MAX_THROWS,
  };
}

/* ---------- STATS ---------- */

function computeStats(events: ThrowEvent[]): ScoringStats {
  let totalPoints = 0;
  let scoringThrows = 0;
  let bestStreak = 0;
  let currentStreak = 0;

  let gt60 = 0;
  let gt80 = 0;
  let gt100 = 0;
  let gt120 = 0;
  let gt140 = 0;
  let h180 = 0;
  let misses = 0;

  events.forEach((ev) => {
    totalPoints += ev.points;

    if (ev.points > 0) {
      scoringThrows += 1;
      currentStreak += 1;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
      misses += 1;
    }

    switch (ev.kind) {
      case "GT60":
        gt60 += 1;
        break;
      case "GT80":
        gt80 += 1;
        break;
      case "GT100":
        gt100 += 1;
        break;
      case "GT120":
        gt120 += 1;
        break;
      case "GT140":
        gt140 += 1;
        break;
      case "H180":
        h180 += 1;
        break;
      default:
        break;
    }
  });

  const throwsUsed = events.length;
  const accuracy =
    throwsUsed > 0 ? Math.round((scoringThrows / throwsUsed) * 100) : 0;
  const avgPointsPerThrow =
    throwsUsed > 0 ? +(totalPoints / throwsUsed).toFixed(2) : 0;

  return {
    totalPoints,
    throwsUsed,
    scoringThrows,
    accuracy,
    bestStreak,
    avgPointsPerThrow,
    gt60,
    gt80,
    gt100,
    gt120,
    gt140,
    h180,
    misses,
  };
}

const T20_SEGMENTS = tokensToSegments(["20", "D20", "T20"]);

/* ---------- COMPONENT ---------- */

export default function T20Scoring({ onFinish, disabled, tier, level }: Props) {
  const [throwHistory, setThrowHistory] = useState<ThrowEvent[]>([]);
  const [finished, setFinished] = useState(false);

  const rankConfig = useMemo(
    () => getRankConfigScoring(tier, level),
    []
  );

  const stats = useMemo(
    () => computeStats(throwHistory),
    [throwHistory]
  );

  const throwsUsed = stats.throwsUsed;
  const throwsLeft = rankConfig.maxThrows - throwsUsed;
  const progressPct =
    rankConfig.targetPoints > 0
      ? Math.min(
          100,
          Math.round((stats.totalPoints / rankConfig.targetPoints) * 100)
        )
      : 0;

  /* ---------- FINISH LOGIC ---------- */

  function finishGame(win: boolean, history: ThrowEvent[]) {
    if (finished) return;
    setFinished(true);

    const finalStats = computeStats(history);

    const payload = {
      game_key: "t20_scoring",
      tier: tier,
      level: level,

      win,
      points: finalStats.totalPoints,
      target_points: rankConfig.targetPoints,
      throws_used: finalStats.throwsUsed,
      max_throws: rankConfig.maxThrows,

      accuracy: finalStats.accuracy,
      best_streak: finalStats.bestStreak,
      avg_points_per_throw: finalStats.avgPointsPerThrow,
      scoring_throws: finalStats.scoringThrows,

      hit_counts: {
        gt60: finalStats.gt60,
        gt80: finalStats.gt80,
        gt100: finalStats.gt100,
        gt120: finalStats.gt120,
        gt140: finalStats.gt140,
        h180: finalStats.h180,
        misses: finalStats.misses,
      },

      // Standardized objective + stats for generic Results UI
      objective: {
        label: rankConfig.objectiveShort,
        target: rankConfig.targetPoints,
        progress: Math.min(finalStats.totalPoints, rankConfig.targetPoints),
      },
      stats: {
        accuracy: finalStats.accuracy,
        avg_points_per_throw: finalStats.avgPointsPerThrow,
        best_streak: finalStats.bestStreak,
        scoring_throws: finalStats.scoringThrows,
        points: finalStats.totalPoints,
      },
    };

    onFinish({ payload, win });
  }

  function recordThrow(kind: ThrowKind, points: number) {
    if (disabled || finished) return;
    if (throwHistory.length >= rankConfig.maxThrows) return;

    const newHistory = [...throwHistory, { kind, points }];
    const newStats = computeStats(newHistory);

    setThrowHistory(newHistory);

    const outOfThrows = newStats.throwsUsed >= rankConfig.maxThrows;
    const goalReached =
      newStats.totalPoints >= rankConfig.targetPoints;

    if (goalReached || outOfThrows) {
      finishGame(goalReached, newHistory);
    }
  }

  function handleMiss() {
    recordThrow("MISS", 0);
  }

  function handleGt60() {
    recordThrow("GT60", 1);
  }
  function handleGt80() {
    recordThrow("GT80", 2);
  }
  function handleGt100() {
    recordThrow("GT100", 3);
  }
  function handleGt120() {
    recordThrow("GT120", 5);
  }
  function handleGt140() {
    recordThrow("GT140", 7);
  }
  function handle180() {
    recordThrow("H180", 10);
  }

  function handleUndo() {
    if (disabled || finished) return;
    if (throwHistory.length === 0) return;
    const newHistory = throwHistory.slice(0, -1);
    setThrowHistory(newHistory);
  }

  const canPress =
    !disabled &&
    !finished &&
    throwHistory.length < rankConfig.maxThrows;
  const canUndo =
    !disabled && !finished && throwHistory.length > 0;

  /* ---------- RENDER ---------- */

  return (
    <div className="bullout">
      {/* header */}
      <div className="bullout-header">
        <div>
          <div className="muted">T20 Scoring · 100 throws</div>
          {/* removed extra label line */}
        </div>
        <div className="objective-pill">
          <div className="objective-label">OBJECTIVE</div>
          <div className="objective-value">
            {rankConfig.objectiveShort}
          </div>
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
          <DartboardHighlight segments={T20_SEGMENTS} />
          <div
            style={{
              marginTop: 12,
              textAlign: "center",
            }}
          >
            <div className="muted small" style={{ marginTop: 8 }}>
              Any stray dart counts, other section can be used if blocked.
            </div>
          </div>
        </div>

        {/* right-side stats – same structure as 121 ladder */}
        <div
          className="bullout-stats card"
          style={{
            flex: "0 0 280px",      // min room but shrink-safe
            maxWidth: "100%",       // never overflow container
            alignSelf: "stretch",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* big 3 stats */}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="small muted">Points total</div>
              <div className="title-lg">{stats.totalPoints}</div>
            </div>
            <div>
            <div className="small muted">Throws left</div>
            <div className="title-lg">
                {throwsLeft}
            </div>
            </div>
            <div>
              <div className="small muted">Avg pts / throw</div>
              <div className="title-lg">{stats.avgPointsPerThrow}</div>
            </div>
          </div>

          {/* pills below */}
          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">Accuracy</div>
                <div className="pill-value">
                  {stats.accuracy}%
                </div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Scoring throws</div>
                <div className="pill-value">
                  {stats.scoringThrows}
                </div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">&gt; 60</div>
                <div className="pill-value">
                  {stats.gt60}
                </div>
              </div>
            </div>

            <div
              className="row bullout-stat-row"
              style={{ marginTop: 8 }}
            >
              <div className="pill pill-stat">
                <div className="pill-label">&gt; 100</div>
                <div className="pill-value">
                  {stats.gt100}
                </div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">&gt; 140</div>
                <div className="pill-value">
                  {stats.gt140}
                </div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">180</div>
                <div className="pill-value">
                  {stats.h180}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* bottom controls – scoring options + miss + undo */}
      <div className="t20scoring-controls" style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn"
            style={{ flex: 1, minWidth: 140 }}
            disabled={!canPress}
            onClick={handleGt60}
          >
            &gt; 60 (1 pt)
          </button>
          <button
            className="btn"
            style={{ flex: 1, minWidth: 140 }}
            disabled={!canPress}
            onClick={handleGt80}
          >
            &gt; 80 (2 pts)
          </button>
          <button
            className="btn"
            style={{ flex: 1, minWidth: 140 }}
            disabled={!canPress}
            onClick={handleGt100}
          >
            &gt; 100 (3 pts)
          </button>
          <button
            className="btn"
            style={{ flex: 1, minWidth: 140 }}
            disabled={!canPress}
            onClick={handleGt120}
          >
            &gt; 120 (5 pts)
          </button>
          <button
            className="btn"
            style={{ flex: 1, minWidth: 140 }}
            disabled={!canPress}
            onClick={handleGt140}
          >
            &gt; 140 (7 pts)
          </button>
          <button
            className="btn"
            style={{ flex: 1, minWidth: 140 }}
            disabled={!canPress}
            onClick={handle180}
          >
            180 (10 pts)
          </button>
          <button
            className="btn secondary"
            style={{ flex: 1, minWidth: 140 }}
            disabled={!canPress}
            onClick={handleMiss}
          >
            Miss / &lt; 60
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