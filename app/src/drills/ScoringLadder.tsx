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
  onDartsUsed?: (count: number) => void;
  externalUndo?: {
    token: number;
    steps: number;
  };
};

type ThrowKind =
  | "MISS"
  | "BASE60"
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
  neutral60: number;
};

const MAX_THROWS = 100;

/* ---------- RANK CONFIG ---------- */

function getRankConfigScoring(
  tier: Tier,
  level: number
): RankConfigScoring {
  let target = 5;

  if (tier === "Bronze") {
    target =
      level <= 3
        ? 10
        : 20;
  } else if (
    tier === "Silver"
  ) {
    target =
      level <= 3
        ? 45
        : 60;
  } else if (
    tier === "Gold"
  ) {
    target =
      level <= 3
        ? 80
        : 100;
  } else if (
    tier === "Platinum"
  ) {
    target =
      level <= 3
        ? 125
        : 150;
  } else if (
    tier === "Diamond"
  ) {
    target =
      level <= 3
        ? 200
        : 250;
  }

  return {
    labelLong:
      `Score at least ${target} ladder points in ${MAX_THROWS} throws`,
    objectiveShort:
      `${target} pts`,
    targetPoints:
      target,
    maxThrows:
      MAX_THROWS,
  };
}

/* ---------- STATS ---------- */

function computeStats(
  events: ThrowEvent[]
): ScoringStats {
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
  let neutral60 = 0;

  events.forEach(
    (event) => {
      totalPoints +=
        event.points;

      /*
       * BASE60 is neutral:
       *
       * - no ladder points
       * - not counted as a miss
       * - does not increase scoringThrows
       * - does not break the current consistency streak
       */
      if (
        event.kind ===
        "BASE60"
      ) {
        neutral60 += 1;
      } else if (
        event.points > 0
      ) {
        scoringThrows +=
          1;

        currentStreak +=
          1;

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
    }
  );

  const throwsUsed =
    events.length;

  /*
   * Neutral 60s are excluded from the accuracy denominator
   * because they are neither a positive scoring result
   * nor a miss.
   */
  const accuracyAttempts =
    scoringThrows +
    misses;

  const accuracy =
    accuracyAttempts > 0
      ? Math.round(
          (
            scoringThrows /
            accuracyAttempts
          ) * 100
        )
      : 0;

  const avgPointsPerThrow =
    throwsUsed > 0
      ? +(
          totalPoints /
          throwsUsed
        ).toFixed(2)
      : 0;

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
    neutral60,
  };
}

const T20_SEGMENTS =
  tokensToSegments([
    "20",
    "D20",
    "T20",
  ]);

/* ---------- COMPONENT ---------- */

export default function T20Scoring({
  onFinish,
  disabled,
  tier,
  level,
  onDartsUsed,
  externalUndo,
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

  const throwsUsed =
    stats.throwsUsed;

  const throwsLeft =
    rankConfig.maxThrows -
    throwsUsed;

  const progressPct =
    rankConfig.targetPoints >
    0
      ? Math.min(
          100,
          Math.round(
            (
              stats.totalPoints /
              rankConfig.targetPoints
            ) * 100
          )
        )
      : 0;

  /* ---------- FINISH LOGIC ---------- */

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

      win,

      points:
        finalStats.totalPoints,

      target_points:
        rankConfig.targetPoints,

      throws_used:
        finalStats.throwsUsed,

      max_throws:
        rankConfig.maxThrows,

      accuracy:
        finalStats.accuracy,

      best_streak:
        finalStats.bestStreak,

      avg_points_per_throw:
        finalStats.avgPointsPerThrow,

      scoring_throws:
        finalStats.scoringThrows,

      hit_counts: {
        gt60:
          finalStats.gt60,

        gt80:
          finalStats.gt80,

        gt100:
          finalStats.gt100,

        gt120:
          finalStats.gt120,

        gt140:
          finalStats.gt140,

        h180:
          finalStats.h180,

        misses:
          finalStats.misses,

        neutral_60:
          finalStats.neutral60,
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

        avg_points_per_throw:
          finalStats.avgPointsPerThrow,

        best_streak:
          finalStats.bestStreak,

        scoring_throws:
          finalStats.scoringThrows,

        points:
          finalStats.totalPoints,

        neutral_60:
          finalStats.neutral60,
      },
    };

    onFinish({
      payload,
      win,
    });
  }

  function recordThrow(
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
      rankConfig.maxThrows
    ) {
      return;
    }

    /*
     * One scoring entry equals one
     * 3-dart visit.
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

    const outOfThrows =
      newStats.throwsUsed >=
      rankConfig.maxThrows;

    const goalReached =
      newStats.totalPoints >=
      rankConfig.targetPoints;

    if (
      goalReached ||
      outOfThrows
    ) {
      finishGame(
        goalReached,
        newHistory
      );
    }
  }

  /* ---------- INPUT HANDLERS ---------- */

  function handleMiss() {
    recordThrow(
      "MISS",
      0
    );
  }

  /*
   * Exact 60 is tier-dependent:
   *
   * Bronze:
   *   +1 point
   *
   * Silver / Gold:
   *   neutral
   *
   * Platinum / Diamond:
   *   miss
   */
  function handle60() {
    if (
      tier ===
      "Bronze"
    ) {
      recordThrow(
        "GT60",
        1
      );

      return;
    }

    if (
      tier ===
        "Silver" ||
      tier ===
        "Gold"
    ) {
      recordThrow(
        "BASE60",
        0
      );

      return;
    }

    recordThrow(
      "MISS",
      0
    );
  }

  function handleGt60() {
    recordThrow(
      "GT60",
      1
    );
  }

  function handleGt80() {
    recordThrow(
      "GT80",
      2
    );
  }

  function handleGt100() {
    recordThrow(
      "GT100",
      3
    );
  }

  function handleGt120() {
    recordThrow(
      "GT120",
      5
    );
  }

  function handleGt140() {
    recordThrow(
      "GT140",
      7
    );
  }

  function handle180() {
    recordThrow(
      "H180",
      10
    );
  }

  /* ---------- UNDO ---------- */

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
                const remove =
                  Math.min(
                    externalUndo.steps,
                    current.length
                  );

                return current.slice(
                  0,
                  current.length -
                    remove
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
      rankConfig.maxThrows;

  const canUndo =
    !disabled &&
    !finished &&
    throwHistory.length >
      0;

  const sixtyLabel =
    tier === "Bronze"
      ? "60 (1 pt)"
      : tier ===
          "Silver" ||
        tier ===
          "Gold"
      ? "60 (neutral)"
      : "60 (miss)";

  /* ---------- RENDER ---------- */

  return (
    <div className="bullout">
      {/* Header */}
      <div className="bullout-header game-objective-sticky">
        <div>
          <div className="muted">
            T20 Scoring · 100 throws
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

      <DartboardHighlight
        segments={
          T20_SEGMENTS
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
          Any stray dart counts, other section can be used if blocked.
        </div>

        {/* Main row */}
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
                    handle60
                  }
                >
                  {
                    sixtyLabel
                  }
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
                  data-hotkey="2"
                  onClick={
                    handleGt60
                  }
                >
                  &gt; 60 (1 pt)
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
                  data-hotkey="3"
                  onClick={
                    handleGt80
                  }
                >
                  &gt; 80 (2 pts)
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
                  data-hotkey="4"
                  onClick={
                    handleGt100
                  }
                >
                  &gt; 100 (3 pts)
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
                  data-hotkey="5"
                  onClick={
                    handleGt120
                  }
                >
                  &gt; 120 (5 pts)
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
                  data-hotkey="6"
                  onClick={
                    handleGt140
                  }
                >
                  &gt; 140 (7 pts)
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
                  data-hotkey="7"
                  onClick={
                    handle180
                  }
                >
                  180 (10 pts)
                </button>

                <button
                  className="btn secondary"
                  style={{
                    flex: 1,
                    minWidth: 140,
                  }}
                  disabled={
                    !canPress
                  }
                  data-hotkey="8"
                  onClick={
                    handleMiss
                  }
                >
                  &lt; 60
                </button>

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
                  Throws left
                </div>

                <div className="title-lg">
                  {
                    throwsLeft
                  }
                </div>
              </div>

              <div>
                <div className="small muted">
                  Avg pts / throw
                </div>

                <div className="title-lg">
                  {
                    stats.avgPointsPerThrow
                  }
                </div>
              </div>
            </div>

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
                    Scoring throws
                  </div>

                  <div className="pill-value">
                    {
                      stats.scoringThrows
                    }
                  </div>
                </div>

                <div className="pill pill-stat">
                  <div className="pill-label">
                    &gt; 60
                  </div>

                  <div className="pill-value">
                    {
                      stats.gt60
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
                    &gt; 100
                  </div>

                  <div className="pill-value">
                    {
                      stats.gt100
                    }
                  </div>
                </div>

                <div className="pill pill-stat">
                  <div className="pill-label">
                    &gt; 140
                  </div>

                  <div className="pill-value">
                    {
                      stats.gt140
                    }
                  </div>
                </div>

                <div className="pill pill-stat">
                  <div className="pill-label">
                    180
                  </div>

                  <div className="pill-value">
                    {
                      stats.h180
                    }
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
              }}
            >
              <div className="small muted">
                Objective progress
              </div>

              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  overflow:
                    "hidden",
                  background:
                    "rgba(127,127,127,0.2)",
                  marginTop: 6,
                }}
              >
                <div
                  style={{
                    height:
                      "100%",
                    width:
                      `${progressPct}%`,
                    background:
                      "currentColor",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}