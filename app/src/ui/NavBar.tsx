import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../theme/useTheme";
import RankBadge from "./RankBadge";
import { useXpStore } from "../xp/useXpStore";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
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
  const loc = useLocation();

  const [theme, setTheme] = useTheme();

  const totalXp = useXpStore(
    (s) => s.state.totalXp
  );

  const me = useAuthStore(
    (s) => s.me
  );

  const abortHandler = useAbortStore(
    (s) => s.handler
  );

  const resetAssessment = useAssessmentStore(
    (state) => state.resetAssessment
  );

  const { t, isDesktop } =
    useI18n();

  const name =
    me?.display_name ||
    me?.login ||
    t("Player");

  const pathname = loc.pathname;

  const isHome =
    pathname === "/" ||
    pathname === "";

  const isAssessmentLanding =
    pathname ===
    "/skills-assessment";

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

  const overallRank = useMemo(
    () =>
      getRankStateFromXp(
        totalXp ?? 0,
        XP_CAPS.overallTierMax,
        "Bronze"
      ),
    [totalXp]
  );

  function cancelAssessment() {
    resetAssessment();

    nav("/skills-assessment");
  }

  function finishAssessment() {
    nav("/");
  }

  function handleBack() {
    if (
      pathname.startsWith(
        "/drill/"
      ) &&
      abortHandler
    ) {
      abortHandler();
      return;
    }

    nav(-1);
  }

  return (
    <header className="nav">
      <div
        style={{
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr auto 1fr",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div className="nav-left">
            {isHome ? (
              <button
                className="icon-btn"
                onClick={onMenu}
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
                  cancelAssessment
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
                {t("Finish")}
              </button>
            ) : (
              <button
                className="icon-btn"
                onClick={handleBack}
                aria-label={t(
                  "Back"
                )}
              >
                ←
              </button>
            )}
          </div>

          <div className="nav-center">
            <img
              src={HeroLogo}
              alt={t(
                "Darts Hero logo"
              )}
              className="logo-large"
            />
          </div>

          <div className="nav-right">
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
                {theme === "light"
                  ? "🌙"
                  : "☀️"}
              </button>

              <button
                className="icon-btn"
                onClick={() =>
                  nav("/profile")
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

        {isDesktop && (
          <div
            className="nav-rank-steps"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              gap: 10,
              marginTop: 8,
              paddingBottom: 6,
              flexWrap: "wrap",
            }}
          >
            <span
              className="muted small"
              style={{
                fontWeight: 800,
              }}
            >
              {t("Ranks")}:
            </span>

            <RankStep
              label={t("Bronze")}
              tier="Bronze"
            />

            <RankArrow />

            <RankStep
              label={t("Silver")}
              tier="Silver"
            />

            <RankArrow />

            <RankStep
              label={t("Gold")}
              tier="Gold"
            />

            <RankArrow />

            <RankStep
              label={t("Platinum")}
              tier="Platinum"
            />

            <RankArrow />

            <RankStep
              label={t("Diamond")}
              tier="Diamond"
            />
          </div>
        )}
      </div>
    </header>
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
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <span
        className="small"
        style={{
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      <RankBadge
        tier={tier}
        level={1}
        showLevel={false}
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
        fontWeight: 800,
      }}
    >
      →
    </span>
  );
}