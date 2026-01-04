// src/xp/gameXp.ts
export type GameXpConfig = {
  win: number; // positive magnitude shown on card
  loss: number; // positive magnitude shown on card (engine applies negative)
};
// Helper to keep it consistent
const W = (win: number, loss: number): GameXpConfig => ({ win, loss });

/**
 * Single source of truth for per-game XP values.
 * - These values should match what you show on the drill cards.
 * - Abort counts as loss (engine treats it as loss-like).
 */
export const GAME_XP: Record<string, GameXpConfig> = {
  // -----------------
  // DOUBLING
  // -----------------
  bull_out: W(120, 120),
  doubles_world: W(110, 55),
  checkouts_popular_leaves: W(110, 55),

  // -----------------
  // SCORING
  // -----------------
  t20_scoring: W(120, 60),
  scoring_ladder: W(120, 60),
  scoring_bingo: W(120, 60),

  // -----------------
  // FINISHING
  // -----------------
  checkout_41_up: W(120, 60),
  checkout_121: W(120, 60),
  checkout_25_repeat: W(120, 60),
  three_dart_checkouts: W(110, 55),
};

// Defaults if a drill is missing from the map
export const DEFAULT_GAME_XP: GameXpConfig = W(120, 120);
  