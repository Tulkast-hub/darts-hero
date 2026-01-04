import React, { useMemo } from "react";
import RankBadge from "../ui/RankBadge";
import { Link } from "react-router-dom";
import { useXpStore } from "../xp/useXpStore";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
import { useAuthStore } from "../auth/useAuthStore";

export default function HomePage() {
  const totalXp = useXpStore((s) => s.state.totalXp);
  const me = useAuthStore((s) => s.me);
  const name = me?.display_name || me?.login || "Player";

  const overallRank = useMemo(
    () => getRankStateFromXp(totalXp ?? 0, XP_CAPS.overallTierMax, "Bronze"),
    [totalXp]
  );

  return (
    <div className="page">
      <section className="hero card">
        <div className="row">
          <div>
            <div className="title">
              Welcome, <strong>{name}</strong>
            </div>
            <div className="subtitle">
              Overall Rank: <RankBadge tier={overallRank.tier} level={overallRank.level} />
            </div>
          </div>
        </div>
      </section>

      <h3>Categories</h3>
      <div className="stack-wrap">
        <div className="stack-list">
        <Link to="/category/scoring" className="category-card card accent-red">
          <div className="category-title">Scoring</div>
          <div className="muted">Power scoring & T20 drills</div>
        </Link>
        <Link to="/category/doubling" className="category-card card accent-green">
          <div className="category-title">Doubling</div>
          <div className="muted">Doubles consistency</div>
        </Link>
        <Link to="/category/finishing" className="category-card card accent-gold">
          <div className="category-title">Finishing</div>
          <div className="muted">121+ ladders & checkouts</div>
        </Link>
        </div>
        </div>
    </div>
  );
}
