import React, {
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useTheme } from "../theme/useTheme";
import RankBadge from "./RankBadge";
import { useXpStore } from "../xp/useXpStore";

import type {
  Tier,
} from "../xp/types";

import {
  getRankStateFromXp,
  XP_CAPS,
} from "../xp/rank";

import { useAuthStore } from "../auth/useAuthStore";
import { useAbortStore } from "../session/useAbortStore";

import { useAssessmentStore } from "../skills-assessment/useAssessmentStore";

import HeroLogo from "../assets/img/hero.png";

import { useI18n } from "../i18n/I18nProvider";

export default function NavBar({
  onMenu,
}: {
  onMenu: () => void;
}) {
  const nav = useNavigate();

  const loc =
    useLocation();

  const [
    theme,
    setTheme,
  ] = useTheme();

  const [
    showCancelAssessmentModal,
    setShowCancelAssessmentModal,
  ] =
    useState(false);

  const totalXp =
    useXpStore(
      (s) =>
        s.state.totalXp
    );

  const me =
    useAuthStore(
      (s) => s.me
    );

  const abortHandler =
    useAbortStore(
      (s) =>
        s.handler
    );

  const resetAssessment =
    useAssessmentStore(
      (state) =>
        state.resetAssessment
    );

  const {
    t,
    isDesktop,
  } = useI18n();

  const name =
    me?.display_name ||
    me?.login ||
    t("Player");

  const pathname =
    loc.pathname;

  const isHome =
    pathname === "/" ||
    pathname === "";

  const isDrill =
    pathname.startsWith(
      "/drill/"
    );

  const isAssessmentResults =
    pathname ===
    "/skills-assessment/results";

  const isAssessmentGame =
    pathname.startsWith(
      "/skills-assessment/"
    ) &&
    !isAssessmentResults;

  const toggleTheme = () =>
    setTheme(
      theme === "light"
        ? "dark"
        : "light"
    );

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
     ASSESSMENT
  -------------------------------------------------- */

  function requestCancelAssessment() {
    setShowCancelAssessmentModal(
      true
    );
  }

  function closeCancelAssessmentModal() {
    setShowCancelAssessmentModal(
      false
    );
  }

  function confirmCancelAssessment() {
    setShowCancelAssessmentModal(
      false
    );

    resetAssessment();

    nav("/");
  }

  function finishAssessment() {
    nav("/");
  }

  /* --------------------------------------------------
     NAVIGATION
  -------------------------------------------------- */

  function handleBack() {
    /*
     * Inside a drill, use the existing
     * shared abort handler.
     */
    if (
      isDrill &&
      abortHandler
    ) {
      abortHandler();

      return;
    }

    nav(-1);
  }

  function handleLogoClick() {
    /*
     * Clicking the logo while a drill
     * is open should not silently leave
     * the active session.
     *
     * Use the same abort modal as the
     * Abort button / back navigation.
     */
    if (
      isDrill &&
      abortHandler
    ) {
      abortHandler();

      return;
    }

    /*
     * Everywhere else the logo
     * behaves as Home.
     */
    nav("/");
  }

  return (
    <>
      <header
        className="nav"
        style={{
          display:
            "block",
        }}
      >
        {/* Main navbar */}
        <div
          className="nav-main-row"
          style={{
            position:
              "relative",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            width:
              "100%",
          }}
        >
          {/* Left */}
          <div
            className="nav-left"
            style={{
              flex:
                "1 1 0",

              display:
                "flex",

              justifyContent:
                "flex-start",

              alignItems:
                "center",
            }}
          >
            {isHome ? (
              <button
                className="icon-btn"
                onClick={
                  onMenu
                }
                aria-label={t(
                  "Open menu"
                )}
              >
                ☰
              </button>
            ) : isAssessmentGame ? (
              <button
                type="button"
                className="btn outline"
                onClick={
                  requestCancelAssessment
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
                className="icon-btn"
                onClick={
                  handleBack
                }
                aria-label={t(
                  "Back"
                )}
              >
                ←
              </button>
            )}
          </div>

          {/* Logo */}
          <div
            className="nav-center"
            style={{
              position:
                "absolute",

              left:
                "50%",

              top:
                "50%",

              transform:
                "translate(-50%, -50%)",
            }}
          >
            <button
              type="button"
              onClick={
                handleLogoClick
              }
              aria-label={t(
                "Back to Home"
              )}
              style={{
                padding:
                  0,

                margin:
                  0,

                border:
                  0,

                background:
                  "transparent",

                cursor:
                  "pointer",

                display:
                  "block",
              }}
            >
              <img
                src={
                  HeroLogo
                }
                alt={t(
                  "Darts Hero logo"
                )}
                className="logo-large"
              />
            </button>
          </div>

          {/* Right */}
          <div
            className="nav-right"
            style={{
              flex:
                "1 1 0",

              display:
                "flex",

              justifyContent:
                "flex-end",

              alignItems:
                "center",
            }}
          >
            <div>
              <button
                className="icon-btn"
                onClick={
                  toggleTheme
                }
                aria-label={t(
                  "Theme"
                )}
              >
                {theme ===
                "light"
                  ? "🌙"
                  : "☀️"}
              </button>

              <button
                className="icon-btn"
                onClick={() =>
                  nav(
                    "/profile"
                  )
                }
                aria-label={t(
                  "Profile"
                )}
              >
                👤
              </button>
            </div>

            <div className="profile">
              <div className="nav-title">
                {
                  name
                }
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

        {/* Rank progression */}
        {isDesktop && (
          <div
            className="nav-rank-steps"
            style={{
              width:
                "100%",

              marginTop:
                10,

              paddingTop:
                10,

              paddingBottom:
                4,

              borderTop:
                "1px solid rgba(148, 163, 184, 0.25)",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              gap:
                10,

              flexWrap:
                "wrap",
            }}
          >
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
              label={t(
                "Bronze"
              )}
              tier="Bronze"
            />

            <RankArrow />

            <RankStep
              label={t(
                "Silver"
              )}
              tier="Silver"
            />

            <RankArrow />

            <RankStep
              label={t(
                "Gold"
              )}
              tier="Gold"
            />

            <RankArrow />

            <RankStep
              label={t(
                "Platinum"
              )}
              tier="Platinum"
            />

            <RankArrow />

            <RankStep
              label={t(
                "Diamond"
              )}
              tier="Diamond"
            />
          </div>
        )}
      </header>

      {/* Cancel assessment modal */}
      {showCancelAssessmentModal && (
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
              closeCancelAssessmentModal();
            }
          }}
        >
          <div
            className="card assessment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-assessment-title"
            aria-describedby="cancel-assessment-description"
          >
            <h2
              id="cancel-assessment-title"
              style={{
                marginTop:
                  0,
              }}
            >
              {t(
                "Cancel assessment?"
              )}
            </h2>

            <p
              id="cancel-assessment-description"
              className="muted"
            >
              {t(
                "Are you sure you want to cancel the assessment? Your current assessment progress will be lost."
              )}
            </p>

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
                onClick={
                  closeCancelAssessmentModal
                }
              >
                {t(
                  "Keep playing"
                )}
              </button>

              <button
                type="button"
                className="btn"
                onClick={
                  confirmCancelAssessment
                }
              >
                {t(
                  "Cancel assessment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
        {
          label
        }
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