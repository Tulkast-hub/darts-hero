import React, { useEffect, useMemo, useState } from "react";
import type { Tier } from "../xp/types";
import { useI18n } from "../i18n/I18nProvider";

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

type ThrowEvent = {
  kind: "inner" | "outer" | "miss";
  delta: number;
  darts: number;
  inner: number;
  outer: number;
};

// --- CONFIG ------------------------------------------------------------------

// All games get 90 darts
const DARTS_TOTAL = 90;

// Bull Out point targets per tier/level (from our design)
const BULL_OUT_TARGETS: Record<Tier, number[]> = {
  Bronze: [5, 5, 5, 9, 9],
  Silver: [18, 18, 18, 21, 27],
  Gold: [35, 41, 41, 48, 54],
  Platinum: [11, 23, 34, 45, 56],
  Diamond: [63, 68, 72, 75, 79],
};

function getTargetScore(tier: Tier, level: number): number {
  const arr = BULL_OUT_TARGETS[tier];
  return arr[Math.min(Math.max(level, 1), 5) - 1];
}

function isPenaltyTier(tier: Tier) {
  return tier === "Platinum" || tier === "Diamond";
}

export default function BullOut({
  onFinish,
  disabled,
  tier,
  level,
  onDartsUsed,
  externalUndo,
}: Props) {
  const { t } = useI18n();

  const [dartsLeft, setDartsLeft] = useState<number>(DARTS_TOTAL);
  const [score, setScore] = useState<number>(0);
  const [innerHits, setInnerHits] = useState(0);
  const [outerHits, setOuterHits] = useState(0);
  const [history, setHistory] = useState<ThrowEvent[]>([]);
  const [animKey, setAnimKey] = useState(0);
  const [finished, setFinished] = useState(false);

  const dartsUsed = DARTS_TOTAL - dartsLeft;
  const totalThrows = dartsUsed === 0 ? 0 : Math.ceil(dartsUsed / 3); // sets of 3 darts
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

  function recordAction(kind: "inner" | "outer" | "miss", darts: number) {
    if (disabled || finished) return;
    if (dartsLeft <= 0) return;

    const actualDarts = Math.min(darts, dartsLeft);
    if (actualDarts <= 0) return;

    // delta is per-dart
    let deltaPerDart = 0;
    let innerInc = 0;
    let outerInc = 0;

    if (kind === "inner") {
      deltaPerDart = 2;
      innerInc = actualDarts;
      setAnimKey((k) => k + 1);
    }
    if (kind === "outer") {
      deltaPerDart = 1;
      outerInc = actualDarts;
      setAnimKey((k) => k + 1);
    }
    if (kind === "miss" && isPenaltyTier(tier)) {
      // Platinum & Diamond: -1 per miss but don't go below 0 overall
      deltaPerDart = -1;
    }

    // Apply score safely (avoid going negative)
    setScore((s) => {
      const raw = s + deltaPerDart * actualDarts;
      return Math.max(0, raw);
    });

    setDartsLeft((d) => Math.max(0, d - actualDarts));
    onDartsUsed?.(actualDarts);

    if (innerInc) setInnerHits((x) => x + innerInc);
    if (outerInc) setOuterHits((x) => x + outerInc);

    // Store ONE history entry for the whole action
    const totalDelta = deltaPerDart * actualDarts;
    setHistory((h) => [
      ...h,
      { kind, delta: totalDelta, darts: actualDarts, inner: innerInc, outer: outerInc },
    ]);
  }

  function record(kind: "inner" | "outer" | "miss") {
    recordAction(kind, 1);
  }

  const handleMissThree = () => recordAction("miss", 3);
  const handleMissTwo = () => recordAction("miss", 2);

  function undoLast() {
    if (disabled || finished) return;
    const last = history[history.length - 1];
    if (!last) return;

    setHistory((h) => h.slice(0, -1));

    // Reverse score delta
    setScore((s) => Math.max(0, s - last.delta));

    // Restore darts
    setDartsLeft((d) => Math.min(DARTS_TOTAL, d + last.darts));

    // Restore hits
    if (last.inner) setInnerHits((x) => Math.max(0, x - last.inner));
    if (last.outer) setOuterHits((x) => Math.max(0, x - last.outer));
  }

  // Allow Versus Mode to request undo externally (e.g. go back a hand)
  useEffect(() => {
    if (!externalUndo) return;
    if (externalUndo.steps <= 0) return;
    // run on next tick so state has switched to the correct active player
    const tmr = window.setTimeout(() => {
      for (let i = 0; i < externalUndo.steps; i++) {
        undoLast();
      }
    }, 0);
    return () => window.clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUndo?.token]);

  function finishInternal() {
    const payload = {
      game_key: "bull_out",
      tier,
      level,

      win,
      max_throws: DARTS_TOTAL,
      throws_used: dartsUsed,
      objective: {
        label: t("Score points"),
        target: targetScore,
        progress: score,
      },
      stats: {
        accuracy,
        score,
        inner_hits: innerHits,
        outer_hits: outerHits,
        bulls_hit: bullsHit,
        avg_points_per_dart:
          dartsUsed === 0 ? 0 : Number((score / dartsUsed).toFixed(2)),
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
          <div className="muted">{t("Outer bull = 1 pt · Inner bull = 2 pts")}</div>
        </div>
        <div className="objective-pill">
          <div className="objective-label">{t("Objective")}</div>
          <div className="objective-value">
            {targetScore} {t("pts")}
          </div>
        </div>
      </div>

      <BullBoard animKey={animKey} />
      <div className="bullout-main">
        <div className="bullout-controls card" data-hotkeys="drill">
          <button
            className="btn success"
            data-hotkey="1"
            onClick={() => record("inner")}
            disabled={disabled || finished}
          >
            {t("Inner Bull (+2)")}
          </button>
          <button
            className="btn"
            data-hotkey="2"
            onClick={() => record("outer")}
            disabled={disabled || finished}
          >
            {t("Outer Bull (+1)")}
          </button>
          <button
            className="btn outline"
            data-hotkey="3"
            onClick={() => record("miss")}
            disabled={disabled || finished}
          >
            {t("Miss")}
          </button>
          <button
            className="btn outline"
            data-hotkey="4"
            onClick={handleMissTwo}
            disabled={disabled || finished || dartsLeft <= 0}
          >
            {t("Miss 2")}
          </button>
          <button
            className="btn outline"
            data-hotkey="5"
            onClick={handleMissThree}
            disabled={disabled || finished || dartsLeft <= 0}
          >
            {t("Miss 3")}
          </button>
          <button
            className="btn outline"
            data-hotkey="0"
            onClick={undoLast}
            disabled={disabled || finished || !history.length}
          >
            {t("Undo")}
          </button>
        </div>
        <div className="bullout-stats card">
          <div className="bullout-topstats">
            <div className="bullout-topstat">
              <div className="top-value">{score}</div>
              <div className="top-label">{t("Score")}</div>
            </div>

            <div className="bullout-topstat">
              <div className="top-value">{dartsLeft}</div>
              <div className="top-label">{t("Darts left")}</div>
            </div>

            <div className="bullout-topstat">
              <div className="top-value">{accuracy}%</div>
              <div className="top-label">{t("Accuracy")}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">{t("Inner")}</div>
                <div className="pill-value">{innerHits}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">{t("Outer")}</div>
                <div className="pill-value">{outerHits}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">{t("Throws")}</div>
                <div className="pill-value">{totalThrows}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BullBoard({ animKey }: { animKey: number }) {
  return (
    <div className="bull-board-wrapper hidden-sm">
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
