// src/xp/engine.ts
import { DrillResult, XpAward, XpCategory } from "./types";
import { DEFAULT_GAME_XP, GAME_XP } from "./gameXp";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Great win: under 50% of allowed throws/darts
function efficiencyRatio(result: DrillResult): number | null {
  if (
    typeof result.throws_used === "number" &&
    typeof result.max_throws === "number" &&
    result.max_throws > 0
  ) {
    return result.throws_used / result.max_throws;
  }

  const anyRes: any = result as any;
  if (
    typeof anyRes.darts_used === "number" &&
    typeof anyRes.max_darts === "number" &&
    anyRes.max_darts > 0
  ) {
    return anyRes.darts_used / anyRes.max_darts;
  }

  return null;
}

export function computeXp(result: DrillResult): XpAward {
  const breakdown: XpAward["breakdown"] = [];

  const cfg = GAME_XP[result.game_key] ?? DEFAULT_GAME_XP;
  const winMag = Math.abs(cfg.win);
  const lossMag = Math.abs(cfg.loss);

  // abort counts as loss
  const isLossLike = !result.win || !!result.aborted;

  const prog =
    typeof result.progress === "number" ? clamp(result.progress, 0, 1) : 0;

  let total = 0;

  if (!isLossLike) {
    total = winMag;
    breakdown.push({
      label: "Win",
      xp: winMag,
    });
  } else {
    const penalty = -lossMag;
  
    breakdown.push({
      label: "Loss",
      xp: penalty,
    });
  
    total = penalty;
  }

  const byCategory: Record<XpCategory, number> = {
    scoring: 0,
    finishing: 0,
    doubles: 0,
    other: 0,
  };
  byCategory[result.category] = total;

  return {
    total,
    byCategory,
    breakdown,
    multiplier: 1,
  };
}
