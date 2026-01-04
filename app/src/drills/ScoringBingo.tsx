// src/drills/ScoringBingo.tsx
import React, { useMemo, useState } from "react";
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

const MAX_THROWS = 30;

/* ---------- SCORE POTS ---------- */

const POT_1 = [54, 56, 57, 58, 59, 60];
const POT_2 = [90, 92, 94, 95, 96, 97, 98, 99, 100];
const POT_3 = [126, 131, 133, 134, 137, 138, 140];
const POT_4 = [162, 171, 174, 177, 180];

function sample(arr: number[], count: number) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getBingoNumbers(tier: Tier): number[] {
  let numbers: number[] = [];

  if (tier === "Bronze") {
    numbers = [...sample(POT_1, 6), ...sample(POT_2, 3)];
  } else if (tier === "Silver") {
    numbers = [...sample(POT_1, 3), ...sample(POT_2, 6)];
  } else if (tier === "Gold") {
    numbers = [...sample(POT_1, 3), ...sample(POT_2, 3), ...sample(POT_3, 3)];
  } else if (tier === "Platinum") {
    numbers = [...sample(POT_2, 3), ...sample(POT_3, 3), ...sample(POT_4, 3)];
  } else {
    numbers = [...sample(POT_3, 6), ...sample(POT_4, 3)];
  }

  // "in order in the objective square" => sort ascending.
  return numbers.sort((a, b) => a - b);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Action =
  | { type: "HIT"; value: number }
  | { type: "MISS" };

export default function ScoringBingo({ onFinish, disabled, tier, level }: Props) {
  const [actions, setActions] = useState<Action[]>([]);
  const [finished, setFinished] = useState(false);

  const targets = useMemo(() => getBingoNumbers(tier), []);

  const isLevel45 = level >= 4;

  // Row 1 = lowest 3 numbers (sorted list index 0..2)
  const requiredHitsByTarget = useMemo(() => {
    const map = new Map<number, number>();
    targets.forEach((t, idx) => {
      const requiresTwo = isLevel45 && idx < 3;
      map.set(t, requiresTwo ? 2 : 1);
    });
    return map;
  }, [targets, isLevel45]);

  const hitHistory = useMemo(
    () => actions.filter((a) => a.type === "HIT") as { type: "HIT"; value: number }[],
    [actions]
  );

  const throwsUsed = actions.length;
  const throwsLeft = MAX_THROWS - throwsUsed;

  const countsByTarget = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of targets) map.set(t, 0);
    for (const a of actions) {
      if (a.type === "HIT") {
        map.set(a.value, (map.get(a.value) ?? 0) + 1);
      }
    }
    return map;
  }, [actions, targets]);

  const completedCount = useMemo(() => {
    let n = 0;
    for (const t of targets) {
      const need = requiredHitsByTarget.get(t) ?? 1;
      const have = countsByTarget.get(t) ?? 0;
      if (have >= need) n += 1;
    }
    return n;
  }, [targets, requiredHitsByTarget, countsByTarget]);

  const missCount = useMemo(() => {
    return actions.filter((a) => a.type === "MISS").length;
  }, [actions]);

  const accuracy = useMemo(() => {
    // "accuracy" here = successful HIT actions / total throws
    if (throwsUsed === 0) return 0;
    const hitCount = hitHistory.length;
    return Math.round((hitCount / throwsUsed) * 100);
  }, [throwsUsed, hitHistory.length]);

  function finishGame(win: boolean, finalActions: Action[]) {
    if (finished) return;
    setFinished(true);

    const finalCounts: Record<number, number> = {};
    for (const t of targets) finalCounts[t] = 0;

    const finalHits: number[] = [];
    let finalMisses = 0;

    for (const a of finalActions) {
      if (a.type === "HIT") {
        finalHits.push(a.value);
        finalCounts[a.value] = (finalCounts[a.value] ?? 0) + 1;
      } else {
        finalMisses += 1;
      }
    }

    const completedTargets = targets.filter((t) => {
      const need = requiredHitsByTarget.get(t) ?? 1;
      return (finalCounts[t] ?? 0) >= need;
    });

    const payload = {
      game_key: "scoring_bingo",
      tier: tier,
      level: level,

      win,
      throws_used: finalActions.length,
      max_throws: MAX_THROWS,

      targets,
      required_hits: Object.fromEntries(
        targets.map((t) => [t, requiredHitsByTarget.get(t) ?? 1])
      ),
      hit_counts: finalCounts,

      misses: finalMisses,
      completed_targets: completedTargets,
      completed_count: completedTargets.length,

      // Standardized objective + stats for generic Results UI
      objective: {
        label: isLevel45 ? `Complete all targets (first 3 need 2 hits)` : `Complete all targets`,
        target: targets.length,
        progress: Math.min(completedTargets.length, targets.length),
      },
      stats: {
        completed_count: completedTargets.length,
        misses: finalMisses,
        throws_used: finalActions.length,
        targets_total: targets.length,
      },
    };

    onFinish({ payload, win });
  }

  function applyAction(action: Action) {
    if (disabled || finished) return;
    if (throwsUsed >= MAX_THROWS) return;

    if (action.type === "HIT") {
      const need = requiredHitsByTarget.get(action.value) ?? 1;
      const have = countsByTarget.get(action.value) ?? 0;
      if (have >= need) return; // already completed
    }

    const newActions = [...actions, action];
    setActions(newActions);

    // compute completion after adding
    let newCompleted = 0;
    const nextCounts = new Map(countsByTarget);

    if (action.type === "HIT") {
      nextCounts.set(action.value, (nextCounts.get(action.value) ?? 0) + 1);
    }

    for (const t of targets) {
      const need = requiredHitsByTarget.get(t) ?? 1;
      const have = nextCounts.get(t) ?? 0;
      if (have >= need) newCompleted += 1;
    }

    const newThrowsUsed = newActions.length;

    if (newCompleted === 9) {
      finishGame(true, newActions);
      return;
    }

    if (newThrowsUsed >= MAX_THROWS) {
      finishGame(false, newActions);
    }
  }

  function handleHit(value: number) {
    applyAction({ type: "HIT", value });
  }

  function handleMiss() {
    applyAction({ type: "MISS" });
  }

  function handleUndo() {
    if (disabled || finished) return;
    if (actions.length === 0) return;

    const newActions = actions.slice(0, -1);
    setActions(newActions);
  }

  const canPress =
    !disabled && !finished && throwsUsed < MAX_THROWS;
  const canUndo =
    !disabled && !finished && actions.length > 0;

  return (
    <div className="bullout">
      {/* Header */}
      <div className="bullout-header">
        <div>
          <div className="muted">
            Scoring Bingo · {MAX_THROWS} throws
          </div>
        </div>
        <div className="objective-pill">
          <div className="objective-label">OBJECTIVE</div>
          <div className="objective-value">Complete bingo</div>
        </div>
      </div>

      {/* Main: targets left, stats right */}
      <div className="bullout-main">
        {/* Targets grid */}
        <div className="card" style={{ flex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            {targets.map((num) => {
              const need = requiredHitsByTarget.get(num) ?? 1;
              const have = countsByTarget.get(num) ?? 0;
              const done = have >= need;

              return (
                <div
                  key={num}
                  style={{
                    height: 92,
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    border: "2px solid rgba(0,0,0,0.22)",
                    backgroundColor: done ? "rgb(34,197,94)" : "transparent",
                    color: done ? "#fff" : "inherit",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: 22, lineHeight: 1 }}>{num}</div>
                  {need === 2 && (
                    <div
                      className="muted"
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        opacity: done ? 0.9 : 0.75,
                        color: done ? "#fff" : undefined,
                      }}
                    >
                      x2
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats (like other games) */}
        <div
          className="bullout-stats card"
          style={{
            flex: "0 0 280px",
            maxWidth: "100%",
            alignSelf: "stretch",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Top 3 */}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="small muted">Throws left</div>
              <div className="title-lg">{throwsLeft}</div>
            </div>
            <div>
              <div className="small muted">Completed</div>
              <div className="title-lg">{completedCount}/9</div>
            </div>
            <div>
              <div className="small muted">Miss</div>
              <div className="title-lg">{missCount}</div>
            </div>
          </div>

          {/* Pills */}
          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">Accuracy</div>
                <div className="pill-value">{accuracy}%</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Hits</div>
                <div className="pill-value">{hitHistory.length}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Throws used</div>
                <div className="pill-value">{throwsUsed}</div>
              </div>
            </div>

            <div className="muted small" style={{ marginTop: 10 }}>
              Lowest row requires x2 hits (level 4–5).
            </div>
          </div>
        </div>
      </div>

      {/* Controls – 3 per row, then Miss + Undo */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {targets.map((num) => {
            const need = requiredHitsByTarget.get(num) ?? 1;
            const have = countsByTarget.get(num) ?? 0;
            const done = have >= need;

            return (
              <button
                key={num}
                className="btn"
                disabled={!canPress || done}
                onClick={() => handleHit(num)}
              >
                {num}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
            marginTop: 10,
          }}
        >
          <button
            className="btn secondary"
            disabled={!canPress}
            onClick={handleMiss}
          >
            Miss
          </button>
          <button
            className="btn outline"
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