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
   MAIN CHECKOUTS DRILL COMPONENT
---------------------------------*/

export default function ThreeDartCheckouts({
  onFinish,
  disabled,
  tier,
  level,
}: Props) {
  const TARGET_SCORES = [40, 32, 36, 24];

  const requiredCheckouts = getRankTarget(tier, level);
  const doubleOnly = isDoubleRequired(tier);

  // Game state
  const [currentIdx, setCurrentIdx] = useState(0); // 0..3 for TARGET_SCORES
  const [throwsOnThisScore, setThrowsOnThisScore] = useState(0); // 0..6
  const [totalThrows, setTotalThrows] = useState(0); // overall 0..24
  const [totalCheckouts, setTotalCheckouts] = useState(0);
  const [finished, setFinished] = useState(false);

  const [history, setHistory] = useState<{ target: number; success: boolean }[]>(
    []
  );

  const currentScore = TARGET_SCORES[currentIdx];

  const totalDartsUsed = totalThrows * 3;
  const conversion =
    totalThrows === 0 ? 0 : Math.round((totalCheckouts / totalThrows) * 100);

  // Derived stats for UI
  const checkoutsOnThisScore = useMemo(
    () => history.filter((h) => h.target === currentScore && h.success).length,
    [history, currentScore]
  );

  const completedScores = currentIdx;

  /* --------------------------
       END GAME
  ----------------------------*/

  function finishGame(win: boolean) {
    if (finished) return;

    const payload = {
      game_key: "three_dart_checkouts",
      tier,
      level,

      win,
      // "throws" in this drill means visits (3 darts each)
      total_throws: totalThrows,
      total_darts_used: totalDartsUsed,

      total_checkouts: totalCheckouts,
      required_checkouts: requiredCheckouts,
      conversion,

      // Helpful for XP inference / results stats
      throws_used: totalThrows * 3, // darts used
      max_throws: 24 * 3,           // 24 visits * 3 darts
      progress: requiredCheckouts > 0 ? totalCheckouts / requiredCheckouts : win ? 1 : 0,

      scores: TARGET_SCORES.map((t) => {
        const throwsForThis = history.filter((h) => h.target === t);
        return {
          target: t,
          throws: throwsForThis.length,
          checkouts: throwsForThis.filter((h) => h.success).length,
        };
      }),

      // Objective + stats (used by the Results page)
      objective: {
        label: "Checkouts",
        target: requiredCheckouts,
        progress: totalCheckouts,
      },
      stats: {
        accuracy: conversion,
        checkout_count: totalCheckouts,
        required_checkouts: requiredCheckouts,
        total_throws: totalThrows,
        darts_used: totalDartsUsed,
      },
    };

    setFinished(true);
    onFinish({ payload, win });
  }

  /* --------------------------
       THROW LOGIC
  ----------------------------*/

  function handleCheckout() {
    if (disabled || finished) return;
    if (throwsOnThisScore >= 6) return;

    const newTotalThrows = totalThrows + 1;
    const newTotalCheckouts = totalCheckouts + 1;

    setHistory((h) => [...h, { target: currentScore, success: true }]);
    setTotalThrows(newTotalThrows);
    setTotalCheckouts(newTotalCheckouts);
    setThrowsOnThisScore(throwsOnThisScore + 1);

    if (newTotalCheckouts >= requiredCheckouts) {
      finishGame(true);
      return;
    }

    if (throwsOnThisScore + 1 >= 6) {
      if (currentIdx < TARGET_SCORES.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setThrowsOnThisScore(0);
      } else {
        finishGame(newTotalCheckouts >= requiredCheckouts);
      }
    }
  }

  function handleMiss() {
    if (disabled || finished) return;
    if (throwsOnThisScore >= 6) return;

    const newTotalThrows = totalThrows + 1;

    setHistory((h) => [...h, { target: currentScore, success: false }]);
    setTotalThrows(newTotalThrows);
    setThrowsOnThisScore(throwsOnThisScore + 1);

    if (throwsOnThisScore + 1 >= 6) {
      if (currentIdx < TARGET_SCORES.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setThrowsOnThisScore(0);
      } else {
        finishGame(totalCheckouts >= requiredCheckouts);
      }
    }
  }

  function handleUndo() {
    if (disabled || finished) return;
    if (history.length === 0) return;

    const last = history[history.length - 1];
    if (last.target !== currentScore) return;

    setHistory((h) => h.slice(0, -1));
    setThrowsOnThisScore((v) => Math.max(0, v - 1));
    setTotalThrows((t) => Math.max(0, t - 1));

    if (last.success) {
      setTotalCheckouts((c) => Math.max(0, c - 1));
    }
  }

  /* --------------------------
       UI LABELS
  ----------------------------*/

  const scoreLabelMap: Record<number, number> = {
    40: 20,
    32: 16,
    36: 18,
    24: 12,
  };

  const currentDouble = scoreLabelMap[currentScore];

  const requirementSuffix = doubleOnly ? " (double out)" : "";

  return (
    <div className="bullout">
      <div className="bullout-header">
        <div>
          <div className="muted">
            3-Dart Checkouts · Target {currentScore} · Throw {throwsOnThisScore + 1}/6
          </div>
        </div>

        <div className="objective-pill">
          <div className="objective-label">Objective</div>
          <div className="objective-value">
            {totalCheckouts} / {requiredCheckouts}{requirementSuffix}
          </div>
        </div>
      </div>

      <div className="bullout-main">
        <CheckoutsBoard score={currentScore} doubleNum={currentDouble} hits={totalCheckouts} />

        <div className="bullout-stats card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div className="title-lg">{throwsOnThisScore}</div>
              <div className="muted">Throws</div>
            </div>

            <div style={{ textAlign: "center", flex: 1 }}>
              <div className="title-lg">{checkoutsOnThisScore}</div>
              <div className="muted">Checkouts</div>
            </div>

            <div style={{ textAlign: "center", flex: 1 }}>
              <div className="title-lg">
                {completedScores} / {TARGET_SCORES.length}
              </div>
              <div className="muted">Section</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">Total throws</div>
                <div className="pill-value">{totalThrows}</div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  <br />
                  Conversion
                </div>
                <div className="pill-value">{conversion}%</div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">Darts used</div>
                <div className="pill-value">{totalDartsUsed}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bullout-controls">
        <button className="btn" onClick={handleCheckout} disabled={disabled || finished}>
          Check
        </button>

        <button className="btn secondary" onClick={handleMiss} disabled={disabled || finished}>
          Bust
        </button>

        <button
          className="btn outline"
          onClick={handleUndo}
          disabled={disabled || finished || history.length === 0}
        >
          Undo
        </button>
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
}: {
  score: number;
  doubleNum: number;
  hits: number;
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
    <div className="bull-board-wrapper card">
      <svg viewBox="0 0 120 120" className="bull-board">
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

          <circle cx="60" cy="60" r="22" fill="#020617" />
          <text x="60" y="57" textAnchor="middle" fontSize="18" fill="#f9fafb" fontWeight="700">
            D{doubleNum}
          </text>
          <text x="60" y="75" textAnchor="middle" fontSize="10" fill="#9ca3af">
            Score {score}
          </text>
        </g>
      </svg>
    </div>
  );
}
