export type XpCategory = "scoring" | "finishing" | "doubles" | "bull" | "other";

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

/**
 * Universal, future-proof result contract used for XP calculation.
 * Drills should provide as much of this as they can.
 */

export type DrillObjective = {
  label: string;
  current?: number;
  target?: number;
  unit?: string;
};

export type DrillResult = {
  game_key: string;
  category: XpCategory;

  tier: Tier;
  level: number; // 1..5

  win: boolean;
  aborted?: boolean;

  throws_used?: number;
  max_throws?: number;

  objective?: DrillObjective;
  progress?: number;

  /**
   * Drill-specific stats (for results rendering / future XP tuning).
   */
  stats?: Record<string, number | string | boolean | null>;
};

export type XpAward = {
  total: number;
  byCategory: Record<XpCategory, number>;
  breakdown: Array<{ label: string; xp: number }>;
  multiplier: number;
};
