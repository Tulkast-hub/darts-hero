import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import RankBadge from "../ui/RankBadge";
import { useXpStore } from "../xp/useXpStore";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
import { useAuthStore } from "../auth/useAuthStore";
import { useI18n } from "../i18n/I18nProvider";

/**
 * Training Mode landing page.
 * This mirrors the old HomePage category selection.
 */
export default function TrainingHomePage() {
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
            {t("Training Mode")} · <strong>{name}</strong>{" "}
            <RankBadge tier={overallRank.tier} level={overallRank.level} />
          </div>
          <div className="subtitle">
            <h2>{t("Choose a category")}</h2>
            <p>{t("Play drills, earn XP, and level up your skills.")}</p>
          </div>
        </div>
      </section>

      <h3>{t("Categories")}</h3>
      <div className="stack-wrap">
        <div className="stack-list">
          <Link to="/category/scoring" className="category-card card accent-red">
            <div className="category-title">{t("Scoring")}</div>
            <div className="muted">{t("Power scoring & T20 drills")}</div>
          </Link>
          <Link to="/category/doubling" className="category-card card accent-green">
            <div className="category-title">{t("Doubling")}</div>
            <div className="muted">{t("Doubles consistency")}</div>
          </Link>
          <Link to="/category/finishing" className="category-card card accent-gold">
            <div className="category-title">{t("Finishing")}</div>
            <div className="muted">{t("121+ ladders & checkouts")}</div>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Link to="/" className="btn outline" style={{ width: "100%" }}>
          {t("Back")}
        </Link>
      </div>
    </div>
  );
}