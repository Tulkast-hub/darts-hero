// src/drills/ScoringLadder.tsx

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import type {
  Tier,
} from "../xp/types";


type FinishResult = {
  payload: any;
  win: boolean;
};


type Props = {
  onFinish: (
    result: FinishResult
  ) => void;

  disabled?: boolean;

  tier: Tier;

  level: number;

  onDartsUsed?: (
    count: number
  ) => void;

  externalUndo?: {
    token: number;
    steps: number;
  };
};


type LadderBand =
  | "DOWN"
  | "STAY"
  | "UP_1"
  | "UP_2"
  | "UP_3";


type LadderEvent = {
  band: LadderBand;
  delta: number;
};


type RankConfig = {
  low: number;
  mid: number;
  high: number;
  up3At: number;
  goalSteps: number;
};


type LadderStats = {
  throwsUsed: number;

  currentStep: number;

  bestStep: number;

  down: number;

  stay: number;

  up1: number;

  up2: number;

  up3: number;
};


/*
 * Original game used
 * 40 throws / visits.
 */
const MAX_THROWS = 40;


/* --------------------------------------------------
   RANK CONFIG
-------------------------------------------------- */

function getRankConfig(
  tier: Tier,
  level: number
): RankConfig {
  const highLevel =
    level >= 4;


  if (
    tier === "Bronze"
  ) {
    return {
      low: 45,

      mid: 60,

      high: 80,

      up3At: 100,

      goalSteps:
        highLevel
          ? 5
          : 3,
    };
  }


  if (
    tier === "Silver"
  ) {
    return {
      low: 60,

      mid: 80,

      high: 100,

      up3At: 120,

      goalSteps:
        highLevel
          ? 11
          : 9,
    };
  }


  if (
    tier === "Gold"
  ) {
    if (
      highLevel
    ) {
      return {
        low: 80,

        mid: 100,

        high: 120,

        up3At: 140,

        goalSteps: 5,
      };
    }


    return {
      low: 60,

      mid: 80,

      high: 100,

      up3At: 140,

      goalSteps: 13,
    };
  }


  if (
    tier ===
    "Platinum"
  ) {
    return {
      low: 80,

      mid: 100,

      high: 120,

      up3At: 140,

      goalSteps:
        highLevel
          ? 11
          : 9,
    };
  }


  /*
   * Diamond 4–5
   */
  if (
    highLevel
  ) {
    return {
      low: 100,

      mid: 120,

      high: 140,

      up3At: 180,

      goalSteps: 9,
    };
  }


  /*
   * Diamond 1–3
   */
  return {
    low: 80,

    mid: 100,

    high: 120,

    up3At: 180,

    goalSteps: 15,
  };
}


/* --------------------------------------------------
   MOVEMENT
-------------------------------------------------- */

function getDelta(
  band: LadderBand
): number {
  switch (
    band
  ) {
    case "DOWN":
      return -1;

    case "STAY":
      return 0;

    case "UP_1":
      return 1;

    case "UP_2":
      return 2;

    case "UP_3":
      return 3;

    default:
      return 0;
  }
}


/* --------------------------------------------------
   STATS
-------------------------------------------------- */

function computeStats(
  events: LadderEvent[]
): LadderStats {
  let currentStep = 0;

  let bestStep = 0;

  let down = 0;

  let stay = 0;

  let up1 = 0;

  let up2 = 0;

  let up3 = 0;


  events.forEach(
    (
      event
    ) => {
      currentStep =
        Math.max(
          0,

          currentStep +
            event.delta
        );


      bestStep =
        Math.max(
          bestStep,

          currentStep
        );


      switch (
        event.band
      ) {
        case "DOWN":
          down += 1;
          break;

        case "STAY":
          stay += 1;
          break;

        case "UP_1":
          up1 += 1;
          break;

        case "UP_2":
          up2 += 1;
          break;

        case "UP_3":
          up3 += 1;
          break;
      }
    }
  );


  return {
    throwsUsed:
      events.length,

    currentStep,

    bestStep,

    down,

    stay,

    up1,

    up2,

    up3,
  };
}


/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

export default function ScoringLadder({
  onFinish,
  disabled,
  tier,
  level,
  onDartsUsed,
  externalUndo,
}: Props) {
  const [
    history,
    setHistory,
  ] =
    useState<
      LadderEvent[]
    >([]);


  const [
    finished,
    setFinished,
  ] =
    useState(
      false
    );


  /*
   * Shell owns this slot.
   *
   * On mobile we render the
   * objective immediately above
   * the shared XP footer.
   */
  const [
    mobileObjectiveRoot,
    setMobileObjectiveRoot,
  ] =
    useState<
      HTMLElement | null
    >(
      null
    );


  useEffect(
    () => {
      setMobileObjectiveRoot(
        document.getElementById(
          "mobile-objective-slot"
        )
      );
    },
    []
  );


  const rankConfig =
    useMemo(
      () =>
        getRankConfig(
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
          history
        ),
      [
        history,
      ]
    );


  const throwsLeft =
    MAX_THROWS -
    stats.throwsUsed;


  /*
   * This matches the old
   * Scoring Ladder stats.
   *
   * A non-negative visit:
   * stay / +1 / +2 / +3.
   */
  const nonNegativeMoves =
    stats.stay +
    stats.up1 +
    stats.up2 +
    stats.up3;


  const movesUp =
    stats.up1 +
    stats.up2 +
    stats.up3;


  const accuracy =
    stats.throwsUsed >
    0
      ? Math.round(
          (
            nonNegativeMoves /
            stats.throwsUsed
          ) *
            100
        )
      : 0;


  /* --------------------------------------------------
     FINISH
  -------------------------------------------------- */

  function finishGame(
    win: boolean,
    finalHistory:
      LadderEvent[]
  ) {
    if (
      finished
    ) {
      return;
    }


    setFinished(
      true
    );


    const finalStats =
      computeStats(
        finalHistory
      );


    const finalNonNegativeMoves =
      finalStats.stay +
      finalStats.up1 +
      finalStats.up2 +
      finalStats.up3;


    const finalMovesUp =
      finalStats.up1 +
      finalStats.up2 +
      finalStats.up3;


    const finalAccuracy =
      finalStats.throwsUsed >
      0
        ? Math.round(
            (
              finalNonNegativeMoves /
              finalStats.throwsUsed
            ) *
              100
          )
        : 0;


    const progress =
      Math.min(
        1,

        finalStats.currentStep /
          rankConfig.goalSteps
      );


    const payload = {
      game_key:
        "scoring_ladder",

      tier,

      level,

      win,


      current_step:
        finalStats.currentStep,


      best_step:
        finalStats.bestStep,


      goal_steps:
        rankConfig.goalSteps,


      throws_used:
        finalStats.throwsUsed,


      max_throws:
        MAX_THROWS,


      progress,


      accuracy:
        finalAccuracy,


      thresholds: {
        down_below:
          rankConfig.low,

        stay_from:
          rankConfig.low,

        up_1_from:
          rankConfig.mid,

        up_2_from:
          rankConfig.high,

        up_3_from:
          rankConfig.up3At,
      },


      moves: {
        down:
          finalStats.down,

        stay:
          finalStats.stay,

        up1:
          finalStats.up1,

        up2:
          finalStats.up2,

        up3:
          finalStats.up3,
      },


      objective: {
        label:
          `${rankConfig.goalSteps} steps`,

        target:
          rankConfig.goalSteps,

        progress:
          Math.min(
            finalStats.currentStep,
            rankConfig.goalSteps
          ),
      },


      stats: {
        accuracy:
          finalAccuracy,

        current_step:
          finalStats.currentStep,

        best_step:
          finalStats.bestStep,

        throws_used:
          finalStats.throwsUsed,

        non_negative_moves:
          finalNonNegativeMoves,

        moves_up:
          finalMovesUp,

        moves_up3:
          finalStats.up3,
      },
    };


    onFinish({
      payload,

      win,
    });
  }


  /* --------------------------------------------------
     RECORD THROW
  -------------------------------------------------- */

  function recordBand(
    band: LadderBand
  ) {
    if (
      disabled ||
      finished ||
      history.length >=
        MAX_THROWS
    ) {
      return;
    }


    /*
     * One action represents
     * one 3-dart visit.
     */
    onDartsUsed?.(
      3
    );


    const newHistory = [
      ...history,

      {
        band,

        delta:
          getDelta(
            band
          ),
      },
    ];


    const newStats =
      computeStats(
        newHistory
      );


    setHistory(
      newHistory
    );


    const goalReached =
      newStats.currentStep >=
      rankConfig.goalSteps;


    const outOfThrows =
      newStats.throwsUsed >=
      MAX_THROWS;


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


  /* --------------------------------------------------
     UNDO
  -------------------------------------------------- */

  function handleUndo() {
    if (
      disabled ||
      finished ||
      history.length ===
        0
    ) {
      return;
    }


    setHistory(
      (
        current
      ) =>
        current.slice(
          0,

          -1
        )
    );
  }


  useEffect(
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
            setHistory(
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
    history.length <
      MAX_THROWS;


  const canUndo =
    !disabled &&
    !finished &&
    history.length >
      0;


  /* --------------------------------------------------
     BUTTON LABELS
  -------------------------------------------------- */

  const downLabel =
    `< ${rankConfig.low}`;


  const stayLabel =
    `${rankConfig.low} – ${
      rankConfig.mid -
      1
    }`;


  const up1Label =
    `${rankConfig.mid} – ${
      rankConfig.high -
      1
    }`;


  const up2Label =
    `${rankConfig.high} – ${
      rankConfig.up3At -
      1
    }`;


  const up3Label =
    `≥ ${rankConfig.up3At}`;


  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="bullout">
      {/* Header */}
      <div className="bullout-header">
        <div>
          <div className="muted">
            Scoring ladder ·{" "}
            {MAX_THROWS} throws
          </div>
        </div>


        {/* Desktop objective */}
        <div className="objective-pill objective-pill--desktop">
          <div className="objective-label">
            OBJECTIVE
          </div>

          <div className="objective-value">
            {
              rankConfig.goalSteps
            }{" "}
            steps
          </div>
        </div>
      </div>


      {/* Mobile objective */}
      {mobileObjectiveRoot &&
        createPortal(
          <div className="objective-pill objective-pill--mobile">
            <div className="objective-label">
              OBJECTIVE
            </div>

            <div className="objective-value">
              {
                rankConfig.goalSteps
              }{" "}
              steps
            </div>
          </div>,

          mobileObjectiveRoot
        )}


      {/* Main */}
      <div className="bullout-main">
        {/* Ladder */}
        <div
          className="card"
          style={{
            flex:
              1,

            display:
              "flex",

            flexDirection:
              "column",

            justifyContent:
              "center",
          }}
        >
          <div
            className="ladder-viz hidden-sm"
            style={{
              width:
                "100%",

              maxWidth:
                120,

              margin:
                "0 auto",

              height:
                260,

              display:
                "flex",

              flexDirection:
                "column-reverse",

              gap:
                4,
            }}
          >
            {Array.from({
              length:
                rankConfig.goalSteps,
            }).map(
              (
                _,
                index
              ) => {
                const reached =
                  index <
                  stats.currentStep;


                return (
                  <div
                    key={
                      index
                    }
                    style={{
                      flex:
                        1,

                      border:
                        "1px solid var(--text)",

                      borderRadius:
                        4,

                      backgroundColor:
                        reached
                          ? "var(--accent-green)"
                          : "transparent",

                      transition:
                        "background-color 0.15s",
                    }}
                  />
                );
              }
            )}
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

            justifyContent:
              "space-between",
          }}
        >
          {/* Top stats */}
          <div
            className="row"
            style={{
              justifyContent:
                "space-between",
            }}
          >
            <div>
              <div className="small muted">
                Current step
              </div>

              <div className="title-lg">
                {
                  stats.currentStep
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
                Best step
              </div>

              <div className="title-lg">
                {
                  stats.bestStep
                }
              </div>
            </div>
          </div>


          {/* Secondary stats */}
          <div
            style={{
              marginTop:
                12,
            }}
          >
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">
                  Accuracy
                </div>

                <div className="pill-value">
                  {
                    accuracy
                  }
                  %
                </div>
              </div>


              <div className="pill pill-stat">
                <div className="pill-label">
                  Moves up
                </div>

                <div className="pill-value">
                  {
                    movesUp
                  }
                </div>
              </div>


              <div className="pill pill-stat">
                <div className="pill-label">
                  Moves down
                </div>

                <div className="pill-value">
                  {
                    stats.down
                  }
                </div>
              </div>
            </div>


            <div
              className="row bullout-stat-row"
              style={{
                marginTop:
                  8,
              }}
            >
              <div className="pill pill-stat">
                <div className="pill-label">
                  +1 steps
                </div>

                <div className="pill-value">
                  {
                    stats.up1
                  }
                </div>
              </div>


              <div className="pill pill-stat">
                <div className="pill-label">
                  +2 steps
                </div>

                <div className="pill-value">
                  {
                    stats.up2
                  }
                </div>
              </div>


              <div className="pill pill-stat">
                <div className="pill-label">
                  +3 steps
                </div>

                <div className="pill-value">
                  {
                    stats.up3
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Controls */}
      <div
        className="t20scoring-controls"
        data-hotkeys="drill"
        style={{
          marginTop:
            16,
        }}
      >
        <div
          className="row"
          style={{
            gap:
              8,

            flexWrap:
              "wrap",
          }}
        >
          <button
            type="button"
            className="btn outline"
            disabled={
              !canPress
            }
            data-hotkey="1"
            style={{
              flex:
                1,

              minWidth:
                150,
            }}
            onClick={() =>
              recordBand(
                "DOWN"
              )
            }
          >
            {
              downLabel
            }{" "}
            (-1 step)
          </button>


          <button
            type="button"
            className="btn outline"
            disabled={
              !canPress
            }
            data-hotkey="2"
            style={{
              flex:
                1,

              minWidth:
                150,
            }}
            onClick={() =>
              recordBand(
                "STAY"
              )
            }
          >
            {
              stayLabel
            }{" "}
            (0 steps)
          </button>


          <button
            type="button"
            className="btn outline"
            disabled={
              !canPress
            }
            data-hotkey="3"
            style={{
              flex:
                1,

              minWidth:
                150,
            }}
            onClick={() =>
              recordBand(
                "UP_1"
              )
            }
          >
            {
              up1Label
            }{" "}
            (+1 step)
          </button>


          <button
            type="button"
            className="btn outline"
            disabled={
              !canPress
            }
            data-hotkey="4"
            style={{
              flex:
                1,

              minWidth:
                150,
            }}
            onClick={() =>
              recordBand(
                "UP_2"
              )
            }
          >
            {
              up2Label
            }{" "}
            (+2 steps)
          </button>


          <button
            type="button"
            className="btn outline"
            disabled={
              !canPress
            }
            data-hotkey="5"
            style={{
              flex:
                1,

              minWidth:
                150,
            }}
            onClick={() =>
              recordBand(
                "UP_3"
              )
            }
          >
            {
              up3Label
            }{" "}
            (+3 steps)
          </button>


          <button
            type="button"
            className="btn"
            disabled={
              !canUndo
            }
            data-hotkey="0"
            style={{
              flex:
                1,

              minWidth:
                150,
            }}
            onClick={
              handleUndo
            }
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}