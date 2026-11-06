// src/ui/NavBar.tsx

import React, {
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useTheme,
} from "../theme/useTheme";

import RankBadge from "./RankBadge";

import {
  useXpStore,
} from "../xp/useXpStore";

import {
  getRankStateFromXp,
  XP_CAPS,
} from "../xp/rank";

import {
  useAuthStore,
} from "../auth/useAuthStore";

import {
  useGameExitStore,
} from "../session/useGameExitStore";

import {
  getDrillDef,
} from "../drills/registry";

import HeroLogo from "../assets/img/hero.png";

import {
  useI18n,
} from "../i18n/I18nProvider";


/* --------------------------------------------------
   NAVIGATION HELPERS
-------------------------------------------------- */

function getCategoryPath(
  category?: string
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


/*
 * Header Back should follow the
 * app taxonomy rather than browser
 * history.
 *
 * This prevents:
 *
 * result -> finished game
 * game -> previous result
 * etc.
 */
function getTaxonomyParent(
  pathname: string
) {
  /* Home */
  if (
    pathname === "/" ||
    pathname === ""
  ) {
    return "/";
  }


  /* --------------------------------------------
     DRILL RESULTS
  --------------------------------------------- */

  if (
    pathname.startsWith(
      "/result/"
    )
  ) {
    const drillKey =
      pathname.split(
        "/"
      )[2] || "";

    const drillDef =
      getDrillDef(
        drillKey
      );

    return getCategoryPath(
      drillDef?.category
    );
  }


  /* --------------------------------------------
     DRILL GAME
  --------------------------------------------- */

  if (
    pathname.startsWith(
      "/drill/"
    )
  ) {
    const drillKey =
      pathname.split(
        "/"
      )[2] || "";

    const drillDef =
      getDrillDef(
        drillKey
      );

    return getCategoryPath(
      drillDef?.category
    );
  }


  /* --------------------------------------------
     CATEGORY
  --------------------------------------------- */

  if (
    pathname.startsWith(
      "/category/"
    )
  ) {
    return "/";
  }


  /* --------------------------------------------
     SKILLS ASSESSMENT
  --------------------------------------------- */

  if (
    pathname ===
    "/skills-assessment/results"
  ) {
    return "/skills-assessment";
  }


  if (
    pathname.startsWith(
      "/skills-assessment/"
    )
  ) {
    return "/skills-assessment";
  }


  if (
    pathname ===
    "/skills-assessment"
  ) {
    return "/";
  }


  /* --------------------------------------------
     VERSUS
  --------------------------------------------- */

  if (
    pathname.startsWith(
      "/versus/"
    )
  ) {
    return "/versus";
  }


  if (
    pathname ===
    "/versus"
  ) {
    return "/";
  }


  /* --------------------------------------------
     TOP LEVEL PAGES
  --------------------------------------------- */

  if (
    pathname.startsWith(
      "/profile"
    ) ||
    pathname.startsWith(
      "/stats"
    )
  ) {
    return "/";
  }


  /*
   * Safe fallback.
   */
  return "/";
}


/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

export default function NavBar({
  onMenu,
}: {
  onMenu: () => void;
}) {
  const nav =
    useNavigate();

  const loc =
    useLocation();


  const [
    theme,
    setTheme,
  ] =
    useTheme();


  const [
    showLeaveGameModal,
    setShowLeaveGameModal,
  ] =
    useState(
      false
    );


  /*
   * Navigation the user originally
   * requested before the game-exit
   * confirmation appeared.
   */
  const [
    pendingNavigation,
    setPendingNavigation,
  ] =
    useState<
      (() => void) | null
    >(
      null
    );


  const [
    leavingGame,
    setLeavingGame,
  ] =
    useState(
      false
    );


  /* --------------------------------------------------
     USER / XP
  -------------------------------------------------- */

  const totalXp =
    useXpStore(
      (s) =>
        s.state.totalXp
    );


  const me =
    useAuthStore(
      (s) =>
        s.me
    );


  /* --------------------------------------------------
     ACTIVE GAME
  -------------------------------------------------- */

  const gameActive =
    useGameExitStore(
      (s) =>
        s.active
    );


  const gameHasXpPenalty =
    useGameExitStore(
      (s) =>
        s.xpPenalty
    );


  const gameExitHandler =
    useGameExitStore(
      (s) =>
        s.handler
    );


  const {
    t,
    isDesktop,
  } =
    useI18n();


  const pathname =
    loc.pathname;


  const name =
    me?.display_name ||
    me?.login ||
    t("Player");


  const isHome =
    pathname === "/" ||
    pathname === "";


  const isAssessmentResults =
    pathname ===
    "/skills-assessment/results";


  const isAssessmentGame =
    pathname.startsWith(
      "/skills-assessment/"
    ) &&
    !isAssessmentResults;


  /* --------------------------------------------------
     THEME
  -------------------------------------------------- */

  /*
   * Theme doesn't leave the page,
   * so it should ALWAYS remain
   * available during games.
   */
  const toggleTheme =
    () =>
      setTheme(
        theme === "light"
          ? "dark"
          : "light"
      );


  /* --------------------------------------------------
     OVERALL RANK
  -------------------------------------------------- */

  const overallRank =
    useMemo(
      () =>
        getRankStateFromXp(
          totalXp ?? 0,
          XP_CAPS.overallTierMax,
          "Bronze"
        ),
      [
        totalXp,
      ]
    );


  /* --------------------------------------------------
     GAME NAVIGATION GUARD
  -------------------------------------------------- */

  function requestNavigation(
    action: () => void
  ) {
    /*
     * No active game:
     * navigate normally.
     */
    if (
      !gameActive
    ) {
      action();

      return;
    }


    /*
     * Active game:
     * remember where the user
     * wanted to go and ask first.
     */
    setPendingNavigation(
      () =>
        action
    );


    setShowLeaveGameModal(
      true
    );
  }


  function closeLeaveGameModal() {
    if (
      leavingGame
    ) {
      return;
    }


    setShowLeaveGameModal(
      false
    );


    setPendingNavigation(
      null
    );
  }


  async function confirmLeaveGame() {
    if (
      leavingGame
    ) {
      return;
    }


    setLeavingGame(
      true
    );


    /*
     * Keep a local reference.
     *
     * The game cleanup may clear
     * its store while executing.
     */
    const navigateAfterExit =
      pendingNavigation;


    try {
      /*
       * Drill:
       * ends session and applies
       * XP loss.
       *
       * Assessment / Versus:
       * resets/discards current game.
       */
      await gameExitHandler?.();


      setShowLeaveGameModal(
        false
      );


      setPendingNavigation(
        null
      );


      /*
       * Only after cleanup succeeds
       * do we perform the navigation
       * originally requested.
       */
      navigateAfterExit?.();
    } finally {
      setLeavingGame(
        false
      );
    }
  }


  /* --------------------------------------------------
     NAV ACTIONS
  -------------------------------------------------- */

  function handleLogoClick() {
    requestNavigation(
      () =>
        nav(
          "/",
          {
            replace:
              true,
          }
        )
    );
  }


  function handleBack() {
    const parent =
      getTaxonomyParent(
        pathname
      );


    requestNavigation(
      () =>
        nav(
          parent,
          {
            replace:
              true,
          }
        )
    );
  }


  function handleProfile() {
    requestNavigation(
      () =>
        nav(
          "/profile"
        )
    );
  }


  /*
   * Keep the Assessment button
   * for now, but it uses the same
   * generic leave-game modal.
   *
   * Its actual reset will later
   * come from the Assessment
   * game's registered handler.
   */
  function handleCancelAssessment() {
    requestNavigation(
      () =>
        nav(
          "/skills-assessment",
          {
            replace:
              true,
          }
        )
    );
  }


  function finishAssessment() {
    nav(
      "/",
      {
        replace:
          true,
      }
    );
  }


  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <>
      <header className="nav">
        {/* Main navbar */}
        <div className="nav-main-row">
          {/* ----------------------------------------
              LEFT
          ----------------------------------------- */}

          <div className="nav-left">
            {isHome ? (
              <button
                type="button"
                className="icon-btn"
                onClick={
                  onMenu
                }
                aria-label={
                  t(
                    "Open menu"
                  )
                }
              >
                ☰
              </button>
            ) : isAssessmentGame ? (
              <button
                type="button"
                className="btn outline"
                onClick={
                  handleCancelAssessment
                }
              >
                {t(
                  "Cancel assessment"
                )}
              </button>
            ) : isAssessmentResults ? (
              <button
                type="button"
                className="btn outline"
                onClick={
                  finishAssessment
                }
              >
                {t(
                  "Finish"
                )}
              </button>
            ) : (
              <button
                type="button"
                className="icon-btn"
                onClick={
                  handleBack
                }
                aria-label={
                  t("Back")
                }
              >
                ←
              </button>
            )}
          </div>


          {/* ----------------------------------------
              CENTER LOGO
          ----------------------------------------- */}

          <div className="nav-center">
            <button
              type="button"
              className="nav-logo-button"
              onClick={
                handleLogoClick
              }
              aria-label={
                gameActive
                  ? t(
                      "Leave game and go home"
                    )
                  : t(
                      "Go to home"
                    )
              }
            >
              <img
                src={
                  HeroLogo
                }
                alt={
                  t(
                    "Darts Hero logo"
                  )
                }
                className="logo-large"
              />
            </button>
          </div>


          {/* ----------------------------------------
              RIGHT
          ----------------------------------------- */}

          <div className="nav-right">
            <div className="nav-actions">
              {/* Theme remains active in games */}
              <button
                type="button"
                className="icon-btn"
                onClick={
                  toggleTheme
                }
                aria-label={
                  t(
                    "Theme"
                  )
                }
              >
                {theme ===
                "light"
                  ? "🌙"
                  : "☀️"}
              </button>


              {/* Profile is also active;
                  navigation is guarded */}
              <button
                type="button"
                className="icon-btn"
                onClick={
                  handleProfile
                }
                aria-label={
                  t(
                    "Profile"
                  )
                }
              >
                👤
              </button>
            </div>


            <div className="profile">
              <div className="nav-title">
                {name}
              </div>


              <div className="nav-subtitle">
                <RankBadge
                  tier={
                    overallRank.tier
                  }
                  level={
                    overallRank.level
                  }
                />
              </div>
            </div>
          </div>
        </div>


        {/* ------------------------------------------
            DESKTOP RANK PROGRESSION
        ------------------------------------------- */}

        {isDesktop && (
          <div className="nav-rank-steps">
            <span
              className="muted small"
              style={{
                fontWeight:
                  800,
              }}
            >
              {t(
                "Ranks"
              )}
              :
            </span>


            <RankStep
              label={
                t(
                  "Bronze"
                )
              }
              tier="Bronze"
            />


            <RankArrow />


            <RankStep
              label={
                t(
                  "Silver"
                )
              }
              tier="Silver"
            />


            <RankArrow />


            <RankStep
              label={
                t(
                  "Gold"
                )
              }
              tier="Gold"
            />


            <RankArrow />


            <RankStep
              label={
                t(
                  "Platinum"
                )
              }
              tier="Platinum"
            />


            <RankArrow />


            <RankStep
              label={
                t(
                  "Diamond"
                )
              }
              tier="Diamond"
            />
          </div>
        )}
      </header>


      {/* ------------------------------------------------
          SHARED LEAVE GAME MODAL
      ------------------------------------------------- */}

      {showLeaveGameModal && (
        <div
          className="assessment-modal-backdrop"
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeLeaveGameModal();
            }
          }}
        >
          <div
            className="card assessment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-game-title"
            aria-describedby="leave-game-description"
          >
            <h2
              id="leave-game-title"
              style={{
                marginTop:
                  0,
              }}
            >
              {t(
                "Leave game?"
              )}
            </h2>


            <p
              id="leave-game-description"
              className="muted"
            >
              {t(
                "Are you sure you want to leave this game? Your current progress will be lost."
              )}
            </p>


            {gameHasXpPenalty && (
              <p className="muted">
                {t(
                  "This will count as a loss and XP will be deducted according to the drill rules."
                )}
              </p>
            )}


            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "1fr 1fr",

                gap:
                  10,

                marginTop:
                  18,
              }}
            >
              <button
                type="button"
                className="btn outline"
                disabled={
                  leavingGame
                }
                onClick={
                  closeLeaveGameModal
                }
              >
                {t(
                  "Keep playing"
                )}
              </button>


              <button
                type="button"
                className="btn danger"
                disabled={
                  leavingGame
                }
                onClick={
                  confirmLeaveGame
                }
              >
                {leavingGame
                  ? t(
                      "Leaving..."
                    )
                  : t(
                      "Leave game"
                    )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


/* --------------------------------------------------
   RANK PROGRESSION HELPERS
-------------------------------------------------- */

function RankStep({
  label,
  tier,
}: {
  label: string;

  tier:
    | "Bronze"
    | "Silver"
    | "Gold"
    | "Platinum"
    | "Diamond";
}) {
  return (
    <div
      style={{
        display:
          "flex",

        alignItems:
          "center",

        gap:
          6,
      }}
    >
      <span
        className="small"
        style={{
          fontWeight:
            700,

          whiteSpace:
            "nowrap",
        }}
      >
        {label}
      </span>


      <RankBadge
        tier={
          tier
        }
        level={
          1
        }
        showLevel={
          false
        }
      />
    </div>
  );
}


function RankArrow() {
  return (
    <span
      className="muted"
      aria-hidden="true"
      style={{
        fontWeight:
          800,
      }}
    >
      →
    </span>
  );
}