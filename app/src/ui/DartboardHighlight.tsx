// src/ui/DartboardHighlight.tsx
import React from "react";

export type SegmentRing =
  | "single"
  | "treble"
  | "double"
  | "outer_bull"
  | "inner_bull";

export type HighlightSegment = {
  ring: SegmentRing;
  // 1–20 for normal wedges; undefined for bulls
  value?: number;
};

type Props = {
  segments: HighlightSegment[];
  className?: string;
};

// Standard dartboard order, clockwise starting at 20 at the top
const NUMBERS: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5
];

const centerX = 60;
const centerY = 60;

// Radii for where we place the highlight dots
const RADIUS_BY_RING: Record<SegmentRing, number> = {
  // roughly between bull and treble
  single: 40,
  treble: 32,
  double: 48,
  outer_bull: 10,
  inner_bull: 5
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Convert "board value" (1-20) to the angle (deg) where that number sits.
 * We treat 20 as -90° (top) and go clockwise.
 */
function valueToAngle(value: number): number {
  const index = NUMBERS.indexOf(value);
  if (index === -1) return -90; // fallback: top
  const step = 360 / 20;
  // 20 is at -90°, then we go clockwise
  return -90 + index * step;
}

export default function DartboardHighlight({ segments, className }: Props) {
  return (
    <div className={className ?? ""}>
      <svg
        viewBox="0 0 120 120"
        className="dartboard-svg"
        aria-hidden="true"
      >
        {/* Board background */}
        <circle
          cx={centerX}
          cy={centerY}
          r={58}
          className="dartboard-base"
        />

        {/* Double ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={RADIUS_BY_RING.double}
          className="dartboard-ring"
        />
        {/* Treble ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={RADIUS_BY_RING.treble}
          className="dartboard-ring"
        />
        {/* Outer single boundary (just for feel) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={RADIUS_BY_RING.single}
          className="dartboard-ring subtle"
        />
        {/* Bulls */}
        <circle
          cx={centerX}
          cy={centerY}
          r={RADIUS_BY_RING.outer_bull}
          className="dartboard-bull-outer"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={RADIUS_BY_RING.inner_bull}
          className="dartboard-bull-inner"
        />

        {/* Number labels (optional, but helps orientation) */}
        {NUMBERS.map((num, idx) => {
          const angleDeg = -90 + idx * (360 / 20);
          const r = 54;
          const rad = toRad(angleDeg);
          const x = centerX + r * Math.cos(rad);
          const y = centerY + r * Math.sin(rad) + 3; // small vertical tweak
          return (
            <text
              key={num + "-label"}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="6"
              className="dartboard-number"
            >
              {num}
            </text>
          );
        })}

        {/* Highlights */}
        {segments.map((seg, idx) => {
          if (seg.ring === "inner_bull" || seg.ring === "outer_bull") {
            const r =
              seg.ring === "inner_bull"
                ? RADIUS_BY_RING.inner_bull
                : RADIUS_BY_RING.outer_bull;
            return (
              <circle
                key={"bull-" + idx}
                cx={centerX}
                cy={centerY}
                r={r}
                className="dartboard-highlight-bull"
              />
            );
          }

          if (!seg.value) return null;

          const angleDeg = valueToAngle(seg.value);
          const rad = toRad(angleDeg);
          const r = RADIUS_BY_RING[seg.ring];
          const x = centerX + r * Math.cos(rad);
          const y = centerY + r * Math.sin(rad);

          return (
            <circle
              key={seg.ring + "-" + seg.value + "-" + idx}
              cx={x}
              cy={y}
              r={3}
              className="dartboard-highlight-dot"
            />
          );
        })}
      </svg>
    </div>
  );
}

export function tokensToSegments(tokens: string[]): HighlightSegment[] {
    const out: HighlightSegment[] = [];
  
    for (const raw of tokens) {
      const t = raw.trim().toUpperCase();
  
      if (t === "DBULL" || t === "DB" || t === "INNER BULL") {
        out.push({ ring: "inner_bull" });
        continue;
      }
      if (t === "BULL" || t === "OBULL" || t === "SBULL") {
        out.push({ ring: "outer_bull" });
        continue;
      }
  
      // T20, D16, S9, 9, etc.
      const match = t.match(/^([SDT])?(\d{1,2})$/);
      if (!match) continue;
  
      const [, prefix, numStr] = match;
      const value = parseInt(numStr, 10);
      if (value < 1 || value > 20 || Number.isNaN(value)) continue;
  
      let ring: SegmentRing = "single";
      if (prefix === "D") ring = "double";
      if (prefix === "T") ring = "treble";
  
      out.push({ ring, value });
    }
  
    return out;
  }
  