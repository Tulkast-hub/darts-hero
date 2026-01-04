// xpEngine.ts
export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export type DrillRankState = {
  key: string;      // "bull_out"
  tier: Tier;
  level: number;    // 1..5
  xpInLevel: number;
};

export type BullOutResultInput = {
  score: number;
  dartsThrown: number;   // 90
  aborted: boolean;
};

export type XpOutcome = {
  outcome: "hard_loss" | "soft_loss" | "win" | "strong_win" | "aborted";
  deltaDrill: number;
  deltaCategory: number;
  deltaOverall: number;
};

export type DrillXpSummary = {
  label: string;          // "Drill XP · Bull Out"
  tier: Tier;
  xpBefore: number;
  xpAfter: number;
  max: number;
};

export type XpSummary = {
  drill: DrillXpSummary;
  category: DrillXpSummary;
  overall: DrillXpSummary;
};

export type ProfileState = {
  // one entry per drill
  drills: Record<string, DrillRankState>;
  // simple category track – for now one per category slug
  categories: Record<string, { xp: number; max: number; tier: Tier }>;
  overall: { xp: number; max: number; tier: Tier };
};

// --- CONFIG ------------------------------------------------------------------

export const TIER_ORDER: Tier[] = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond"
];

export const XP_PER_LEVEL_BY_TIER: Record<Tier, number> = {
  Bronze: 600,
  Silver: 800,
  Gold: 1200,
  Platinum: 1600,
  Diamond: 2400
};

// Bull Out targets (points) per tier/level
const BULL_OUT_TARGETS: Record<Tier, number[]> = {
  Bronze: [4, 4, 4, 7, 7],
  Silver: [14, 14, 14, 17, 20],
  Gold: [27, 34, 41, 48, 54],
  Platinum: [11, 23, 34, 45, 56],
  Diamond: [63, 68, 72, 75, 79]
};

function tierIndex(t: Tier): number {
  return TIER_ORDER.indexOf(t); // 0..4
}

export function getBullOutTarget(tier: Tier, level: number): number {
  return BULL_OUT_TARGETS[tier][level - 1];
}

// --- XP OUTCOME --------------------------------------------------------------

export function computeBullOutXpOutcome(
  drill: DrillRankState,
  result: BullOutResultInput
): XpOutcome {
  const target = getBullOutTarget(drill.tier, drill.level);

  if (result.aborted) {
    // Abort = hard loss
    return {
      outcome: "aborted",
      deltaDrill: -100,
      deltaCategory: -60,
      deltaOverall: -30
    };
  }

  if (!target || target <= 0) {
    return {
      outcome: "soft_loss",
      deltaDrill: -20,
      deltaCategory: -12,
      deltaOverall: -6
    };
  }

  const R = result.score / target;

  let outcome: XpOutcome["outcome"];
  let deltaDrill: number;

  if (R < 0.5) {
    outcome = "hard_loss";
    deltaDrill = -100;
  } else if (R < 1.0) {
    outcome = "soft_loss";
    deltaDrill = -20;
  } else if (R < 1.25) {
    outcome = "win";
    deltaDrill = 200;
  } else {
    outcome = "strong_win";
    deltaDrill = 260;
  }

  const deltaCategory = Math.round(0.6 * deltaDrill);
  const deltaOverall = Math.round(0.3 * deltaDrill);

  return { outcome, deltaDrill, deltaCategory, deltaOverall };
}

// --- APPLY DRILL XP & RANK ---------------------------------------------------

export function applyDrillXp(
  drill: DrillRankState,
  delta: number
): DrillRankState {
  let ti = tierIndex(drill.tier);
  let level = drill.level;
  let xpInLevel = drill.xpInLevel + delta;
  let xpPerLevel = XP_PER_LEVEL_BY_TIER[drill.tier];

  // prevent below 0
  if (xpInLevel < 0) xpInLevel = 0;

  // rank up only (no rank-down for now)
  while (xpInLevel >= xpPerLevel && (ti < TIER_ORDER.length - 1 || level < 5)) {
    xpInLevel -= xpPerLevel;
    level += 1;
    if (level > 5) {
      level = 1;
      ti = Math.min(ti + 1, TIER_ORDER.length - 1);
    }
    xpPerLevel = XP_PER_LEVEL_BY_TIER[TIER_ORDER[ti]];
  }

  return {
    ...drill,
    tier: TIER_ORDER[ti],
    level,
    xpInLevel
  };
}

// --- CATEGORY & OVERALL PROGRESS (NORMALISED) --------------------------------

export function drillToProgress(drill: DrillRankState): number {
  const ti = tierIndex(drill.tier); // 0..4
  const li = drill.level - 1;       // 0..4
  const xpPerLevel = XP_PER_LEVEL_BY_TIER[drill.tier];
  const fracLevel = xpPerLevel > 0 ? drill.xpInLevel / xpPerLevel : 0;
  const totalSteps = ti * 5 + li + fracLevel; // 0..25
  return totalSteps / 25; // 0..1
}

export function categoryProgress(drills: DrillRankState[]): number {
  if (!drills.length) return 0;
  const sum = drills.reduce((acc, d) => acc + drillToProgress(d), 0);
  return sum / drills.length;
}

export function overallProgress(categoryProgs: number[]): number {
  if (!categoryProgs.length) return 0;
  const sum = categoryProgs.reduce((acc, p) => acc + p, 0);
  return sum / categoryProgs.length;
}

export function progressToRank(p: number): {
  tier: Tier;
  level: number;
  xpInLevel: number;
  xpPerLevel: number;
} {
  const clamped = Math.max(0, Math.min(0.9999, p));
  const total = clamped * 25;
  const stepIndex = Math.floor(total); // 0..24
  const frac = total - stepIndex;

  const ti = Math.floor(stepIndex / 5);
  const li = stepIndex % 5;

  const tier = TIER_ORDER[ti];
  const level = li + 1;
  const xpPerLevel = XP_PER_LEVEL_BY_TIER[tier];
  const xpInLevel = frac * xpPerLevel;

  return { tier, level, xpInLevel, xpPerLevel };
}
