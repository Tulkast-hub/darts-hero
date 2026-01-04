import React from "react";

type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

const colors: Record<Tier, string> = {
  Bronze: "#b87333",
  Silver: "#c0c0c0",
  Gold: "#ffd700",
  Platinum: "#8fe2ff",
  Diamond: "#62e1ff",
};

export default function RankBadge({
  tier,
  level,
}: {
  tier: Tier;
  level: number;
}) {
  const base = colors[tier];

  return (
    <span className="rank-badge-img" title={`${tier} ${level}`}>
      <svg
        viewBox="0 0 40 40"
        className="rank-badge-svg"
        aria-hidden="true"
      >
        {/* outer ring */}
        <circle cx="20" cy="20" r="19" fill={base} />
        {/* middle, slightly darker */}
        <circle cx="20" cy="20" r="13" fill="rgba(0,0,0,0.18)" />
        {/* inner bull */}
        <circle cx="20" cy="20" r="7" fill="rgba(0,0,0,0.35)" />
      </svg>
      <b className="rank-level">{level}</b>
    </span>
  );
}
