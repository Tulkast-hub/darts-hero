import React, { useMemo } from "react";
import RankBadge from "../ui/RankBadge";
import { Link } from "react-router-dom";
import { useXpStore } from "../xp/useXpStore";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
import { useAuthStore } from "../auth/useAuthStore";
import InstallAppButton from "../components/InstallAppButton";
import { useI18n } from "../i18n/I18nProvider";

export default function HomePage() {
  const { t } = useI18n();
  const totalXp = useXpStore((s) => s.state.totalXp);
  const me = useAuthStore((s) => s.me);
  const name = me?.display_name || me?.login || t("Player");

  const overallRank = useMemo(
    () => getRankStateFromXp(totalXp ?? 0, XP_CAPS.overallTierMax, "Bronze"),
    [totalXp]
  );

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="title">
            {t("Welcome")}, <strong>{name}</strong>{" "}
            <RankBadge tier={overallRank.tier} level={overallRank.level} />
          </div>

          <div className="subtitle">
            <h2>{t("Take your darts to the next level")}</h2>
            <p>{t("Grow with each game and try to reach new heights in your dart game")}</p>
          </div>
        </div>
      </section>

      <h3>{t("Game Modes")}</h3>
      <div className="stack-wrap">
        <div className="stack-list">
          <Link to="/training" className="category-card card accent-green">
            <div className="category-title">{t("Training Mode")}</div>
            <div className="muted">{t("Play drills, earn XP, level up")}</div>
          </Link>

          <Link to="/versus" className="category-card card accent-red">
            <div className="category-title">{t("Versus Mode")}</div>
            <div className="muted">{t("Hotseat 1v1 — first to finish wins")}</div>
          </Link>

          <Link to="/skills-assessment" className="category-card card  accent-gold">
            <div className="category-title">{t("Skills Assessment")}</div>
            <div className="muted">
              {t("Test your darts skills and get a recommended training level.")}
            </div>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <InstallAppButton />
      </div>
    </div>
  );
}
