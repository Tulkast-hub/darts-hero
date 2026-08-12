// src/drills/ScoringLadder.tsx
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

type MoveKind = "DOWN" | "STAY" | "UP1" | "UP2" | "UP3";

type LadderEvent = {
  kind: MoveKind;
  delta: -1 | 0 | 1 | 2 | 3;
};

type LadderConfig = {
  thresholds: [number, number, number]; // [low, mid, high]
  up3At: number; // >= this => +3 steps
  goalSteps: number;
  maxThrows: number;
  objectiveShort: string;
  labelLong: string;
};

type LadderStats = {
  currentStep: number;
  bestStep: number;
  throwsUsed: number;
  movesDown: number;
  movesStay: number;
  movesUp1: number;
  movesUp2: number;
  movesUp3: number;
  nonNegativeMoves: number;
  accuracy: number;
};

const MAX_THROWS = 40;

/* ---------- RANK CONFIG ---------- */

function getUp3At(tier: Tier): number {
  switch (tier) {
    case "Bronze":
      return 100;
    case "Silver":
      return 120;
    case "Gold":
    case "Platinum":
      return 140;
    case "Diamond":
      return 180;
    default:
      return 140;
  }
}

function getGoalSteps(tier: Tier, level: number): number {
  const low = level <= 3;
  switch (tier) {
    case "Bronze":
      return low ? 4 : 6;
    case "Silver":
      return low ? 7 : 9;
    case "Gold":
      return low ? 11 : 7;
    case "Platinum":
      return low ? 9 : 11;
    case "Diamond":
      return low ? 15 : 9;
    default:
      return low ? 9 : 11;
  }
}

function getLadderConfig(tier: Tier, level: number): LadderConfig {
  // Keep your existing scoring thresholds (difficulty feel),
  // only update the goalSteps + add up3At.
  let thresholds: [number, number, number] = [45, 60, 80];

  if (tier === "Bronze") {
    thresholds = [45, 60, 80];
  } else if (tier === "Silver") {
    thresholds = [60, 80, 100];
  } else if (tier === "Gold") {
    thresholds = level <= 3 ? [60, 80, 100] : [80, 100, 120];
  } else if (tier === "Platinum") {
    thresholds = [80, 100, 120];
  } else if (tier === "Diamond") {
    thresholds = level <= 3 ? [80, 100, 120] : [100, 120, 140];
  }

  const goalSteps = getGoalSteps(tier, level);
  const up3At = getUp3At(tier);

  return {
    thresholds,
    up3At,
    goalSteps,
    maxThrows: MAX_THROWS,
    objectiveShort: `${goalSteps} steps`,
    labelLong: `Reach ${goalSteps} steps in ${MAX_THROWS} throws`,
  };
}

/* ---------- STATS ---------- */

function computeLadderStats(events: LadderEvent[], goalSteps: number): LadderStats {
  let step = 0;
  let bestStep = 0;

  let movesDown = 0;
  let movesStay = 0;
  let movesUp1 = 0;
  let movesUp2 = 0;
  let movesUp3 = 0;

  events.forEach((ev) => {
    if (ev.delta < 0) movesDown += 1;
    else if (ev.delta === 0) movesStay += 1;
    else if (ev.delta === 1) movesUp1 += 1;
    else if (ev.delta === 2) movesUp2 += 1;
    else movesUp3 += 1;

    step += ev.delta;
    if (step < 0) step = 0;
    if (step > goalSteps) step = goalSteps;

    if (step > bestStep) bestStep = step;
  });

  const throwsUsed = events.length;
  const nonNegativeMoves = movesStay + movesUp1 + movesUp2 + movesUp3;
  const accuracy = throwsUsed > 0 ? Math.round((nonNegativeMoves / throwsUsed) * 100) : 0;

  return {
    currentStep: step,
    bestStep,
    throwsUsed,
    movesDown,
    movesStay,
    movesUp1,
    movesUp2,
    movesUp3,
    nonNegativeMoves,
    accuracy,
  };
}

/* ---------- LADDER VISUAL ---------- */

function LadderViz({ currentStep, goalSteps }: { currentStep: number; goalSteps: number }) {
  const steps = Array.from({ length: goalSteps }, (_, i) => i + 1);

  return (
    <div
      className="ladder-viz hidden-sm"
      style={{
        width: "100%",
        maxWidth: 120,
        margin: "0 auto",
        height: 260,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 4,
      }}
    >
      {steps.map((step) => {
        const filled = step <= currentStep;

        return (
          <div
            key={step}
            style={{
              flex: 1,
              border: "1px solid var(--text)",
              borderRadius: 4,
              backgroundColor: filled ? "rgba(34,197,94,0.9)" : "transparent",
              transition: "background-color 0.15s ease",
            }}
          />
        );
      })}
    </div>
  );
}

/* ---------- COMPONENT ---------- */

export default function ScoringLadder({ onFinish, disabled, tier, level, onDartsUsed, externalUndo }: Props) {
  const [history, setHistory] = useState<LadderEvent[]>([]);
  const [finished, setFinished] = useState(false);

  const config = useMemo(() => getLadderConfig(tier, level), [tier, level]);

  const stats = useMemo(
    () => computeLadderStats(history, config.goalSteps),
    [history, config.goalSteps]
  );

  const throwsLeft = config.maxThrows - stats.throwsUsed;

  function finishGame(win: boolean, finalHistory: LadderEvent[]) {
    if (finished) return;
    setFinished(true);

    const finalStats = computeLadderStats(finalHistory, config.goalSteps);

    const payload = {
      game_key: "scoring_ladder",
      tier,
      level,

      win,
      current_step: finalStats.currentStep,
      best_step: finalStats.bestStep,
      goal_steps: config.goalSteps,

      throws_used: finalStats.throwsUsed,
      max_throws: config.maxThrows,

      progress: config.goalSteps > 0 ? finalStats.currentStep / config.goalSteps : 0,

      accuracy: finalStats.accuracy,
      moves: {
        down: finalStats.movesDown,
        stay: finalStats.movesStay,
        up1: finalStats.movesUp1,
        up2: finalStats.movesUp2,
        up3: finalStats.movesUp3,
      },

      // Standardized objective + stats for generic Results UI
      objective: {
        label: config.objectiveShort,
        target: config.goalSteps,
        progress: Math.min(finalStats.currentStep, config.goalSteps),
      },
      stats: {
        accuracy: finalStats.accuracy,
        current_step: finalStats.currentStep,
        best_step: finalStats.bestStep,
        throws_used: finalStats.throwsUsed,
        non_negative_moves: finalStats.nonNegativeMoves,
        moves_up: finalStats.movesUp1 + finalStats.movesUp2 + finalStats.movesUp3,
        moves_up3: finalStats.movesUp3,
      },
    };

    onFinish({ payload, win });
  }

  function recordMove(kind: MoveKind, delta: -1 | 0 | 1 | 2 | 3) {
    if (disabled || finished) return;
    if (history.length >= config.maxThrows) return;

    // One action equals one 3-dart visit
    onDartsUsed?.(3);

    const newHistory = [...history, { kind, delta }];
    const newStats = computeLadderStats(newHistory, config.goalSteps);

    setHistory(newHistory);

    const reachedGoal = newStats.currentStep >= config.goalSteps;
    const outOfThrows = newStats.throwsUsed >= config.maxThrows;

    if (reachedGoal || outOfThrows) {
      finishGame(reachedGoal, newHistory);
    }
  }

  function handleDown() {
    recordMove("DOWN", -1);
  }
  function handleStay() {
    recordMove("STAY", 0);
  }
  function handleUp1() {
    recordMove("UP1", 1);
  }
  function handleUp2() {
    recordMove("UP2", 2);
  }
  function handleUp3() {
    recordMove("UP3", 3);
  }

  function handleUndo() {
    if (disabled || finished) return;
    if (history.length === 0) return;
    setHistory(history.slice(0, -1));
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

  const canPress = !disabled && !finished && history.length < config.maxThrows;
  const canUndo = !disabled && !finished && history.length > 0;

  const [low, mid, high] = config.thresholds;
  const up3At = config.up3At;

  const labelDown = `< ${low}`;
  const labelStay = `${low} – ${mid - 1}`;
  const labelUp1 = `${mid} – ${high - 1}`;
  const labelUp2 = `${high} – ${up3At - 1}`;
  const labelUp3 = `≥ ${up3At}`;

  return (
    <div className="bullout">
      <div className="bullout-header">
        <div>
          <div className="muted">Scoring ladder · {config.maxThrows} throws</div>
        </div>
        <div className="objective-pill">
          <div className="objective-label">OBJECTIVE</div>
          <div className="objective-value">{config.objectiveShort}</div>
        </div>
      </div>

      <div className="bullout-main">
        <div
          className="card"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <LadderViz currentStep={stats.currentStep} goalSteps={config.goalSteps} />
        </div>

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
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="small muted">Current step</div>
              <div className="title-lg">{stats.currentStep}</div>
            </div>
            <div>
              <div className="small muted">Throws left</div>
              <div className="title-lg">{throwsLeft}</div>
            </div>
            <div>
              <div className="small muted">Best step</div>
              <div className="title-lg">{stats.bestStep}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">Accuracy</div>
                <div className="pill-value">{stats.accuracy}%</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Moves up</div>
                <div className="pill-value">{stats.movesUp1 + stats.movesUp2 + stats.movesUp3}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Moves down</div>
                <div className="pill-value">{stats.movesDown}</div>
              </div>
            </div>

            <div className="row bullout-stat-row" style={{ marginTop: 8 }}>
              <div className="pill pill-stat">
                <div className="pill-label">+1 steps</div>
                <div className="pill-value">{stats.movesUp1}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">+2 steps</div>
                <div className="pill-value">{stats.movesUp2}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">+3 steps</div>
                <div className="pill-value">{stats.movesUp3}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="t20scoring-controls" style={{ marginTop: 16 }} data-hotkeys="drill">
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn outline" style={{ flex: 1, minWidth: 150 }} disabled={!canPress} data-hotkey="1"
            onClick={handleDown}>
            {labelDown} (-1 step)
          </button>
          <button className="btn outline" style={{ flex: 1, minWidth: 150 }} disabled={!canPress} data-hotkey="2"
            onClick={handleStay}>
            {labelStay} (0 steps)
          </button>
          <button className="btn outline" style={{ flex: 1, minWidth: 150 }} disabled={!canPress} data-hotkey="3"
            onClick={handleUp1}>
            {labelUp1} (+1 step)
          </button>
          <button className="btn outline" style={{ flex: 1, minWidth: 150 }} disabled={!canPress} data-hotkey="4"
            onClick={handleUp2}>
            {labelUp2} (+2 steps)
          </button>
          <button className="btn outline" style={{ flex: 1, minWidth: 150 }} disabled={!canPress} data-hotkey="5"
            onClick={handleUp3}>
            {labelUp3} (+3 steps)
          </button>
	          <button className="btn" style={{ flex: 1, minWidth: 150 }} disabled={!canUndo} data-hotkey="0"
	            onClick={handleUndo}>
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}
