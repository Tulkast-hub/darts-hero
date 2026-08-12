import React from "react";
import { useI18n } from "../i18n/I18nProvider";

import BullOut from "./BullOut";
import DoublesWorld from "./DoublesWorld";
import ThreeDartCheckouts from "./ThreeDartCheckouts";
import Checkout121 from "./Checkout121";
import Checkout41 from "./Checkout41";
import Finish25 from "./Finish25";
import T20Scoring from "./T20Scoring";
import ScoringLadder from "./ScoringLadder";
import ScoringBingo from "./ScoringBingo";

import type { XpCategory, Tier } from "../xp/types";

export type DrillKey =
  | "bull_out"
  | "doubles_world"
  | "three_dart_checkouts"
  | "checkouts_popular_leaves"
  | "checkout_121"
  | "checkout_41_up"
  | "checkout_25_repeat"
  | "t20_scoring"
  | "scoring_ladder"
  | "scoring_bingo";

export type DrillComponentProps = {
  onFinish: (result: { payload: any; win: boolean }) => void;
  disabled?: boolean;
  tier: Tier;
  level: number;
  /** Optional: used by Versus Mode to swap players after 3 darts */
  onDartsUsed?: (count: number) => void;
  /** Optional: Versus Mode can request the drill to undo N actions */
  externalUndo?: { token: number; steps: number };
};

export type DrillDef = {
  key: DrillKey;
  title: string;
  blurb: string;
  category: XpCategory;
  Component: React.ComponentType<DrillComponentProps>;
  Rules: React.FC;
};

// --- Rules blocks (kept as small components so we can embed JSX cleanly)
const RulesBullOut: React.FC = () => {
  const { t } = useI18n();
  return (
    <>
      <p>{t("• Outer bull = 1 point, inner bull = 2 points.")}</p>
      <p>{t("• You have 90 darts to hit your goal.")}</p>
      <p>{t("• Higher ranks can penalise complete misses.")}</p>
    </>
  );
};

const RulesDoublesWorld: React.FC = () => {
  const { t } = useI18n();
  return (
    <>
      <p>{t("• You play doubles or singles in numeric order: D1 → D2 → … → D20.")}</p>
      <p>{t("• Each number starts with a base amount of darts (depends on rank). Any unused darts carry forward.")}</p>
      <p>{t("• Hit types by rank vary: lower ranks allow hits anywhere in the wedge; higher ranks require stricter segments.")}</p>
      <p>{t("• After D20, you revisit only the missed sections in order using any remaining darts.")}</p>
      <p>{t("• You win if you clear all 20 doubles before running out of darts.")}</p>
    </>
  );
};

const RulesThreeDartCheckouts: React.FC = () => {
  const { t } = useI18n();
  return (
    <>
      <p>{t("• You play the four most common finishing leaves: 40 → 32 → 36 → 24.")}</p>
      <p>{t("• You need to checkout each number within one visit. Normal rules apply.")}</p>
      <p>{t("• Each section has a number of visits depending on the rank and a random checkout is always chosen.")}</p>
      <p>{t("• Each visit, choose whether you successfully checked out or missed.")}</p>
      <p>{t("• Your goal is to reach a total number of checkouts based on rank.")}</p>
      <p>{t("• Low ranks can finish on single; Silver+ finish only with a double.")}</p>
    </>
  );
};

const RulesCheckout121: React.FC = () => {
  const { t } = useI18n();
  return (
    <>
      <p>{t("• Start at 121 with 3 darts per visit and you have 3 visits per checkout.")}</p>
      <p>{t("• If you checkout the current total, your next target increases by +5.")}</p>
      <p>{t("• If you miss (or bust), your next target decreases by −1.")}</p>
      <p>{t("• Enter the remaining score after each visit. Remaining 0 counts as a checkout.")}</p>
      <p>{t("• Your rank goal is based on finishing over a certain total (for example >140, >150, >160, >170).")}</p>
      <p>{t("• At higher ranks you must also reach key thresholds within the first 6 darts.")}</p>
      <p>{t("• The game ends as soon as you hit your rank goal, or if you run out of visits.")}</p>
    </>
  );
};

const RulesCheckout41Up: React.FC = () => {
  const { t } = useI18n();
  return (
    <>
      <p>{t("• Start at 41 with 3 darts per visit.")}</p>
      <p>{t("• If you checkout the current number, you move up to the next one.")}</p>
      <p>{t("• If you miss, you stay on the same number and try again next visit.")}</p>
      <p>{t("• Your rank goal is to finish above a certain target (for example >60, >70, >75, >85).")}</p>
      <p>{t("• The game ends as soon as you hit the goal checkout, or after 70 throws.")}</p>
    </>
  );
};

const RulesCheckout25Repeat: React.FC = () => {
  const { t } = useI18n();
  return (
    <>
      <p>{t("• You always start from 25 points and have 3 darts per visit.")}</p>
      <p>{t("• Each visit counts as one throw. You have 40 throws in total.")}</p>
      <p>{t("• After each visit, record whether you successfully finished 25 or missed.")}</p>
      <p>{t("• Lower ranks: single odd out (even first, then odd to finish 25).")}</p>
      <p>{t("• Higher ranks: any valid double out finish on 25 counts.")}</p>
      <p>{t("• Your goal is to reach the required number of checkouts before running out of throws.")}</p>
    </>
  );
};

const RulesScoringLadder: React.FC = () => {
  const { t } = useI18n();
  return (
    <>
      <p>{t("You’re climbing a scoring ladder in 40 throws.")}</p>
      <p>{t("Below the first threshold you go down, then stay, then up 1, then up 2.")}</p>
      <p>{t("Reach the target number of steps to win.")}</p>
    </>
  );
};

const RulesScoringBingo: React.FC = () => {
  const { t } = useI18n();
  return (
    <>
      <p>{t("• You have 30 throws to complete a 3×3 bingo grid of exact scores.")}</p>
      <p>{t("• Tap the score you hit to mark progress.")}</p>
      <p>{t("• Complete all targets to win.")}</p>
    </>
  );
};

const RulesT20Scoring: React.FC = () => {
  const { t } = useI18n();
  return (
    <>
      <p>{t("• You throw 100 visits at 20.")}</p>
      <p>{t("• Each visit earns ladder points based on your score.")}</p>
      <p>{t("• Your rank goal is a total number of ladder points (varies by tier/level).")}</p>
      <p>{t("• The game ends as soon as you hit your point goal, or after 100 throws.")}</p>
    </>
  );
};

export const DRILLS: DrillDef[] = [
  {
    key: "bull_out",
    title: "Bull Out",
    blurb: "Score on bull with limited darts.",
    category: "doubles",
    Component: BullOut,
    Rules: RulesBullOut,
  },
  {
    key: "doubles_world",
    title: "Doubles Around the World",
    blurb: "Hit D1→D20 in order.",
    category: "doubles",
    Component: DoublesWorld,
    Rules: RulesDoublesWorld,
  },
  {
    key: "three_dart_checkouts",
    title: "3-Dart Checkouts",
    blurb: "Practice 40, 32, 36 and 24 with 3-dart checkout attempts.",
    category: "finishing",
    Component: ThreeDartCheckouts,
    Rules: RulesThreeDartCheckouts,
  },
  {
    key: "checkout_121",
    title: "121+ Ladder",
    blurb: "Try to checkout 121+ in 9 darts, step down on fail.",
    category: "finishing",
    Component: Checkout121,
    Rules: RulesCheckout121,
  },
  {
    key: "checkout_41_up",
    title: "41+ Checkout Ladder",
    blurb: "Finish 41+ with 3 darts per visit.",
    category: "finishing",
    Component: Checkout41,
    Rules: RulesCheckout41Up,
  },
  {
    key: "checkout_25_repeat",
    title: "Finish 25",
    blurb: "Repeat 25 finishes in 3-dart visits.",
    category: "finishing",
    Component: Finish25,
    Rules: RulesCheckout25Repeat,
  },
  {
    key: "t20_scoring",
    title: "T20 Scoring",
    blurb: "Score target points with limited throws.",
    category: "scoring",
    Component: T20Scoring,
    Rules: RulesT20Scoring,
  },
  {
    key: "scoring_ladder",
    title: "Scoring Ladder",
    blurb: "Climb targets with limited darts.",
    category: "scoring",
    Component: ScoringLadder,
    Rules: RulesScoringLadder,
  },
  {
    key: "scoring_bingo",
    title: "Scoring Bingo",
    blurb: "Hit all tiles to win.",
    category: "scoring",
    Component: ScoringBingo,
    Rules: RulesScoringBingo,
  },
];

const DRILL_ALIASES: Record<string, DrillKey> = {
  // Legacy keys / URLs
  "checkout_41": "checkout_41_up",
  "checkout_41_plus": "checkout_41_up",
  "finish_25": "checkout_25_repeat",
  "checkout_25": "checkout_25_repeat",
  "three_dart_checkouts": "three_dart_checkouts",
  "checkouts_popular_leaves": "three_dart_checkouts",
};

export function getDrillDef(key: string | undefined | null): DrillDef | undefined {
  if (!key) return undefined;
  const resolved = (DRILL_ALIASES[key] ?? (key as DrillKey));
  return DRILLS.find((d) => d.key === resolved);
}

export function drillsByCategory(category: XpCategory): DrillDef[] {
  return DRILLS.filter((d) => d.category === category);
}
