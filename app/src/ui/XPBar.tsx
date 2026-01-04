import React from "react";
import RankBadge from "./RankBadge";
import type { Tier } from "../xp/types";
import { getRankStateFromXp } from "../xp/rank";

type Props = {
  label: string;
  value: number; // cumulative XP for this track
  max: number;   // tierMax for this track (XP for ranks 1..5)
  baseTier?: Tier; // usually Bronze
};

/**
 * Footer / inline XP bar.
 * Shows progress WITHIN the current rank (not the whole tier).
 * Tier promotion is derived from XP overflow.
 */
export default function XPBar({ label, value, max, baseTier = "Bronze" }: Props) {
  const { tier, level, xpInRank, rankSize, pct } = getRankStateFromXp(value, max, baseTier);

  return (
    <div className="xpbar">
      <div className="xpbar-header">
        <div className="xpbar-label">{label}</div>
        <div className="xpbar-badge">
          <RankBadge tier={tier} level={level} />
        </div>
      </div>

      <div className="xpbar-track">
        <div className="xpbar-fill" style={{ width: Math.round(pct * 100) + "%" }} />
      </div>

      <div className="xpbar-text">
        {Math.floor(xpInRank)} / {Math.floor(rankSize)}
      </div>
    </div>
  );
}
