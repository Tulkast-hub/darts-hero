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
  onDartsUsed?: (count: number) => void;
  externalUndo?: { token: number; steps: number };
};

const MAX_THROWS = 50;

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

  // Bronze: 2 rows only (6 targets)
  if (tier === "Bronze") {
    numbers = [...sample(POT_1, 6)];
  } else if (tier === "Silver") {
    numbers = [...sample(POT_1, 6), ...sample(POT_2, 3)];
  } else if (tier === "Gold") {
    numbers = [...sample(POT_1, 3), ...sample(POT_2, 3), ...sample(POT_3, 3)];
  } else if (tier === "Platinum") {
    numbers = [...sample(POT_2, 3), ...sample(POT_3, 6)];
  } else {
    // Diamond
    numbers = [...sample(POT_3, 6), ...sample(POT_4, 3)];
  }

  // "in order in the objective square" => sort ascending.
  return numbers.sort((a, b) => a - b);
}

type Action = { type: "HIT"; value: number } | { type: "MISS" };

export default function ScoringBingo({ onFinish, disabled, tier, level, onDartsUsed, externalUndo }: Props) {
  const [actions, setActions] = useState<Action[]>([]);
  const [finished, setFinished] = useState(false);

  const targets = useMemo(() => getBingoNumbers(tier), [tier]);

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

  const missCount = useMemo(() => actions.filter((a) => a.type === "MISS").length, [actions]);

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

    let finalMisses = 0;

    for (const a of finalActions) {
      if (a.type === "HIT") {
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
      required_hits: Object.fromEntries(targets.map((t) => [t, requiredHitsByTarget.get(t) ?? 1])),
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
        accuracy,
      },
    };

    onFinish({ payload, win });
  }

  function applyAction(action: Action) {
    if (disabled || finished) return;
    if (throwsUsed >= MAX_THROWS) return;

    onDartsUsed?.(3);

    if (action.type === "HIT") {
      const need = requiredHitsByTarget.get(action.value) ?? 1;
      const have = countsByTarget.get(action.value) ?? 0;
      if (have >= need) return; // already completed
    }

    const newActions = [...actions, action];
    setActions(newActions);

    // compute completion after adding
    const nextCounts = new Map(countsByTarget);

    if (action.type === "HIT") {
      nextCounts.set(action.value, (nextCounts.get(action.value) ?? 0) + 1);
    }

    let newCompleted = 0;
    for (const t of targets) {
      const need = requiredHitsByTarget.get(t) ?? 1;
      const have = nextCounts.get(t) ?? 0;
      if (have >= need) newCompleted += 1;
    }

    const newThrowsUsed = newActions.length;

    if (newCompleted === targets.length) {
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
    setActions(actions.slice(0, -1));
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

  const canPress = !disabled && !finished && throwsUsed < MAX_THROWS;
  const canUndo = !disabled && !finished && actions.length > 0;

  const gridRows = targets.length === 6 ? 2 : 3;

  return (
    <div className="bullout">
      {/* Header */}
      <div className="bullout-header">
        <div>
          <div className="muted">Scoring Bingo · {MAX_THROWS} throws</div>
        </div>
        <div className="objective-pill">
          <div className="objective-label">OBJECTIVE</div>
          <div className="objective-value">Complete bingo</div>
        </div>
      </div>

      {/* 1) Bingo card (top, larger, clickable) */}
      <div className="card" style={{ marginTop: 12 }}>
        <div
          className="bingo-card"
          style={{

          }}
        >
          {targets.map((num) => {
            const need = requiredHitsByTarget.get(num) ?? 1;
            const have = countsByTarget.get(num) ?? 0;

            const done = have >= need;
            const partial = need === 2 && have === 1;

            const bg = done ? "rgb(34,197,94)" : partial ? "rgb(250,204,21)" : "transparent";
            const fg = done ? "#fff" : partial ? "#111827" : "inherit";

            return (
              <button
                key={num}
                type="button"
                className="btn"
                onClick={() => handleHit(num)}
                disabled={!canPress || done}
                style={{
                  height: "100%",
                  borderRadius: 18,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  border: "2px solid rgba(0,0,0,0.22)",
                  backgroundColor: bg,
                  color: fg,
                  transition: "all 0.15s ease",
                  cursor: !canPress || done ? "not-allowed" : "pointer",
                }}
              >
                <div style={{ fontSize: 30, lineHeight: 1 }}>{num}</div>

                {need === 2 && (
                  <div
                    className="muted"
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      opacity: done ? 0.95 : 0.8,
                      color: done ? "#fff" : partial ? "#111827" : undefined,
                      fontWeight: 700,
                    }}
                  >
                    {have}/2
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isLevel45 && (
          <div className="muted small" style={{ marginTop: 12 }}>
            First row (lowest 3 numbers) requires 2 hits (level 4–5).
          </div>
        )}
      </div>

      {/* 2) Controls (Miss + Undo only) */}
      <div style={{ marginTop: 14 }} data-hotkeys="drill">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
          }}
        >
          <button className="btn secondary" disabled={!canPress} onClick={handleMiss}>
            Miss
          </button>
          <button className="btn outline" disabled={!canUndo} onClick={handleUndo} data-hotkey="0">
            Undo
          </button>
        </div>
      </div>

      {/* 3) Stats card (bottom) */}
      <div className="bullout-stats card" style={{ marginTop: 14 }}>
        {/* Top 3 */}
        <div className="row" style={{ justifyContent: "space-around" }}>
          <div>
            <div className="small muted">Throws left</div>
            <div className="title-lg">{throwsLeft}</div>
          </div>
          <div>
            <div className="small muted">Completed</div>
            <div className="title-lg">
              {completedCount}/{targets.length}
            </div>
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
        </div>

        {/* For Bronze: call out it is 2 rows */}
        {gridRows === 2 && (
          <div className="muted small" style={{ marginTop: 10 }}>
            Bronze uses a 2-row bingo card (6 targets).
          </div>
        )}
      </div>
    </div>
  );
}
