// src/drills/ScoringLadder.tsx

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createPortal } from "react-dom";

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

const MAX_THROWS = 30;


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
   HELPERS
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
    (event) => {
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
    useState(false);

  /*
   * Shell owns this element.
   *
   * The mobile objective is
   * portalled into it.
   */
  const [
    mobileObjectiveRoot,
    setMobileObjectiveRoot,
  ] =
    useState<
      HTMLElement | null
    >(null);


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


  const progressPct =
    Math.min(
      100,

      Math.round(
        (
          stats.currentStep /
          rankConfig.goalSteps
        ) *
          100
      )
    );


  /*
   * Ladder is rendered from
   * goal at the top to 0 at
   * the bottom.
   */
  const ladderSteps =
    useMemo(
      () =>
        Array.from(
          {
            length:
              rankConfig.goalSteps +
              1,
          },

          (
            _,
            index
          ) =>
            rankConfig.goalSteps -
            index
        ),
      [
        rankConfig.goalSteps,
      ]
    );


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

      band_counts: {
        down:
          finalStats.down,

        stay:
          finalStats.stay,

        up_1:
          finalStats.up1,

        up_2:
          finalStats.up2,

        up_3:
          finalStats.up3,
      },

      objective: {
        label:
          "Reach ladder step",

        target:
          rankConfig.goalSteps,

        progress:
          Math.min(
            finalStats.currentStep,
            rankConfig.goalSteps
          ),
      },

      stats: {
        current_step:
          finalStats.currentStep,

        best_step:
          finalStats.bestStep,

        goal_steps:
          rankConfig.goalSteps,

        throws_used:
          finalStats.throwsUsed,

        down:
          finalStats.down,

        stay:
          finalStats.stay,

        up_1:
          finalStats.up1,

        up_2:
          finalStats.up2,

        up_3:
          finalStats.up3,
      },
    };

    onFinish({
      payload,
      win,
    });
  }


  /* --------------------------------------------------
     ACTIONS
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
     * One scoring selection
     * represents a 3-dart visit.
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
     LABELS
  -------------------------------------------------- */

  const downLabel =
    `< ${rankConfig.low}`;

  const stayLabel =
    `${rankConfig.low}–${
      rankConfig.mid -
      1
    }`;

  const up1Label =
    `${rankConfig.mid}–${
      rankConfig.high -
      1
    }`;

  const up2Label =
    `${rankConfig.high}–${
      rankConfig.up3At -
      1
    }`;

  const up3Label =
    `≥ ${rankConfig.up3At}`;


  /* --------------------------------------------------
     OBJECTIVE
  -------------------------------------------------- */

  const objectiveContent = (
    <>
      <div className="objective-label">
        OBJECTIVE
      </div>

      <div className="objective-value">
        Step{" "}
        {
          rankConfig.goalSteps
        }
      </div>
    </>
  );


  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="bullout">
      {/* --------------------------------------------
          DESKTOP HEADER
      --------------------------------------------- */}

      <div className="bullout-header game-objective-sticky">
        <div>
          <div className="muted">
            Scoring Ladder ·{" "}
            {MAX_THROWS} visits
          </div>

          <div
            className="small muted"
            style={{
              marginTop:
                3,
            }}
          >
            Score a 3-dart
            visit, then move up
            or down the ladder.
          </div>
        </div>

        <div className="objective-pill objective-pill--desktop">
          {
            objectiveContent
          }
        </div>
      </div>


      {/* --------------------------------------------
          MOBILE OBJECTIVE

          Shell places this immediately
          above the shared XP footer.
      --------------------------------------------- */}

      {mobileObjectiveRoot &&
        createPortal(
          <div className="objective-pill objective-pill--mobile">
            {
              objectiveContent
            }
          </div>,

          mobileObjectiveRoot
        )}


      {/* --------------------------------------------
          LADDER GRAPHIC
      --------------------------------------------- */}

      <div className="scoring-ladder-visual card">
        <div className="scoring-ladder-graphic">
          <div className="scoring-ladder-rail scoring-ladder-rail--left" />

          <div className="scoring-ladder-rail scoring-ladder-rail--right" />

          {ladderSteps.map(
            (
              step
            ) => {
              const isCurrent =
                step ===
                stats.currentStep;

              const isReached =
                step <
                stats.currentStep;

              const isGoal =
                step ===
                rankConfig.goalSteps;

              return (
                <div
                  key={
                    step
                  }
                  className={[
                    "scoring-ladder-rung",

                    isReached
                      ? "is-reached"
                      : "",

                    isCurrent
                      ? "is-current"
                      : "",

                    isGoal
                      ? "is-goal"
                      : "",
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )}
                >
                  <span className="scoring-ladder-rung__number">
                    {
                      step
                    }
                  </span>

                  <span className="scoring-ladder-rung__bar" />

                  <span className="scoring-ladder-rung__status">
                    {isCurrent
                      ? "YOU"
                      : isGoal
                      ? "GOAL"
                      : ""}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>


      {/* --------------------------------------------
          GAME CONTROLS + STATS
      --------------------------------------------- */}

      <div
        className="bullout-main"
        style={{
          marginTop:
            14,
        }}
      >
        {/* Controls */}

        <div
          className="bull-board-wrapper card"
          style={{
            flex: 1,
          }}
        >
          <div
            data-hotkeys="drill"
            style={{
              display:
                "grid",

              gap:
                10,
            }}
          >
            <button
              type="button"
              className="btn secondary"
              disabled={
                !canPress
              }
              data-hotkey="1"
              onClick={() =>
                recordBand(
                  "DOWN"
                )
              }
            >
              {
                downLabel
              }{" "}
              · −1 step
            </button>


            <button
              type="button"
              className="btn outline"
              disabled={
                !canPress
              }
              data-hotkey="2"
              onClick={() =>
                recordBand(
                  "STAY"
                )
              }
            >
              {
                stayLabel
              }{" "}
              · stay
            </button>


            <button
              type="button"
              className="btn outline"
              disabled={
                !canPress
              }
              data-hotkey="3"
              onClick={() =>
                recordBand(
                  "UP_1"
                )
              }
            >
              {
                up1Label
              }{" "}
              · +1 step
            </button>


            <button
              type="button"
              className="btn outline"
              disabled={
                !canPress
              }
              data-hotkey="4"
              onClick={() =>
                recordBand(
                  "UP_2"
                )
              }
            >
              {
                up2Label
              }{" "}
              · +2 steps
            </button>


            <button
              type="button"
              className="btn outline"
              disabled={
                !canPress
              }
              data-hotkey="5"
              onClick={() =>
                recordBand(
                  "UP_3"
                )
              }
            >
              {
                up3Label
              }{" "}
              · +3 steps
            </button>


            <button
              type="button"
              className="btn"
              disabled={
                !canUndo
              }
              data-hotkey="0"
              onClick={
                handleUndo
              }
            >
              Undo
            </button>
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
                Goal
              </div>

              <div className="title-lg">
                {
                  rankConfig.goalSteps
                }
              </div>
            </div>


            <div>
              <div className="small muted">
                Visits left
              </div>

              <div className="title-lg">
                {
                  throwsLeft
                }
              </div>
            </div>
          </div>


          <div
            className="row bullout-stat-row"
            style={{
              marginTop:
                12,
            }}
          >
            <div className="pill pill-stat">
              <div className="pill-label">
                Best step
              </div>

              <div className="pill-value">
                {
                  stats.bestStep
                }
              </div>
            </div>


            <div className="pill pill-stat">
              <div className="pill-label">
                +2 / +3
              </div>

              <div className="pill-value">
                {
                  stats.up2 +
                  stats.up3
                }
              </div>
            </div>


            <div className="pill pill-stat">
              <div className="pill-label">
                Drops
              </div>

              <div className="pill-value">
                {
                  stats.down
                }
              </div>
            </div>
          </div>


          <div
            style={{
              marginTop:
                14,
            }}
          >
            <div className="small muted">
              Objective progress
            </div>

            <div
              style={{
                height:
                  6,

                borderRadius:
                  999,

                overflow:
                  "hidden",

                background:
                  "rgba(127,127,127,0.2)",

                marginTop:
                  6,
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
  );
}