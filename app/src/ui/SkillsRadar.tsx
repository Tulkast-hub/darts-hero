import React, { useMemo } from "react";

type SkillPoint = {
  key: string;
  label: string;
  value: number;
};

type SkillsRadarProps = {
  skills: SkillPoint[];
  size?: number;
};

export default function SkillsRadar({
  skills,
  size = 420,
}: SkillsRadarProps) {
  const center = size / 2;
  const radius = size * 0.32;
  const labelRadius = size * 0.43;

  const levels = [20, 40, 60, 80, 100];

  const angleStep =
    (Math.PI * 2) / skills.length;

  const points = useMemo(() => {
    return skills.map((skill, index) => {
      const angle =
        -Math.PI / 2 +
        index * angleStep;

      const value =
        Math.max(
          0,
          Math.min(
            100,
            skill.value
          )
        ) / 100;

      return {
        ...skill,
        angle,
        x:
          center +
          Math.cos(angle) *
            radius *
            value,
        y:
          center +
          Math.sin(angle) *
            radius *
            value,
      };
    });
  }, [
    skills,
    angleStep,
    center,
    radius,
  ]);

  const polygonPoints =
    points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

  function getLevelPoints(
    percentage: number
  ) {
    const levelRadius =
      radius *
      (percentage / 100);

    return skills
      .map((_, index) => {
        const angle =
          -Math.PI / 2 +
          index * angleStep;

        const x =
          center +
          Math.cos(angle) *
            levelRadius;

        const y =
          center +
          Math.sin(angle) *
            levelRadius;

        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{
          width: "100%",
          maxWidth: size,
          height: "auto",
          display: "block",
        }}
        role="img"
        aria-label="Skills profile radar chart"
      >
        {levels.map(
          (level) => (
            <polygon
              key={level}
              points={getLevelPoints(
                level
              )}
              fill="none"
              stroke="rgba(148, 163, 184, 0.28)"
              strokeWidth="1"
            />
          )
        )}

        {skills.map(
          (_, index) => {
            const angle =
              -Math.PI / 2 +
              index * angleStep;

            const x =
              center +
              Math.cos(angle) *
                radius;

            const y =
              center +
              Math.sin(angle) *
                radius;

            return (
              <line
                key={index}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="rgba(148, 163, 184, 0.28)"
                strokeWidth="1"
              />
            );
          }
        )}

        <polygon
          points={polygonPoints}
          fill="rgba(245, 158, 11, 0.22)"
          stroke="rgba(217, 119, 6, 0.95)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {points.map(
          (point) => (
            <circle
              key={point.key}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke="rgba(217, 119, 6, 1)"
              strokeWidth="3"
            />
          )
        )}

        {skills.map(
          (skill, index) => {
            const angle =
              -Math.PI / 2 +
              index * angleStep;

            const x =
              center +
              Math.cos(angle) *
                labelRadius;

            const y =
              center +
              Math.sin(angle) *
                labelRadius;

            const cos =
              Math.cos(angle);

            let textAnchor:
              | "start"
              | "middle"
              | "end" =
              "middle";

            if (cos > 0.25) {
              textAnchor = "start";
            } else if (
              cos < -0.25
            ) {
              textAnchor = "end";
            }

            return (
              <g
                key={skill.key}
              >
                <text
                  x={x}
                  y={y - 4}
                  textAnchor={
                    textAnchor
                  }
                  dominantBaseline="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="currentColor"
                >
                  {skill.label}
                </text>

                <text
                  x={x}
                  y={y + 14}
                  textAnchor={
                    textAnchor
                  }
                  dominantBaseline="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill="currentColor"
                  opacity="0.7"
                >
                  {skill.value.toFixed(
                    1
                  )}
                </text>
              </g>
            );
          }
        )}
      </svg>
    </div>
  );
}