// src/pages/DrillPage.tsx

import React, {
  useEffect,
  useState,
} from "react";

import {
  useI18n,
} from "../i18n/I18nProvider";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getDrillDef,
} from "../drills/registry";

import type {
  ScoringSection,
} from "../drills/T20Scoring";

import {
  startSession,
  endSession,
} from "../api";

import {
  getRankStateFromXp,
  XP_CAPS,
} from "../xp/rank";

import {
  useXpStore,
} from "../xp/useXpStore";

import {
  loadXpState,
  saveXpState,
} from "../xp/store";

import type {
  DrillResult,
  Tier,
  XpCategory,
} from "../xp/types";

import {
  useGameExitStore,
} from "../session/useGameExitStore";

import {
  useAuthStore,
} from "../auth/useAuthStore";


type FinishResult = {
  payload: any;
  win: boolean;
};


const CATEGORY_LABELS:
  Record<
    string,
    string
  > = {
  scoring:
    "Scoring",

  finishing:
    "Finishing",

  doubles:
    "Doubling",

  other:
    "Other",
};


/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

export default function DrillPage() {
  const {
    t,
  } =
    useI18n();


  const {
    key,
  } =
    useParams();


  const nav =
    useNavigate();


  const setXpState =
    useXpStore(
      (s) =>
        s.setState
    );


  const xpState =
    useXpStore(
      (s) =>
        s.state
    );


  const [
    sessionId,
    setSessionId,
  ] =
    useState<
      number | null
    >(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );


  const [
    showRules,
    setShowRules,
  ] =
    useState(
      true
    );


  /*
   * Still used by the drill's
   * own Abort Game button.
   *
   * Top-nav navigation now uses
   * the shared NavBar modal.
   */
  const [
    showAbortConfirm,
    setShowAbortConfirm,
  ] =
    useState(
      false
    );


  const [
    scoringSection,
    setScoringSection,
  ] =
    useState<ScoringSection>(
      20
    );


  const status =
    useAuthStore(
      (s) =>
        s.status
    );


  const setGameExit =
    useGameExitStore(
      (s) =>
        s.setGameExit
    );


  const clearGameExit =
    useGameExitStore(
      (s) =>
        s.clearGameExit
    );


  const drillKey =
    key || "";


  const drillDef =
    getDrillDef(
      drillKey
    );


  /* --------------------------------------------------
     GAME SETUP
  -------------------------------------------------- */

  useEffect(
    () => {
      const setup =
        drillDef
          ?.setup
          ?.scoringSection;


      if (
        setup
      ) {
        setScoringSection(
          setup.default
        );
      } else {
        setScoringSection(
          20
        );
      }
    },
    [
      drillKey,
      drillDef,
    ]
  );


  /* --------------------------------------------------
     SESSION START
  -------------------------------------------------- */

  useEffect(
    () => {
      if (
        !drillKey
      ) {
        return;
      }


      if (
        status !==
        "authed"
      ) {
        nav(
          "/login",
          {
            replace:
              true,
          }
        );

        return;
      }


      setSessionId(
        null
      );


      setShowRules(
        true
      );


      setLoading(
        true
      );


      startSession(
        drillKey
      )
        .then(
          (
            {
              id,
            }
          ) =>
            setSessionId(
              id
            )
        )
        .catch(
          (
            e
          ) => {
            const msg =
              String(
                e?.message ||
                ""
              );


            if (
              msg
                .toLowerCase()
                .includes(
                  "not authenticated"
                )
            ) {
              nav(
                "/login",
                {
                  replace:
                    true,
                }
              );
            }
          }
        )
        .finally(
          () =>
            setLoading(
              false
            )
        );
    },
    [
      drillKey,
      status,
      nav,
    ]
  );


  /* --------------------------------------------------
     CATEGORY XP / RANK
  -------------------------------------------------- */

  const category:
    XpCategory =
    drillDef
      ?.category ??
    "other";


  const categoryXp =
    Math.max(
      0,

      xpState
        .categoryXp
        ?.[
          category
        ] ??
      0
    );


  const categoryRank =
    getRankStateFromXp(
      categoryXp,
      XP_CAPS
        .categoryTierMax,
      "Bronze"
    );


  const currentTier:
    Tier =
    categoryRank.tier;


  const currentLevel:
    number =
    categoryRank.level;


  const categoryLabel =
    t(
      CATEGORY_LABELS[
        category
      ] ??
      category
    );


  /* --------------------------------------------------
     FINISH
  -------------------------------------------------- */

  async function handleFinish(
    resultIn:
      FinishResult
  ) {
    if (
      !sessionId ||
      !drillKey
    ) {
      return;
    }


    /*
     * Game is complete.
     *
     * Prevent navbar navigation
     * from treating the result
     * transition as an abort.
     */
    clearGameExit();


    setLoading(
      true
    );


    try {
      const xpBeforeState =
        loadXpState();


      const drillResult =
        toDrillResult(
          drillKey,
          resultIn.win,
          resultIn.payload
        );


      const res =
        await endSession(
          sessionId,
          drillKey,
          resultIn.payload,
          drillResult
        );


      const xpAfterState =
        res.xpState;


      saveXpState(
        xpAfterState as any
      );


      setXpState(
        xpAfterState as any
      );


      const cat =
        drillResult.category;


      const xpAward = {
        total:
          res.xp,

        byCategory: {
          scoring:
            0,

          finishing:
            0,

          doubles:
            0,

          other:
            0,

          [cat]:
            res.xp,
        } as any,

        breakdown: [
          {
            label:
              "Session XP",

            xp:
              res.xp,
          },
        ],

        multiplier:
          1,
      };


      /*
       * Replace the game route.
       *
       * This means browser history
       * will not naturally return
       * to the completed drill.
       */
      nav(
        `/result/${drillKey}`,
        {
          replace:
            true,

          state: {
            win:
              resultIn.win,

            xp:
              res.xp,

            xpAward,

            xpBeforeState,

            xpAfterState,

            drillResult,

            payload:
              resultIn.payload,

            drillKey,
          },
        }
      );
    } finally {
      setLoading(
        false
      );
    }


    // eslint-disable-next-line no-console
    console.log(
      "DRILL PAYLOAD",
      resultIn.payload
    );
  }


  /* --------------------------------------------------
     DRILL EXIT / ABORT
  -------------------------------------------------- */

  /*
   * This performs ONLY the
   * drill-specific cleanup.
   *
   * It deliberately does not
   * navigate anywhere.
   *
   * NavBar decides where to go
   * after this resolves.
   */
  async function leaveDrill() {
    if (
      !sessionId ||
      !drillKey
    ) {
      return;
    }


    setLoading(
      true
    );


    try {
      /*
       * Keep the actual current
       * rank in the saved aborted
       * result.
       *
       * Sending only:
       *
       * { aborted: true }
       *
       * could otherwise fall back
       * to Bronze I during result
       * normalisation.
       */
      const abortPayload = {
        aborted:
          true,

        tier:
          currentTier,

        level:
          currentLevel,
      };


      const drillResult =
        toDrillResult(
          drillKey,
          false,
          abortPayload
        );


      /*
       * Backend remains the source
       * of truth for the XP loss.
       */
      const res =
        await endSession(
          sessionId,
          drillKey,
          abortPayload,
          drillResult
        );


      const xpAfterState =
        res.xpState;


      saveXpState(
        xpAfterState as any
      );


      setXpState(
        xpAfterState as any
      );


      /*
       * Session has now been ended.
       */
      setSessionId(
        null
      );


      clearGameExit();
    } finally {
      setLoading(
        false
      );
    }
  }


  /* --------------------------------------------------
     REGISTER ACTIVE GAME
  -------------------------------------------------- */

  useEffect(
    () => {
      /*
       * Rules/setup screen is NOT
       * yet considered an active
       * game.
       *
       * Therefore leaving before
       * clicking Start Game does
       * not count as a loss.
       */
      if (
        showRules ||
        !sessionId ||
        !drillKey
      ) {
        clearGameExit();

        return;
      }


      setGameExit({
        active:
          true,

        /*
         * Training drills are the
         * only current game type
         * where abandoning may
         * reduce XP.
         */
        xpPenalty:
          true,

        handler:
          leaveDrill,
      });


      return () => {
        clearGameExit();
      };
    },
    [
      showRules,
      sessionId,
      drillKey,
      currentTier,
      currentLevel,
      setGameExit,
      clearGameExit,
    ]
  );


  /* --------------------------------------------------
     LOCAL ABORT BUTTON
  -------------------------------------------------- */

  function requestAbort() {
    setShowAbortConfirm(
      true
    );
  }


  async function handleAbortConfirm() {
    setShowAbortConfirm(
      false
    );


    await leaveDrill();


    /*
     * Explicit Abort Game button
     * returns home.
     */
    nav(
      "/",
      {
        replace:
          true,
      }
    );
  }


  /* --------------------------------------------------
     RESULT NORMALISATION
  -------------------------------------------------- */

  function toTier(
    v: any
  ): Tier {
    if (
      v === "Bronze" ||
      v === "Silver" ||
      v === "Gold" ||
      v === "Platinum" ||
      v === "Diamond"
    ) {
      return v;
    }


    return "Bronze";
  }


  function getCategoryPath(
    category:
      XpCategory
  ) {
    switch (
      category
    ) {
      case "scoring":
        return "/category/scoring";

      case "doubles":
        return "/category/doubling";

      case "finishing":
        return "/category/finishing";

      default:
        return "/";
    }
  }


  function toDrillResult(
    k: string,
    win: boolean,
    payload: any
  ): DrillResult {
    const tier =
      toTier(
        payload?.tier
      );


    const level =
      typeof payload?.level ===
      "number"
        ? payload.level
        : 1;


    const throws_used =
      payload?.throws_used ??
      payload?.throwsUsed ??
      payload?.throws ??
      payload?.darts_used ??
      undefined;


    const max_throws =
      payload?.max_throws ??
      payload?.maxThrows ??
      payload?.max_throws_total ??
      payload?.maxThrowsTotal ??
      undefined;


    let progress:
      | number
      | undefined =
      typeof payload?.progress ===
      "number"
        ? payload.progress
        : undefined;


    let objective:
      | {
          label:
            string;

          current?:
            number;

          target?:
            number;

          unit?:
            string;
        }
      | undefined;


    /* ----------------------------------------------
       DERIVE PROGRESS
    ----------------------------------------------- */

    if (
      progress ==
      null
    ) {
      if (
        k ===
        "checkouts_popular_leaves"
      ) {
        const cur =
          payload
            ?.total_checkouts ??
          payload
            ?.totalCheckouts;


        const req =
          payload
            ?.required_checkouts ??
          payload
            ?.requiredCheckouts;


        if (
          typeof cur ===
            "number" &&
          typeof req ===
            "number" &&
          req >
            0
        ) {
          progress =
            cur /
            req;
        }
      }


      if (
        k ===
        "scoring_ladder"
      ) {
        const cur =
          payload
            ?.current_step;


        const goal =
          payload
            ?.goal_steps;


        if (
          typeof cur ===
            "number" &&
          typeof goal ===
            "number" &&
          goal >
            0
        ) {
          progress =
            cur /
            goal;
        }
      }


      if (
        k ===
        "scoring_bingo"
      ) {
        const cc =
          payload
            ?.completed_count;


        if (
          typeof cc ===
          "number"
        ) {
          progress =
            cc /
            9;
        }
      }


      if (
        k ===
        "t20_scoring"
      ) {
        const points =
          payload
            ?.total_points ??
          payload
            ?.points ??
          payload
            ?.total;


        const target =
          payload
            ?.target_points ??
          payload
            ?.target;


        if (
          typeof points ===
            "number" &&
          typeof target ===
            "number" &&
          target >
            0
        ) {
          progress =
            points /
            target;
        }
      }
    }


    /* ----------------------------------------------
       OBJECTIVE SUMMARY
    ----------------------------------------------- */

    if (
      k ===
      "checkouts_popular_leaves"
    ) {
      const current =
        payload
          ?.total_checkouts ??
        payload
          ?.totalCheckouts;


      const target =
        payload
          ?.required_checkouts ??
        payload
          ?.requiredCheckouts;


      if (
        typeof current ===
          "number" &&
        typeof target ===
          "number"
      ) {
        objective = {
          label:
            "Checkouts",

          current,

          target,

          unit:
            "outs",
        };
      }
    } else if (
      k ===
      "scoring_ladder"
    ) {
      const current =
        payload
          ?.current_step;


      const target =
        payload
          ?.goal_steps;


      if (
        typeof current ===
          "number" &&
        typeof target ===
          "number"
      ) {
        objective = {
          label:
            "Steps",

          current,

          target,

          unit:
            "steps",
        };
      }
    } else if (
      k ===
      "scoring_bingo"
    ) {
      const current =
        payload
          ?.completed_count;


      if (
        typeof current ===
          "number"
      ) {
        objective = {
          label:
            "Tiles",

          current,

          target:
            9,

          unit:
            "tiles",
        };
      }
    } else if (
      k ===
      "t20_scoring"
    ) {
      const current =
        payload
          ?.total_points ??
        payload
          ?.points ??
        payload
          ?.total;


      const target =
        payload
          ?.target_points ??
        payload
          ?.target;


      if (
        typeof current ===
          "number" &&
        typeof target ===
          "number"
      ) {
        objective = {
          label:
            "Target points",

          current,

          target,

          unit:
            "pts",
        };
      }
    }


    const forcedCategory:
      | XpCategory
      | undefined =
      k ===
      "bull_out"
        ? "doubles"
        : undefined;


    return {
      game_key:
        k,

      category:
        forcedCategory ??
        drillDef
          ?.category ??
        "other",

      tier,

      level,

      win,

      aborted:
        Boolean(
          payload
            ?.aborted
        ),

      throws_used:
        typeof throws_used ===
        "number"
          ? throws_used
          : undefined,

      max_throws:
        typeof max_throws ===
        "number"
          ? max_throws
          : undefined,

      progress:
        typeof progress ===
        "number"
          ? progress
          : undefined,

      objective,

      stats:
        payload ??
        undefined,
    };
  }


  /* --------------------------------------------------
     INVALID DRILL
  -------------------------------------------------- */

  if (
    !drillKey ||
    !drillDef
  ) {
    return (
      <div className="page">
        <div className="card">
          <p>
            {t(
              "Unknown drill."
            )}
          </p>
        </div>
      </div>
    );
  }


  const Component =
    drillDef.Component;


  const Rules =
    drillDef.Rules;


  const scoringSectionSetup =
    drillDef
      .setup
      ?.scoringSection;


  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="page">
      {/* Game surface */}
      <Component
        onFinish={
          handleFinish
        }
        disabled={
          loading ||
          showRules
        }
        tier={
          currentTier
        }
        level={
          currentLevel
        }
        scoringSection={
          scoringSection
        }
      />


      {/* ------------------------------------------------
          ABORT GAME
      ------------------------------------------------- */}

      {!showRules && (
        <div
          style={{
            marginTop:
              12,
          }}
        >
          <button
            type="button"
            className="btn danger"
            onClick={
              requestAbort
            }
            disabled={
              loading
            }
          >
            {t(
              "Abort game"
            )}
          </button>
        </div>
      )}


      {/* ------------------------------------------------
          RULES / SETUP MODAL
      ------------------------------------------------- */}

      {showRules && (
        <div className="overlay open">
          <div className="overlay-inner">
            <div className="overlay-panel">
              <div className="overlay-panel-head">
                <div className="overlay-panel-title">
                  <h3
                    style={{
                      margin:
                        0,
                    }}
                  >
                    {t(
                      drillDef.title
                    )}
                  </h3>


                  <div
                    className="muted"
                    style={{
                      marginTop:
                        6,
                    }}
                  >
                    {t(
                      drillDef.blurb
                    )}
                  </div>
                </div>


                <div className="pill pill-stat overlay-badge">
                  <div className="pill-label">
                    {t(
                      "Category"
                    )}
                  </div>


                  <div className="pill-value">
                    {
                      categoryLabel
                    }
                  </div>
                </div>
              </div>


              {/* Rules */}
              <div
                className="overlay-rules"
                style={{
                  marginTop:
                    12,
                }}
              >
                <Rules />
              </div>


              {/* Registry-driven setup */}
              {scoringSectionSetup && (
                <div
                  style={{
                    marginTop:
                      20,
                  }}
                >
                  <div
                    className="small muted"
                    style={{
                      marginBottom:
                        8,
                    }}
                  >
                    {t(
                      scoringSectionSetup.label
                    )}
                  </div>


                  <div
                    className="row"
                    style={{
                      gap:
                        8,

                      flexWrap:
                        "wrap",
                    }}
                  >
                    {scoringSectionSetup
                      .options
                      .map(
                        (
                          section
                        ) => (
                          <button
                            key={
                              section
                            }
                            type="button"
                            className={
                              scoringSection ===
                              section
                                ? "btn"
                                : "btn outline"
                            }
                            onClick={() =>
                              setScoringSection(
                                section
                              )
                            }
                          >
                            {
                              section
                            }
                            s
                          </button>
                        )
                      )}
                  </div>
                </div>
              )}


              {/* Actions */}
              <div
                className="row"
                style={{
                  justifyContent:
                    "flex-end",

                  marginTop:
                    16,
                }}
              >
                <button
                  type="button"
                  className="btn outline"
                  onClick={() =>
                    nav(
                      getCategoryPath(
                        category
                      ),
                      {
                        replace:
                          true,
                      }
                    )
                  }
                >
                  {t(
                    "Back to Drills"
                  )}
                </button>


                <button
                  type="button"
                  className="btn"
                  style={{
                    marginLeft:
                      8,
                  }}
                  onClick={() =>
                    setShowRules(
                      false
                    )
                  }
                  disabled={
                    loading ||
                    !sessionId
                  }
                >
                  {t(
                    "Start game"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ------------------------------------------------
          LOCAL ABORT CONFIRMATION

          Used by the red Abort Game
          button inside the page.

          Navbar navigation uses the
          shared generic leave-game
          modal instead.
      ------------------------------------------------- */}

      {showAbortConfirm && (
        <div className="overlay open">
          <div className="overlay-panel">
            <h3>
              {t(
                "Abort game?"
              )}
            </h3>


            <p className="muted">
              {t(
                "Are you sure you want to abort this game? This will count as a loss and XP will be deducted according to the drill rules."
              )}
            </p>


            <div
              className="row"
              style={{
                justifyContent:
                  "flex-end",
              }}
            >
              <button
                type="button"
                className="btn outline"
                disabled={
                  loading
                }
                onClick={() =>
                  setShowAbortConfirm(
                    false
                  )
                }
              >
                {t(
                  "No, continue"
                )}
              </button>


              <button
                type="button"
                className="btn danger"
                disabled={
                  loading
                }
                style={{
                  marginLeft:
                    8,
                }}
                onClick={
                  handleAbortConfirm
                }
              >
                {t(
                  "Yes, abort"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}