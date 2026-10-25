// src/drills/T20Scoring.tsx
import React, { useMemo, useState } from "react";
import DartboardHighlight, {
  tokensToSegments,
} from "../ui/DartboardHighlight";
import type { Tier } from "../xp/types";

export type ScoringSection = 20 | 19 | 18;

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
  externalUndo?: {
    token: number;
    steps: number;
  };

  /**
   * Selected in the Rules/start modal.
   * Locked for the duration of the game.
   */
  scoringSection?: ScoringSection;
};

type ThrowKind =
  | "MISS"
  | "LOW"
  | "GT_BASE"
  | "GT_4X"
  | "GT_5X"
  | "GT_6X"
  | "GT_7X"
  | "MAX";

type ThrowEvent = {
  kind: ThrowKind;
  points: number;
};

type RankConfigScoring = {
  labelLong: string;
  objectiveShort: string;
  targetPoints: number;
  maxVisits: number;
};

type ScoreBands = {
  bronzeLow: number;
  base: number;
  fourX: number;
  fiveX: number;
  sixX: number;
  sevenX: number;
  max: number;
};

type ScoringStats = {
  totalPoints: number;
  visitsUsed: number;
  scoringVisits: number;
  accuracy: number;
  bestStreak: number;
  avgPointsPerVisit: number;

  low: number;
  gtBase: number;
  gt4x: number;
  gt5x: number;
  gt6x: number;
  gt7x: number;
  maxHits: number;
  misses: number;
};

const MAX_VISITS = 50;

/* --------------------------------------------------
   RANK CONFIG
-------------------------------------------------- */

function getRankConfigScoring(
  tier: Tier,
  level: number
): RankConfigScoring {
  let target = 3;

  /*
   * Previous objectives over 100 visits:
   *
   * Bronze:     10 / 20
   * Silver:     45 / 60
   * Gold:       80 / 100
   * Platinum:  125 / 150
   * Diamond:   200 / 250
   *
   * New objectives over 50 visits:
   * half the value and round upward where needed.
   */
  if (tier === "Bronze") {
    target = level <= 3 ? 5 : 10;
  } else if (tier === "Silver") {
    target = level <= 3 ? 23 : 30;
  } else if (tier === "Gold") {
    target = level <= 3 ? 40 : 50;
  } else if (tier === "Platinum") {
    target = level <= 3 ? 63 : 75;
  } else if (tier === "Diamond") {
    target = level <= 3 ? 100 : 125;
  }

  return {
    labelLong: `Score at least ${target} points in ${MAX_VISITS} visits`,
    objectiveShort: `${target} pts`,
    targetPoints: target,
    maxVisits: MAX_VISITS,
  };
}

/* --------------------------------------------------
   SCORE BANDS
-------------------------------------------------- */

function getScoreBands(
  section: ScoringSection
): ScoreBands {
  /*
   * 20s:
   * Bronze extra: 45–60
   * >60          = 1
   * >80          = 2
   * >100         = 3
   * >120         = 5
   * >140         = 7
   * 180          = 10
   *
   * 19s:
   * Bronze extra: 43–57
   * >57
   * >76
   * >95
   * >114
   * >133
   * 171
   *
   * 18s:
   * Bronze extra: 41–54
   * >54
   * >72
   * >90
   * >108
   * >126
   * 162
   */

  const base =
    section * 3;

  return {
    bronzeLow:
      Math.ceil(
        base * 0.75
      ),

    base,

    fourX:
      section * 4,

    fiveX:
      section * 5,

    sixX:
      section * 6,

    sevenX:
      section * 7,

    max:
      section * 9,
  };
}

/* --------------------------------------------------
   STATS
-------------------------------------------------- */

function computeStats(
  events: ThrowEvent[]
): ScoringStats {
  let totalPoints = 0;
  let scoringVisits = 0;

  let bestStreak = 0;
  let currentStreak = 0;

  let low = 0;
  let gtBase = 0;
  let gt4x = 0;
  let gt5x = 0;
  let gt6x = 0;
  let gt7x = 0;
  let maxHits = 0;
  let misses = 0;

  events.forEach(
    (event) => {
      totalPoints +=
        event.points;

      if (
        event.points > 0
      ) {
        scoringVisits += 1;
        currentStreak += 1;

        if (
          currentStreak >
          bestStreak
        ) {
          bestStreak =
            currentStreak;
        }
      } else {
        currentStreak = 0;
        misses += 1;
      }

      switch (
        event.kind
      ) {
        case "LOW":
          low += 1;
          break;

        case "GT_BASE":
          gtBase += 1;
          break;

        case "GT_4X":
          gt4x += 1;
          break;

        case "GT_5X":
          gt5x += 1;
          break;

        case "GT_6X":
          gt6x += 1;
          break;

        case "GT_7X":
          gt7x += 1;
          break;

        case "MAX":
          maxHits += 1;
          break;

        default:
          break;
      }
    }
  );

  const visitsUsed =
    events.length;

  const accuracy =
    visitsUsed > 0
      ? Math.round(
          (
            scoringVisits /
            visitsUsed
          ) * 100
        )
      : 0;

  const avgPointsPerVisit =
    visitsUsed > 0
      ? Number(
          (
            totalPoints /
            visitsUsed
          ).toFixed(2)
        )
      : 0;

  return {
    totalPoints,
    visitsUsed,
    scoringVisits,
    accuracy,
    bestStreak,
    avgPointsPerVisit,

    low,
    gtBase,
    gt4x,
    gt5x,
    gt6x,
    gt7x,
    maxHits,
    misses,
  };
}

/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

export default function T20Scoring({
  onFinish,
  disabled,
  tier,
  level,
  onDartsUsed,
  externalUndo,
  scoringSection = 20,
}: Props) {
  const [
    throwHistory,
    setThrowHistory,
  ] = useState<
    ThrowEvent[]
  >([]);

  const [
    finished,
    setFinished,
  ] = useState(false);

  const rankConfig =
    useMemo(
      () =>
        getRankConfigScoring(
          tier,
          level
        ),
      [
        tier,
        level,
      ]
    );

  const scoreBands =
    useMemo(
      () =>
        getScoreBands(
          scoringSection
        ),
      [
        scoringSection,
      ]
    );

  const scoringSegments =
    useMemo(
      () =>
        tokensToSegments([
          String(
            scoringSection
          ),
          `D${scoringSection}`,
          `T${scoringSection}`,
        ]),
      [
        scoringSection,
      ]
    );

  const stats =
    useMemo(
      () =>
        computeStats(
          throwHistory
        ),
      [
        throwHistory,
      ]
    );

  const visitsLeft =
    rankConfig.maxVisits -
    stats.visitsUsed;

  const isBronze =
    tier === "Bronze";

  /* --------------------------------------------------
     FINISH
  -------------------------------------------------- */

  function finishGame(
    win: boolean,
    history: ThrowEvent[]
  ) {
    if (finished) {
      return;
    }

    setFinished(
      true
    );

    const finalStats =
      computeStats(
        history
      );

    const payload = {
      game_key:
        "t20_scoring",

      tier,
      level,

      scoring_section:
        scoringSection,

      win,

      points:
        finalStats.totalPoints,

      target_points:
        rankConfig.targetPoints,

      visits_used:
        finalStats.visitsUsed,

      max_visits:
        rankConfig.maxVisits,

      /*
       * Keep these for compatibility with
       * the existing generic results/session
       * handling where one action is treated
       * as one "throw".
       */
      throws_used:
        finalStats.visitsUsed,

      max_throws:
        rankConfig.maxVisits,

      darts_used:
        finalStats.visitsUsed *
        3,

      accuracy:
        finalStats.accuracy,

      best_streak:
        finalStats.bestStreak,

      avg_points_per_visit:
        finalStats.avgPointsPerVisit,

      scoring_visits:
        finalStats.scoringVisits,

      score_bands: {
        bronze_low:
          scoreBands.bronzeLow,

        base:
          scoreBands.base,

        four_x:
          scoreBands.fourX,

        five_x:
          scoreBands.fiveX,

        six_x:
          scoreBands.sixX,

        seven_x:
          scoreBands.sevenX,

        max:
          scoreBands.max,
      },

      hit_counts: {
        low:
          finalStats.low,

        gt_base:
          finalStats.gtBase,

        gt_4x:
          finalStats.gt4x,

        gt_5x:
          finalStats.gt5x,

        gt_6x:
          finalStats.gt6x,

        gt_7x:
          finalStats.gt7x,

        max:
          finalStats.maxHits,

        misses:
          finalStats.misses,
      },

      objective: {
        label:
          rankConfig.objectiveShort,

        target:
          rankConfig.targetPoints,

        progress:
          Math.min(
            finalStats.totalPoints,
            rankConfig.targetPoints
          ),
      },

      stats: {
        accuracy:
          finalStats.accuracy,

        avg_points_per_visit:
          finalStats.avgPointsPerVisit,

        best_streak:
          finalStats.bestStreak,

        scoring_visits:
          finalStats.scoringVisits,

        points:
          finalStats.totalPoints,

        scoring_section:
          scoringSection,
      },
    };

    onFinish({
      payload,
      win,
    });
  }

  /* --------------------------------------------------
     RECORD VISIT
  -------------------------------------------------- */

  function recordVisit(
    kind: ThrowKind,
    points: number
  ) {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      throwHistory.length >=
      rankConfig.maxVisits
    ) {
      return;
    }

    /*
     * One scoring action is one
     * complete 3-dart visit.
     */
    onDartsUsed?.(
      3
    );

    const newHistory = [
      ...throwHistory,
      {
        kind,
        points,
      },
    ];

    const newStats =
      computeStats(
        newHistory
      );

    setThrowHistory(
      newHistory
    );

    const goalReached =
      newStats.totalPoints >=
      rankConfig.targetPoints;

    const outOfVisits =
      newStats.visitsUsed >=
      rankConfig.maxVisits;

    if (
      goalReached ||
      outOfVisits
    ) {
      finishGame(
        goalReached,
        newHistory
      );
    }
  }

  /* --------------------------------------------------
     INPUT HANDLERS
  -------------------------------------------------- */

  function handleMiss() {
    recordVisit(
      "MISS",
      0
    );
  }

  /**
   * Bronze-only lower scoring band.
   *
   * 20s: 45–60
   * 19s: 43–57
   * 18s: 41–54
   */
  function handleLow() {
    recordVisit(
      "LOW",
      1
    );
  }

  function handleGtBase() {
    recordVisit(
      "GT_BASE",
      1
    );
  }

  function handleGt4x() {
    recordVisit(
      "GT_4X",
      2
    );
  }

  function handleGt5x() {
    recordVisit(
      "GT_5X",
      3
    );
  }

  function handleGt6x() {
    recordVisit(
      "GT_6X",
      5
    );
  }

  function handleGt7x() {
    recordVisit(
      "GT_7X",
      7
    );
  }

  function handleMax() {
    recordVisit(
      "MAX",
      10
    );
  }

  /* --------------------------------------------------
     UNDO
  -------------------------------------------------- */

  function handleUndo() {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      throwHistory.length ===
      0
    ) {
      return;
    }

    setThrowHistory(
      (
        current
      ) =>
        current.slice(
          0,
          -1
        )
    );
  }

  React.useEffect(
    () => {
      if (
        !externalUndo ||
        externalUndo.steps <=
          0
      ) {
        return;
      }

      const timeout =
        window.setTimeout(
          () => {
            setThrowHistory(
              (
                current
              ) => {
                const steps =
                  Math.min(
                    externalUndo.steps,
                    current.length
                  );

                return current.slice(
                  0,
                  current.length -
                    steps
                );
              }
            );
          },
          0
        );

      return () =>
        window.clearTimeout(
          timeout
        );
    },
    [
      externalUndo?.token,
      externalUndo?.steps,
    ]
  );

  const canPress =
    !disabled &&
    !finished &&
    throwHistory.length <
      rankConfig.maxVisits;

  const canUndo =
    !disabled &&
    !finished &&
    throwHistory.length >
      0;

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="bullout">
      {/* Header */}
      <div className="bullout-header game-objective-sticky">
        <div>
          <div className="muted">
            Scoring{" "}
            {scoringSection}s ·{" "}
            {MAX_VISITS} visits
          </div>

          <div
            className="small muted"
            style={{
              marginTop: 3,
            }}
          >
            Practice the{" "}
            {scoringSection} section
          </div>
        </div>

        <div className="objective-pill">
          <div className="objective-label">
            OBJECTIVE
          </div>

          <div className="objective-value">
            {
              rankConfig.objectiveShort
            }
          </div>
        </div>
      </div>

      {/* Board */}
      <DartboardHighlight
        segments={
          scoringSegments
        }
      />

      <div
        style={{
          marginTop: 12,
          textAlign:
            "center",
        }}
      >
        <div
          className="muted small hidden-sm"
          style={{
            marginTop: 8,
            marginBottom: 20,
          }}
        >
          Any stray dart counts. Another section can be used if your target is blocked.
        </div>

        <div className="bullout-main">
          {/* Controls */}
          <div
            className="bull-board-wrapper card"
            style={{
              flex: 1,

              display:
                "flex",

              flexDirection:
                "column",

              justifyContent:
                "center",
            }}
          >
            <div
              className="t20scoring-controls"
              data-hotkeys="drill"
            >
              <div
                className="row"
                style={{
                  gap: 8,
                  flexWrap:
                    "wrap",
                }}
              >
                {/* Bronze-only extra scoring band */}
                {isBronze && (
                  <button
                    className="btn outline"
                    style={{
                      flex: 1,
                      minWidth: 140,
                    }}
                    disabled={
                      !canPress
                    }
                    data-hotkey="1"
                    onClick={
                      handleLow
                    }
                  >
                    {
                      scoreBands.bronzeLow
                    }
                    –
                    {
                      scoreBands.base
                    }{" "}
                    (1 pt)
                  </button>
                )}

                {/* Normal scoring bands */}
                <button
                  className="btn outline"
                  style={{
                    flex: 1,
                    minWidth: 140,
                  }}
                  disabled={
                    !canPress
                  }
                  data-hotkey={
                    isBronze
                      ? "2"
                      : "1"
                  }
                  onClick={
                    handleGtBase
                  }
                >
                  &gt;{" "}
                  {
                    scoreBands.base
                  }{" "}
                  (1 pt)
                </button>

                <button
                  className="btn outline"
                  style={{
                    flex: 1,
                    minWidth: 140,
                  }}
                  disabled={
                    !canPress
                  }
                  data-hotkey={
                    isBronze
                      ? "3"
                      : "2"
                  }
                  onClick={
                    handleGt4x
                  }
                >
                  &gt;{" "}
                  {
                    scoreBands.fourX
                  }{" "}
                  (2 pts)
                </button>

                <button
                  className="btn outline"
                  style={{
                    flex: 1,
                    minWidth: 140,
                  }}
                  disabled={
                    !canPress
                  }
                  data-hotkey={
                    isBronze
                      ? "4"
                      : "3"
                  }
                  onClick={
                    handleGt5x
                  }
                >
                  &gt;{" "}
                  {
                    scoreBands.fiveX
                  }{" "}
                  (3 pts)
                </button>

                <button
                  className="btn outline"
                  style={{
                    flex: 1,
                    minWidth: 140,
                  }}
                  disabled={
                    !canPress
                  }
                  data-hotkey={
                    isBronze
                      ? "5"
                      : "4"
                  }
                  onClick={
                    handleGt6x
                  }
                >
                  &gt;{" "}
                  {
                    scoreBands.sixX
                  }{" "}
                  (5 pts)
                </button>

                <button
                  className="btn outline"
                  style={{
                    flex: 1,
                    minWidth: 140,
                  }}
                  disabled={
                    !canPress
                  }
                  data-hotkey={
                    isBronze
                      ? "6"
                      : "5"
                  }
                  onClick={
                    handleGt7x
                  }
                >
                  &gt;{" "}
                  {
                    scoreBands.sevenX
                  }{" "}
                  (7 pts)
                </button>

                <button
                  className="btn outline"
                  style={{
                    flex: 1,
                    minWidth: 140,
                  }}
                  disabled={
                    !canPress
                  }
                  data-hotkey={
                    isBronze
                      ? "7"
                      : "6"
                  }
                  onClick={
                    handleMax
                  }
                >
                  {
                    scoreBands.max
                  }{" "}
                  (10 pts)
                </button>

                {/* Miss */}
                <button
                  className="btn secondary"
                  style={{
                    flex: 1,
                    minWidth: 140,
                  }}
                  disabled={
                    !canPress
                  }
                  data-hotkey={
                    isBronze
                      ? "8"
                      : "7"
                  }
                  onClick={
                    handleMiss
                  }
                >
                  {isBronze
                    ? `< ${scoreBands.bronzeLow}`
                    : `≤ ${scoreBands.base}`}
                </button>

                {/* Undo */}
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    minWidth: 140,
                  }}
                  disabled={
                    !canUndo
                  }
                  onClick={
                    handleUndo
                  }
                  data-hotkey="0"
                >
                  Undo
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div
            className="bullout-stats card"
            style={{
              flex:
                "0 0 280px",

              maxWidth:
                "100%",

              alignSelf:
                "stretch",

              display:
                "flex",

              flexDirection:
                "column",
            }}
          >
            {/* Main stats */}
            <div
              className="row"
              style={{
                justifyContent:
                  "space-between",
              }}
            >
              <div>
                <div className="small muted">
                  Points total
                </div>

                <div className="title-lg">
                  {
                    stats.totalPoints
                  }
                </div>
              </div>

              <div>
                <div className="small muted">
                  Visits left
                </div>

                <div className="title-lg">
                  {
                    visitsLeft
                  }
                </div>
              </div>

              <div>
                <div className="small muted">
                  Avg pts / visit
                </div>

                <div className="title-lg">
                  {
                    stats.avgPointsPerVisit
                  }
                </div>
              </div>
            </div>

            {/* Secondary stats */}
            <div
              style={{
                marginTop: 12,
              }}
            >
              <div className="row bullout-stat-row">
                <div className="pill pill-stat">
                  <div className="pill-label">
                    Accuracy
                  </div>

                  <div className="pill-value">
                    {
                      stats.accuracy
                    }
                    %
                  </div>
                </div>

                <div className="pill pill-stat">
                  <div className="pill-label">
                    Scoring visits
                  </div>

                  <div className="pill-value">
                    {
                      stats.scoringVisits
                    }
                  </div>
                </div>

                <div className="pill pill-stat">
                  <div className="pill-label">
                    &gt;{" "}
                    {
                      scoreBands.base
                    }
                  </div>

                  <div className="pill-value">
                    {
                      stats.gtBase
                    }
                  </div>
                </div>
              </div>

              <div
                className="row bullout-stat-row"
                style={{
                  marginTop: 8,
                }}
              >
                <div className="pill pill-stat">
                  <div className="pill-label">
                    &gt;{" "}
                    {
                      scoreBands.fiveX
                    }
                  </div>

                  <div className="pill-value">
                    {
                      stats.gt5x
                    }
                  </div>
                </div>

                <div className="pill pill-stat">
                  <div className="pill-label">
                    &gt;{" "}
                    {
                      scoreBands.sevenX
                    }
                  </div>

                  <div className="pill-value">
                    {
                      stats.gt7x
                    }
                  </div>
                </div>

                <div className="pill pill-stat">
                  <div className="pill-label">
                    {
                      scoreBands.max
                    }
                  </div>

                  <div className="pill-value">
                    {
                      stats.maxHits
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Consistency */}
            <div
              style={{
                marginTop: 14,
              }}
            >
              <div className="small muted">
                Best scoring streak
              </div>

              <div className="title-lg">
                {
                  stats.bestStreak
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}