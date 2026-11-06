// src/pages/assessment-games/AssessmentDoubles.tsx

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useI18n,
} from "../../i18n/I18nProvider";

import {
  useAssessmentStore,
} from "../../skills-assessment/useAssessmentStore";

import {
  useGameExitStore,
} from "../../session/useGameExitStore";


type HistoryEntry = {
  target: number;

  hit: boolean;

  darts: number;
};


export default function AssessmentDoubles() {
  const {
    t,
    isDesktop,
  } =
    useI18n();


  const nav =
    useNavigate();


  const [
    target,
    setTarget,
  ] =
    useState(
      1
    );


  const [
    dartsThrown,
    setDartsThrown,
  ] =
    useState(
      0
    );


  const [
    history,
    setHistory,
  ] =
    useState<
      HistoryEntry[]
    >(
      []
    );


  const complete =
    target >
    20;


  /* --------------------------------------------------
     ASSESSMENT STORE
  -------------------------------------------------- */

  const setDoublesResult =
    useAssessmentStore(
      (state) =>
        state.setDoublesResult
    );

  const setCurrentStep =
    useAssessmentStore(
      (state) =>
        state.setCurrentStep
    );

  const resetAssessment =
    useAssessmentStore(
      (state) =>
        state.resetAssessment
    );


  /* --------------------------------------------------
     GAME EXIT STORE
  -------------------------------------------------- */

  const setGameExit =
    useGameExitStore(
      (state) =>
        state.setGameExit
    );


  const clearGameExit =
    useGameExitStore(
      (state) =>
        state.clearGameExit
    );


  /*
   * This page is an active assessment
   * game from the moment it mounts.
   *
   * Leaving through:
   * - logo
   * - Back
   * - Profile
   *
   * will trigger the shared navbar
   * confirmation modal.
   *
   * There is no XP penalty for
   * assessment games.
   */
  useEffect(
    () => {
      setGameExit({
        active:
          true,

        xpPenalty:
          false,

        handler:
          () => {
            resetAssessment();
          },
      });


      return () => {
        clearGameExit();
      };
    },
    [
      setGameExit,
      clearGameExit,
      resetAssessment,
    ]
  );


  /* --------------------------------------------------
     DERIVED STATS
  -------------------------------------------------- */

  const doublesHit =
    useMemo(
      () =>
        history.filter(
          (
            entry
          ) =>
            entry.hit
        ).length,
      [
        history,
      ]
    );


  const percentage =
    useMemo(
      () => {
        if (
          !dartsThrown
        ) {
          return 0;
        }


        return (
          Math.round(
            (
              doublesHit /
              dartsThrown
            ) *
              1000
          ) /
          10
        );
      },
      [
        doublesHit,
        dartsThrown,
      ]
    );


  /* --------------------------------------------------
     GAME ACTIONS
  -------------------------------------------------- */

  function recordHit() {
    if (
      complete
    ) {
      return;
    }


    setHistory(
      (
        current
      ) => [
        ...current,

        {
          target,

          hit:
            true,

          darts:
            1,
        },
      ]
    );


    setDartsThrown(
      (
        current
      ) =>
        current +
        1
    );


    setTarget(
      (
        current
      ) =>
        current +
        1
    );
  }


  function recordMisses(
    count: number
  ) {
    if (
      complete
    ) {
      return;
    }


    setHistory(
      (
        current
      ) => [
        ...current,

        {
          target,

          hit:
            false,

          darts:
            count,
        },
      ]
    );


    setDartsThrown(
      (
        current
      ) =>
        current +
        count
    );
  }


  function undo() {
    if (
      !history.length
    ) {
      return;
    }


    const last =
      history[
        history.length -
        1
      ];


    setHistory(
      (
        current
      ) =>
        current.slice(
          0,
          -1
        )
    );


    setDartsThrown(
      (
        current
      ) =>
        Math.max(
          0,

          current -
          last.darts
        )
    );


    if (
      last.hit
    ) {
      setTarget(
        last.target
      );
    }
  }


  /* --------------------------------------------------
     CONTINUE ASSESSMENT
  -------------------------------------------------- */

  function continueAssessment() {

    setDoublesResult({
      dartsThrown,
      doublesHit,
      percentage,
    });
  
    setCurrentStep(
      "101"
    );
  
    clearGameExit();
  
    nav(
      "/skills-assessment/101"
    );
  }


  /* --------------------------------------------------
     KEYBOARD SHORTCUTS
  -------------------------------------------------- */

  useEffect(
    () => {
      if (
        !isDesktop
      ) {
        return;
      }


      function handleKeyboard(
        event:
          KeyboardEvent
      ) {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        ) {
          return;
        }


        if (
          event.key ===
          "0"
        ) {
          if (
            history.length
          ) {
            event.preventDefault();

            undo();
          }


          return;
        }


        if (
          complete
        ) {
          if (
            event.key ===
            "Enter"
          ) {
            event.preventDefault();

            continueAssessment();
          }


          return;
        }


        if (
          event.key ===
          "1"
        ) {
          event.preventDefault();

          recordHit();

          return;
        }


        if (
          event.key ===
          "2"
        ) {
          event.preventDefault();

          recordMisses(
            1
          );

          return;
        }


        if (
          event.key ===
          "3"
        ) {
          event.preventDefault();

          recordMisses(
            2
          );

          return;
        }


        if (
          event.key ===
          "4"
        ) {
          event.preventDefault();

          recordMisses(
            3
          );
        }
      }


      window.addEventListener(
        "keydown",
        handleKeyboard
      );


      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyboard
        );
      };
    },
    [
      isDesktop,
      complete,
      history,
      target,
      dartsThrown,
      doublesHit,
      percentage,
    ]
  );


  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="page">
      {/* Header */}
      <section className="hero card">
        <div>
          <div className="title">
            {t(
              "Skills Assessment"
            )}
            {" · "}
            {t(
              "Doubles"
            )}
          </div>


          <div className="subtitle">
            <h2>
              {t(
                "Around the World – Doubles"
              )}
            </h2>


            <p>
              {t(
                "Hit each double from 1 to 20. Every dart counts toward your doubles accuracy."
              )}
            </p>
          </div>
        </div>
      </section>


      {!complete ? (
        /* ------------------------------------------------
           ACTIVE GAME
        ------------------------------------------------- */

        <div className="game-surface assessment-surface">
          <div className="bullout-header">
            <div>
              <div className="muted">
                {t(
                  "Double"
                )}{" "}
                {target}
                {" · "}
                {t(
                  "Target"
                )}{" "}
                {target}
                {" "}
                {t(
                  "of"
                )}{" "}
                20
              </div>


              <div className="muted">
                {t(
                  "Hit the current double to move to the next number."
                )}
              </div>
            </div>


            <div className="objective-pill">
              <div className="objective-label">
                {t(
                  "Accuracy"
                )}
              </div>


              <div className="objective-value">
                {
                  percentage
                }
                %
              </div>
            </div>
          </div>


          <AssessmentDoublesBoard
            number={
              target
            }
          />


          <div className="bullout-main aw-main">
            {/* Controls */}
            <div
              className="bullout-controls"
              data-hotkeys="drill"
            >
              <button
                type="button"
                className="btn success"
                data-hotkey="1"
                aria-keyshortcuts="1"
                onClick={
                  recordHit
                }
              >
                {t(
                  "Double hit"
                )}


                {isDesktop && (
                  <span
                    className="muted small"
                    style={{
                      marginLeft:
                        8,
                    }}
                  >
                    (1)
                  </span>
                )}
              </button>


              <button
                type="button"
                className="btn outline"
                data-hotkey="2"
                aria-keyshortcuts="2"
                onClick={() =>
                  recordMisses(
                    1
                  )
                }
              >
                {t(
                  "Miss"
                )}


                {isDesktop && (
                  <span
                    className="muted small"
                    style={{
                      marginLeft:
                        8,
                    }}
                  >
                    (2)
                  </span>
                )}
              </button>


              <button
                type="button"
                className="btn outline"
                data-hotkey="3"
                aria-keyshortcuts="3"
                onClick={() =>
                  recordMisses(
                    2
                  )
                }
              >
                {t(
                  "Miss 2"
                )}


                {isDesktop && (
                  <span
                    className="muted small"
                    style={{
                      marginLeft:
                        8,
                    }}
                  >
                    (3)
                  </span>
                )}
              </button>


              <button
                type="button"
                className="btn outline"
                data-hotkey="4"
                aria-keyshortcuts="4"
                onClick={() =>
                  recordMisses(
                    3
                  )
                }
              >
                {t(
                  "Miss 3"
                )}


                {isDesktop && (
                  <span
                    className="muted small"
                    style={{
                      marginLeft:
                        8,
                    }}
                  >
                    (4)
                  </span>
                )}
              </button>


              <button
                type="button"
                className="btn outline"
                data-hotkey="0"
                aria-keyshortcuts="0"
                onClick={
                  undo
                }
                disabled={
                  !history.length
                }
              >
                {t(
                  "Undo"
                )}


                {isDesktop && (
                  <span
                    className="muted small"
                    style={{
                      marginLeft:
                        8,
                    }}
                  >
                    (0)
                  </span>
                )}
              </button>
            </div>


            {/* Stats */}
            <div className="bullout-stats card">
              <div
                className="row"
                style={{
                  justifyContent:
                    "space-between",
                }}
              >
                <div
                  style={{
                    textAlign:
                      "center",

                    flex:
                      1,
                  }}
                >
                  <div className="title-lg">
                    {
                      dartsThrown
                    }
                  </div>


                  <div className="muted">
                    {t(
                      "Darts thrown"
                    )}
                  </div>
                </div>


                <div
                  style={{
                    textAlign:
                      "center",

                    flex:
                      1,
                  }}
                >
                  <div className="title-lg">
                    {
                      doublesHit
                    }
                  </div>


                  <div className="muted">
                    {t(
                      "Doubles hit"
                    )}
                  </div>
                </div>


                <div
                  style={{
                    textAlign:
                      "center",

                    flex:
                      1,
                  }}
                >
                  <div className="title-lg">
                    D
                    {
                      target
                    }
                  </div>


                  <div className="muted">
                    {t(
                      "Current target"
                    )}
                  </div>
                </div>
              </div>


              <div
                style={{
                  marginTop:
                    12,
                }}
              >
                <div className="row bullout-stat-row">
                  <div className="pill pill-stat">
                    <div className="pill-label">
                      {t(
                        "Accuracy"
                      )}
                    </div>


                    <div className="pill-value">
                      {
                        percentage
                      }
                      %
                    </div>
                  </div>


                  <div className="pill pill-stat">
                    <div className="pill-label">
                      {t(
                        "Completed"
                      )}
                    </div>


                    <div className="pill-value">
                      {
                        doublesHit
                      }{" "}
                      / 20
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------
           GAME COMPLETE
        ------------------------------------------------- */

        <div className="card result-card">
          <div className="result-main">
            <h2 className="result-status">
              {t(
                "Doubles test complete"
              )}
            </h2>


            <div className="result-stats">
              <div className="row bullout-stat-row">
                <div className="pill pill-stat">
                  <div className="pill-label">
                    {t(
                      "Darts thrown"
                    )}
                  </div>


                  <div className="pill-value">
                    {
                      dartsThrown
                    }
                  </div>
                </div>


                <div className="pill pill-stat">
                  <div className="pill-label">
                    {t(
                      "Doubles hit"
                    )}
                  </div>


                  <div className="pill-value">
                    {
                      doublesHit
                    }
                  </div>
                </div>


                <div className="pill pill-stat">
                  <div className="pill-label">
                    {t(
                      "Accuracy"
                    )}
                  </div>


                  <div className="pill-value">
                    {
                      percentage
                    }
                    %
                  </div>
                </div>
              </div>
            </div>


            <button
              type="button"
              className="btn outline"
              style={{
                width:
                  "100%",

                marginTop:
                  20,
              }}
              data-hotkey="0"
              aria-keyshortcuts="0"
              onClick={
                undo
              }
              disabled={
                !history.length
              }
            >
              {t(
                "Undo"
              )}


              {isDesktop && (
                <span
                  className="muted small"
                  style={{
                    marginLeft:
                      8,
                  }}
                >
                  (0)
                </span>
              )}
            </button>


            <button
              type="button"
              className="btn"
              style={{
                width:
                  "100%",

                marginTop:
                  10,
              }}
              onClick={
                continueAssessment
              }
              aria-keyshortcuts="Enter"
            >
              {t(
                "Continue"
              )}


              {isDesktop && (
                <span
                  className="muted small"
                  style={{
                    marginLeft:
                      8,
                  }}
                >
                  (Enter)
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


/* --------------------------------------------------
   DARTBOARD
-------------------------------------------------- */

function AssessmentDoublesBoard({
  number,
}: {
  number:
    number;
}) {
  const BOARD_ORDER = [
    20,
    1,
    18,
    4,
    13,
    6,
    10,
    15,
    2,
    17,
    3,
    19,
    7,
    16,
    8,
    11,
    14,
    9,
    12,
    5,
  ];


  const index =
    BOARD_ORDER.indexOf(
      number
    );


  const segmentIndex =
    index ===
    -1
      ? 0
      : index;


  const radius =
    52;


  const circumference =
    2 *
    Math.PI *
    radius;


  const segmentLength =
    circumference /
    20;


  const segmentAngle =
    360 /
    20;


  const baseOffset =
    -90 -
    segmentAngle /
      2;


  const rotation =
    segmentIndex *
      segmentAngle +
    baseOffset;


  return (
    <div className="bull-board-wrapper assessment-board">
      <svg
        viewBox="0 0 120 120"
        className="bull-board"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r="58"
          fill="#020617"
        />


        <circle
          cx="60"
          cy="60"
          r="50"
          fill="#020617"
        />


        <circle
          cx="60"
          cy="60"
          r="40"
          fill="#020617"
        />


        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="#0f172a"
          strokeWidth="8"
        />


        <circle
          cx="60"
          cy="60"
          r="32"
          fill="none"
          stroke="#020617"
          strokeWidth="10"
        />


        <circle
          cx="60"
          cy="60"
          r={
            radius
          }
          fill="none"
          stroke="#0b1120"
          strokeWidth="8"
        />


        <g
          transform={`rotate(${rotation} 60 60)`}
        >
          <circle
            cx="60"
            cy="60"
            r={
              radius
            }
            fill="none"
            stroke="#00c46a"
            strokeWidth="8"
            strokeDasharray={`${segmentLength} ${
              circumference -
              segmentLength
            }`}
          />
        </g>


        <circle
          cx="60"
          cy="60"
          r="22"
          fill="#020617"
        />


        <text
          x="60"
          y="59"
          textAnchor="middle"
          fontSize="20"
          fill="#f9fafb"
          fontWeight="700"
        >
          D
          {
            number
          }
        </text>


        <text
          x="60"
          y="75"
          textAnchor="middle"
          fontSize="9"
          fill="#9ca3af"
        >
          Double ring
        </text>
      </svg>
    </div>
  );
}