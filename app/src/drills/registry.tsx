import React from "react";

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
const RulesBullOut: React.FC = () => (
  <>
    <p>• Outer bull = 1 point, inner bull = 2 points.</p>
    <p>• You have a limited number of darts to maximise your score.</p>
    <p>• Higher ranks can penalise complete misses.</p>
  </>
);

const RulesDoublesWorld: React.FC = () => (
  <>
    <p>
      • You play doubles in <strong>numeric order</strong>: D1 → D2 → … → D20.
    </p>
    <p>
      • Each number starts with a base amount of darts (depends on rank). Any unused darts carry forward.
    </p>
    <p>
      • Hit types by rank: lower ranks allow hits anywhere in the wedge, mid ranks focus on the fat single,
      and Silver+ require the <strong>double ring only</strong>.
    </p>
    <p>• After D20, you revisit only the missed sections in order using any remaining darts.</p>
    <p>
      • You <strong>win</strong> if you clear all 20 doubles before running out of darts.
    </p>
  </>
);

const RulesThreeDartCheckouts: React.FC = () => (
  <>
    <p>• You play the four most common finishing leaves: 40 → 32 → 36 → 24.</p>
    <p>• Each score gives you 18 darts (6 throws of 3 darts).</p>
    <p>• Each throw, choose whether you successfully checked out or missed.</p>
    <p>• Your goal is to reach a total number of checkouts based on rank.</p>
    <p>• Higher ranks must finish on a double.</p>
  </>
);

const RulesCheckout121: React.FC = () => (
  <>
    <p>• Start at 121 with 3 darts per visit.</p>
    <p>• If you checkout the current total, your next target increases by +5.</p>
    <p>• If you miss (or bust), your next target decreases by −1.</p>
    <p>
      • Enter the remaining score after each visit. Remaining 0 with a single or double out counts as a
      checkout.
    </p>
    <p>
      • Your rank goal is based on finishing over a certain total (for example &gt;140, &gt;150, &gt;160,
      &gt;170).
    </p>
    <p>
      • At higher ranks you must also reach key thresholds (like &gt;140 / &gt;150 / &gt;160) within the first
      6 darts.
    </p>
    <p>• The game ends as soon as you hit your rank goal, or after 201 darts.</p>
  </>
);

const RulesCheckout41Up: React.FC = () => (
  <>
    <p>• Start at 41 with 3 darts per visit.</p>
    <p>• If you checkout the current number, you move up to the next one.</p>
    <p>• If you miss, you stay on the same number and try again next visit.</p>
    <p>
      • Your rank goal is to finish above a certain target (for example &gt;60, &gt;70, &gt;75, &gt;85).
    </p>
    <p>• The game ends as soon as you hit the goal checkout, or after 201 darts.</p>
  </>
);

const RulesCheckout25Repeat: React.FC = () => (
  <>
    <p>• You always start from 25 and have 3 darts per visit.</p>
    <p>• For each visit, record whether you finished 25 or missed.</p>
    <p>• You have 90 darts in total (30 visits of 3 darts).</p>
    <p>• Lower ranks focus on volume, higher ranks require more finishes.</p>
    <p>• The drill always runs the full 90 darts, then your result is evaluated.</p>
  </>
);

const RulesScoringLadder: React.FC = () => (
  <>
    <p>You’re climbing a scoring ladder in 30 throws.</p>
    <p>Below the first threshold you go down, then stay, then up 1, then up 2.</p>
    <p>Reach the target number of steps to win.</p>
  </>
);

const RulesScoringBingo: React.FC = () => (
  <>
    <p>• You have 30 throws to complete a 3×3 bingo grid of exact scores.</p>
    <p>• Tap the score you hit to mark progress.</p>
    <p>• Complete all targets to win.</p>
  </>
);

const RulesT20Scoring: React.FC = () => (
  <>
    <p>• You throw 100 visits at 20.</p>
    <p>• Each visit earns ladder points based on your score.</p>
    <p>• Your rank goal is a total number of ladder points (varies by tier/level).</p>
    <p>• The game ends as soon as you hit your point goal, or after 100 throws.</p>
  </>
);

export const DRILLS: DrillDef[] = [
  {
    key: "bull_out",
    title: "Bull Out",
    blurb: "Score on bull with limited darts.",
    category: "bull",
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
    title: "Finish 25 (Volume)",
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
