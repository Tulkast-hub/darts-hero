import type { Tier } from "./types";

export const TIERS: Tier[] = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

export const XP_CAPS = {
  drillTierMax: 2000,    // XP to go from rank 1 -> 5 within one tier (=> 400 per rank)
  categoryTierMax: 6000,
  overallTierMax: 18000,
} as const;

export function promoteTier(base: Tier, steps: number): Tier {
  const i = TIERS.indexOf(base);
  if (i === -1) return base;
  return TIERS[Math.min(TIERS.length - 1, i + Math.max(0, steps))];
}

export function getRankStateFromXp(xp: number, tierMax: number, baseTier: Tier = "Bronze") {
  const rankSize = tierMax / 5;
  const safeXp = Math.max(0, xp);

  const rawRank = Math.floor(safeXp / rankSize) + 1; // 1..infinite
  const tierSteps = Math.floor((rawRank - 1) / 5);
  const level = ((rawRank - 1) % 5) + 1; // 1..5
  const tier = promoteTier(baseTier, tierSteps);

  const xpInRank = safeXp - Math.floor((rawRank - 1) * rankSize);

  const pct = rankSize > 0 ? Math.max(0, Math.min(1, xpInRank / rankSize)) : 0;

  return { tier, level, xpInRank, rankSize, pct };
}
