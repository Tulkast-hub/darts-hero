import React, { useEffect, useMemo, useState } from "react";
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

type ThrowEvent = {
  kind: "inner" | "outer" | "miss";
  delta: number;
};

// --- CONFIG ------------------------------------------------------------------

// All games get 90 darts
const DARTS_TOTAL = 90;

// Bull Out point targets per tier/level (from our design)
const BULL_OUT_TARGETS: Record<Tier, number[]> = {
  Bronze:   [4, 4, 4, 7, 7],
  Silver:   [14, 14, 14, 17, 20],
  Gold:     [27, 34, 41, 48, 54],
  Platinum: [11, 23, 34, 45, 56],
  Diamond:  [63, 68, 72, 75, 79]
};

function getTargetScore(tier: Tier, level: number): number {
  const arr = BULL_OUT_TARGETS[tier];
  return arr[Math.min(Math.max(level, 1), 5) - 1];
}

function isPenaltyTier(tier: Tier) {
  return tier === "Platinum" || tier === "Diamond";
}

export default function BullOut({ onFinish, disabled, tier, level }: Props) {
  const [dartsLeft, setDartsLeft] = useState<number>(DARTS_TOTAL);
  const [score, setScore] = useState<number>(0);
  const [innerHits, setInnerHits] = useState(0);
  const [outerHits, setOuterHits] = useState(0);
  const [history, setHistory] = useState<ThrowEvent[]>([]);
  const [animKey, setAnimKey] = useState(0);
  const [finished, setFinished] = useState(false);

  const dartsUsed = DARTS_TOTAL - dartsLeft;
  const totalThrows =
    dartsUsed === 0 ? 0 : Math.ceil(dartsUsed / 3); // sets of 3 darts
  const bullsHit = innerHits + outerHits;

  const accuracy = useMemo(() => {
    if (!dartsUsed) return 0;
    return Math.round((bullsHit / dartsUsed) * 100);
  }, [bullsHit, dartsUsed]);

  const targetScore = getTargetScore(tier, level);
  const win = score >= targetScore;

  // Auto-finish when all darts have been thrown
  useEffect(() => {
    if (finished) return;
    if (dartsLeft === 0 && history.length > 0) {
      finishInternal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dartsLeft, finished, history.length]);

  // Auto-finish as soon as the objective is met
  useEffect(() => {
    if (finished) return;
    // Ensure at least one dart was thrown so we never finish on initial render
    if (win && history.length > 0) {
      finishInternal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win, finished, history.length]);

  function record(kind: "inner" | "outer" | "miss") {
    if (disabled || finished) return;
    if (dartsLeft <= 0) return;

    let delta = 0;
    if (kind === "inner") delta = 2;
    if (kind === "outer") delta = 1;

    if (kind === "miss" && isPenaltyTier(tier)) {
      // Platinum & Diamond behaviour: -1 per miss (but don't go below 0)
      delta = score > 0 ? -1 : 0;
    }

    setScore((s) => Math.max(0, s + delta));
    setDartsLeft((d) => Math.max(0, d - 1));

    setHistory((h) => [...h, { kind, delta }]);
    if (kind === "inner") setInnerHits((x) => x + 1);
    if (kind === "outer") setOuterHits((x) => x + 1);

    if (kind !== "miss") {
      setAnimKey((k) => k + 1);
    }
  }

  function undoLast() {
    if (disabled || finished) return;
    const last = history[history.length - 1];
    if (!last) return;

    setHistory((h) => h.slice(0, -1));
    setScore((s) => Math.max(0, s - last.delta));
    setDartsLeft((d) => Math.min(DARTS_TOTAL, d + 1));

    if (last.kind === "inner") setInnerHits((x) => x - 1);
    if (last.kind === "outer") setOuterHits((x) => x - 1);
  }

  function finishInternal() {
    const payload = {
      game_key: "bull_out",
      tier: tier,
      level: level,

win,
max_throws: DARTS_TOTAL,
throws_used: dartsUsed,
objective: {
  label: "Score points",
  target: targetScore,
  progress: score
},
stats: {
  accuracy,
  score,
  inner_hits: innerHits,
  outer_hits: outerHits,
  bulls_hit: bullsHit,
  avg_points_per_dart: dartsUsed === 0 ? 0 : Number((score / dartsUsed).toFixed(2))
},
      score,
      darts_used: dartsUsed,
      innerHits,
      outerHits,
      throws: totalThrows,
      accuracy,
      legacy_objective_target: targetScore,
    };
    setFinished(true);
    onFinish({ payload, win });
  }

  return (
    <div className="bullout">
      {/* header with objective */}
      <div className="bullout-header">
        <div>
          {/* we removed title-sm usage elsewhere, but keeping the structure */}
          <div className="muted">
            Outer bull = 1 pt · Inner bull = 2 pts
          </div>
        </div>
        <div className="objective-pill">
          <div className="objective-label">Objective</div>
          <div className="objective-value">{targetScore} pts</div>
        </div>
      </div>

      <div className="bullout-main">
        <BullBoard animKey={animKey} />

        <div className="bullout-stats card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="title-lg">{score}</div>
              <div className="muted">Score</div>
            </div>
            <div>
              <div className="title-lg">{dartsLeft}</div>
              <div className="muted">Darts left</div>
            </div>
            <div>
              <div className="title-lg">{accuracy}%</div>
              <div className="muted">Accuracy</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">Inner</div>
                <div className="pill-value">{innerHits}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Outer</div>
                <div className="pill-value">{outerHits}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Throws</div>
                <div className="pill-value">{totalThrows}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bullout-controls">
        <button
          className="btn success"
          onClick={() => record("inner")}
          disabled={disabled || finished}
        >
          Inner Bull (+2)
        </button>
        <button
          className="btn"
          onClick={() => record("outer")}
          disabled={disabled || finished}
        >
          Outer Bull (+1)
        </button>
        <button
          className="btn outline"
          onClick={() => record("miss")}
          disabled={disabled || finished}
        >
          Miss
        </button>
        <button
          className="btn outline"
          onClick={undoLast}
          disabled={disabled || finished || !history.length}
        >
          Undo last
        </button>
      </div>
    </div>
  );
}

function BullBoard({ animKey }: { animKey: number }) {
  return (
    <div className="bull-board-wrapper card">
      <svg viewBox="0 0 120 120" className="bull-board" aria-hidden="true">
        <circle cx="60" cy="60" r="58" fill="#222" />
        <circle cx="60" cy="60" r="50" fill="#1a1a1a" />
        <circle cx="60" cy="60" r="42" fill="#111" />
        <g key={animKey} className="bull-group">
          <circle cx="60" cy="60" r="12" fill="#00843d" />
          <circle cx="60" cy="60" r="6" fill="#d72638" />
        </g>
      </svg>
    </div>
  );
}
