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

/* -------------------------------
   RANK CONFIG
---------------------------------*/

function getRankTarget(tier: Tier, level: number) {
  if (tier === "Bronze") return level <= 3 ? 8 : 12;
  if (tier === "Silver") return level <= 3 ? 4 : 8;
  if (tier === "Gold") return level <= 3 ? 8 : 12;
  if (tier === "Platinum") return level <= 3 ? 12 : 15;
  if (tier === "Diamond") return level <= 3 ? 15 : 18;
  return 8;
}

function isDoubleRequired(tier: Tier) {
  // Bronze: singles allowed; Silver+ require double out
  return tier !== "Bronze";
}

/* -------------------------------
   HELPERS
---------------------------------*/

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/* -------------------------------
   MAIN CHECKOUTS DRILL COMPONENT
---------------------------------*/

export default function ThreeDartCheckouts({
  onFinish,
  disabled,
  tier,
  level,
  onDartsUsed,
  externalUndo,
}: Props) {
  const TARGET_SCORES = [40, 32, 36, 24] as const;
  const MAX_THROWS = 24; // 6 throws per target x 4 targets (each throw = 3 darts)

  const requiredCheckouts = getRankTarget(tier, level);
  const doubleOnly = isDoubleRequired(tier);

  // “Bag” contains exactly 6 of each target; we draw 1 per throw
  const initialBag = useMemo(() => {
    const bag: number[] = [];
    for (const t of TARGET_SCORES) {
      for (let i = 0; i < 6; i++) bag.push(t);
    }
    return shuffle(bag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, level]);

  const [bag, setBag] = useState<number[]>(initialBag);

  // Game state
  const [totalThrowsUsed, setTotalThrowsUsed] = useState(0); // 0..24 (visits)
  const [totalCheckouts, setTotalCheckouts] = useState(0);
  const [finished, setFinished] = useState(false);

  const [history, setHistory] = useState<{ target: number; success: boolean }[]>(
    []
  );

  const currentScore = bag[0] ?? TARGET_SCORES[0];

  const throwsLeft = MAX_THROWS - totalThrowsUsed;
  const totalDartsUsed = totalThrowsUsed * 3;

  const conversion =
    totalThrowsUsed === 0
      ? 0
      : Math.round((totalCheckouts / totalThrowsUsed) * 100);

  const checkoutsOnThisScore = useMemo(() => {
    return history.filter((h) => h.target === currentScore && h.success).length;
  }, [history, currentScore]);

  const outLabel = doubleOnly ? "Double out" : "Single out";

  /* --------------------------
       END GAME
  ----------------------------*/

  function finishGame(win: boolean, finalHistory?: { target: number; success: boolean }[]) {
    if (finished) return;

    const hist = finalHistory ?? history;
    const finalThrowsUsed = hist.length; // each history entry is one throw/visit
    const finalCheckouts = hist.filter((h) => h.success).length;

    const finalDartsUsed = finalThrowsUsed * 3;
    const finalConversion =
      finalThrowsUsed === 0 ? 0 : Math.round((finalCheckouts / finalThrowsUsed) * 100);

    const payload = {
      game_key: "three_dart_checkouts",
      tier,
      level,

      win,

      // Legacy-ish fields still used by UI/XP mapping
      total_throws: finalThrowsUsed,         // visits
      total_darts_used: finalDartsUsed,      // darts

      total_checkouts: finalCheckouts,
      required_checkouts: requiredCheckouts,
      conversion: finalConversion,

      // Standardized fields used by results / XP logic
      throws_used: finalDartsUsed,           // darts used
      max_throws: MAX_THROWS * 3,            // max darts
      progress:
        requiredCheckouts > 0
          ? finalCheckouts / requiredCheckouts
          : win
          ? 1
          : 0,

      scores: TARGET_SCORES.map((t) => {
        const throwsForThis = hist.filter((h) => h.target === t);
        return {
          target: t,
          throws: throwsForThis.length,
          checkouts: throwsForThis.filter((h) => h.success).length,
        };
      }),

      objective: {
        label: "Checkouts",
        target: requiredCheckouts,
        progress: finalCheckouts,
      },
      stats: {
        accuracy: finalConversion,
        checkout_count: finalCheckouts,
        required_checkouts: requiredCheckouts,
        total_throws: finalThrowsUsed,
        darts_used: finalDartsUsed,
      },
    };

    setFinished(true);
    onFinish({ payload, win });
  }

  /* --------------------------
       THROW LOGIC
  ----------------------------*/

  function applyThrow(success: boolean) {
    if (disabled || finished) return;

    // Each action represents one 3-dart visit
    onDartsUsed?.(3);
    if (totalThrowsUsed >= MAX_THROWS) return;
    if (bag.length === 0) return;

    const target = bag[0];

    const newHistory = [...history, { target, success }];
    const newThrowsUsed = totalThrowsUsed + 1;
    const newCheckouts = totalCheckouts + (success ? 1 : 0);
    const newBag = bag.slice(1); // next random target

    setHistory(newHistory);
    setTotalThrowsUsed(newThrowsUsed);
    setTotalCheckouts(newCheckouts);
    setBag(newBag);

    // Win early if objective met
    if (newCheckouts >= requiredCheckouts) {
      finishGame(true, newHistory);
      return;
    }

    // If out of throws, finish
    if (newThrowsUsed >= MAX_THROWS) {
      finishGame(newCheckouts >= requiredCheckouts, newHistory);
    }
  }

  function handleCheckout() {
    applyThrow(true);
  }

  function handleMiss() {
    applyThrow(false);
  }

  function handleUndo() {
    if (disabled || finished) return;
    if (history.length === 0) return;

    const last = history[history.length - 1];

    // restore last target to the front of the bag so the user replays it
    setBag((b) => [last.target, ...b]);

    setHistory((h) => h.slice(0, -1));
    setTotalThrowsUsed((t) => Math.max(0, t - 1));

    if (last.success) {
      setTotalCheckouts((c) => Math.max(0, c - 1));
    }
  }

  // Allow Versus Mode to request undo externally (e.g. go back a hand)
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

  /* --------------------------
       UI LABELS
  ----------------------------*/

  const scoreLabelMap: Record<number, number> = {
    40: 20,
    32: 16,
    36: 18,
    24: 12,
  };

  const currentDouble = scoreLabelMap[currentScore] ?? 20;

  return (
    <div className="bullout">
      {/* Header */}
      <div className="bullout-header">
        <div>
          <div className="muted">
            3-Dart Checkouts
          </div>
        </div>

        <div className="objective-pill">
          <div className="objective-label">Objective</div>
          <div className="objective-value">
            {totalCheckouts} / {requiredCheckouts}
          </div>
        </div>
      </div>

      {/* Board on top (like Bull Out) */}
      <CheckoutsBoard
        score={currentScore}
        doubleNum={currentDouble}
        hits={totalCheckouts}
        outLabel={outLabel}
      />

      {/* Main layout: controls left (card), stats right (card) */}
      <div className="bullout-main">
        {/* Controls card (left) */}
        <div className="bullout-controls card" data-hotkeys="drill">
          <button
            className="btn success"
            data-hotkey="1"
            onClick={handleCheckout}
            disabled={disabled || finished || totalThrowsUsed >= MAX_THROWS}
          >
            Check
          </button>

          <button
            className="btn secondary"
            data-hotkey="2"
            onClick={handleMiss}
            disabled={disabled || finished || totalThrowsUsed >= MAX_THROWS}
          >
            Bust / Miss
          </button>

          <button
            className="btn outline"
            data-hotkey="0"
            onClick={handleUndo}
            disabled={disabled || finished || history.length === 0}
	          >
            Undo
          </button>


        </div>

        {/* Stats card (right) */}
        <div className="bullout-stats card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div className="title-lg">{throwsLeft}</div>
              <div className="muted">Throws left</div>
            </div>

            <div style={{ textAlign: "center", flex: 1 }}>
              <div className="title-lg">{checkoutsOnThisScore}</div>
              <div className="muted">Checkouts on {currentScore}</div>
            </div>

            <div style={{ textAlign: "center", flex: 1 }}>
              <div className="title-lg">{totalCheckouts}</div>
              <div className="muted">Total checkouts</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">Throws used</div>
                <div className="pill-value">{totalThrowsUsed}</div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">Conversion</div>
                <div className="pill-value">{conversion}%</div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">Darts used</div>
                <div className="pill-value">{totalDartsUsed}</div>
              </div>
            </div>
            <div className="muted small" style={{ marginTop: 12 }}>
                Random target each throw. 6 throws per target (24 total).
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------
   BOARD SVG
---------------------------------*/

function CheckoutsBoard({
  score,
  doubleNum,
  hits,
  outLabel,
}: {
  score: number;
  doubleNum: number;
  hits: number;
  outLabel: string;
}) {
  const BOARD_ORDER = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
    3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];

  const idx = BOARD_ORDER.indexOf(doubleNum);
  const segment = idx === -1 ? 0 : idx;

  const rDouble = 52;
  const circ = 2 * Math.PI * rDouble;
  const segLen = circ / 20;
  const dash = `${segLen} ${circ - segLen}`;
  const segmentAngle = 360 / 20;
  const rotationDeg = segment * segmentAngle - 90 - segmentAngle / 2;

  return (
    <div
      className="bull-board-wrapp checkout-board-wrapper hidden-sm"
      style={{
        // Bigger board (nice on tablets)
        maxWidth: 560,
        margin: "0 auto 12px",
      }}
    >
      <svg
        viewBox="0 0 120 120"
        className="bull-board checkout-board"
        style={{ width: "100%", height: "auto" }}
      >
        <circle cx="60" cy="60" r="58" fill="#020617" />
        <circle cx="60" cy="60" r="50" fill="#020617" />
        <circle cx="60" cy="60" r={rDouble} fill="none" stroke="#0b1120" strokeWidth="8" />

        <g key={hits} className="bull-group">
          <g transform={`rotate(${rotationDeg} 60 60)`}>
            <circle
              cx="60"
              cy="60"
              r={rDouble}
              fill="none"
              stroke="#00c46a"
              strokeWidth="8"
              strokeDasharray={dash}
            />
          </g>

          <circle cx="60" cy="60" r="24" fill="#020617" />
          <text
            x="60"
            y="56"
            textAnchor="middle"
            fontSize="22"
            fill="#f9fafb"
            fontWeight="800"
          >
            {score}
          </text>
          <text
            x="60"
            y="76"
            textAnchor="middle"
            fontSize="11"
            fill="#9ca3af"
          >
            {outLabel}
          </text>
        </g>
      </svg>
    </div>
  );
}
