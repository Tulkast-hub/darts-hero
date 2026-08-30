import React from "react";

type Tier =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond";

const colors: Record<
  Tier,
  {
    outer: string;
    middle: string;
    inner: string;
    text: string;
  }
> = {
  Bronze: {
    outer: "#b87333",
    middle: "#8f5428",
    inner: "#6f3f1d",
    text: "#ffffff",
  },

  Silver: {
    outer: "#d9dde1",
    middle: "#b8bec4",
    inner: "#929aa2",
    text: "#1f2937",
  },

  Gold: {
    outer: "#f6c700",
    middle: "#d9aa00",
    inner: "#a97f00",
    text: "#ffffff",
  },

  Platinum: {
    outer: "#8c969f",
    middle: "#68737d",
    inner: "#4b5560",
    text: "#ffffff",
  },

  Diamond: {
    outer: "#4fd8f5",
    middle: "#16b8df",
    inner: "#078ab0",
    text: "#ffffff",
  },
};

export default function RankBadge({
  tier,
  level,
  showLevel = true,
}: {
  tier: Tier;
  level: number;
  showLevel?: boolean;
}) {
  const palette = colors[tier];

  const safeLevel = Math.max(
    1,
    Math.min(5, level)
  );

  const title = showLevel
    ? `${tier} ${safeLevel}`
    : tier;

  return (
    <span
      className="rank-badge-img"
      title={title}
      aria-label={title}
    >
      <svg
        viewBox="0 0 40 40"
        className="rank-badge-svg"
        aria-hidden="true"
      >
        <circle
          cx="20"
          cy="20"
          r="19"
          fill={palette.outer}
        />

        <circle
          cx="20"
          cy="20"
          r="13"
          fill={palette.middle}
        />

        <circle
          cx="20"
          cy="20"
          r="7"
          fill={palette.inner}
        />

        {tier === "Platinum" && (
          <path
            d="M20 5 L23 11 L30 12 L25 17 L26 24 L20 21 L14 24 L15 17 L10 12 L17 11 Z"
            fill="rgba(255,255,255,0.18)"
          />
        )}

        {tier === "Diamond" && (
          <path
            d="M12 14 H28 L33 20 L20 33 L7 20 Z"
            fill="rgba(255,255,255,0.22)"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1"
          />
        )}
      </svg>

      {showLevel && (
        <b
          className="rank-level"
          style={{
            color: palette.text,
          }}
        >
          {safeLevel}
        </b>
      )}
    </span>
  );
}