import type { XpCategory } from "./types";

export type GameXpConfig = {
  category: XpCategory;

  /** Base XP awarded on a win (before Great Win bonus). */
  winXp: number;

  /**
   * Base XP magnitude for a loss/abort. Engine applies it as negative.
   * Example: lossXp=55 -> normal loss awards -55.
   */
  lossXp: number;

  /** Close loss threshold as progress (0..1). Default 0.7 (within 30% of objective). */
  closeLossAt?: number;

  /** Great win bonus as a fraction of winXp. Default 0.3 (+30%). */
  greatWinBonus?: number;

  /**
   * Great win efficiency threshold. Great win if used/allowed <= this.
   * Default 0.5 (<= 50% of required darts/throws).
   */
  greatWinAtOrBelow?: number;
};

export const DEFAULT_XP: GameXpConfig = {
  category: "other",
  winXp: 100,
  lossXp: 100,
  closeLossAt: 0.7,
  greatWinBonus: 0.3,
  greatWinAtOrBelow: 0.5,
};

/**
 * Per-game XP tuning. This is the single source of truth for:
 * - Engine awards (+/- XP)
 * - Card chips on the drill selection screens
 *
 * Add/adjust game keys freely.
 */
export const GAME_XP: Record<string, GameXpConfig> = {
  // Examples (edit to match your actual keys / balance)
  bull_out: { category: "doubles", winXp: 120, lossXp: 60 },
  doubles_world: { category: "doubles", winXp: 110, lossXp: 55 },
  three_dart_checkouts: { category: "doubles", winXp: 110, lossXp: 55 },

  scoring_bingo: { category: "scoring", winXp: 120, lossXp: 120 },
  scoring_ladder: { category: "scoring", winXp: 110, lossXp: 110 },
  t20_scoring: { category: "scoring", winXp: 120, lossXp: 120 },

  checkouts_popular_leaves: { category: "finishing", winXp: 120, lossXp: 120 },
};
