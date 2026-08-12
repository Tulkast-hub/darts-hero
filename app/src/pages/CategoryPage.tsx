import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import DrillCard from "../ui/DrillCard";
import RankBadge from "../ui/RankBadge";
import XPBar from "../ui/XPBar";
import { useXpStore } from "../xp/useXpStore";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
import type { Tier, XpCategory } from "../xp/types";
import { GAME_XP, DEFAULT_GAME_XP } from "../xp/gameXp";
import { getDrillDef, type DrillKey } from "../drills/registry";
import { useI18n } from "../i18n/I18nProvider";

// Bull should NOT be its own category track.
// If someone ever hits /category/bull, we map it into doubling.
function slugToCategory(slug: string): XpCategory {
  switch (slug) {
    case "scoring":
      return "scoring";
    case "doubling":
      return "doubles";
    case "finishing":
      return "finishing";
    case "bull":
      return "doubles"; // collapse bull into doubling
    default:
      return "other";
  }
}

export default function CategoryPage() {
  const { t } = useI18n();
  const { slug = "" } = useParams();
  const xpState = useXpStore((s) => s.state);

  // Category pages are view groups (not necessarily 1:1 with XP categories)
  // Use canonical drill keys here where possible.
  const groups: Record<string, DrillKey[]> = {
    scoring: ["t20_scoring", "scoring_ladder", "scoring_bingo"],
    doubling: ["bull_out", "doubles_world", "checkout_25_repeat"],
    finishing: ["three_dart_checkouts", "checkout_121", "checkout_41_up"],
  };

  let drillKeys: DrillKey[] = [];
  let title = t("Category");
  switch (slug) {
    case "scoring":
      drillKeys = groups.scoring;
      title = t("Scoring");
      break;
    case "doubling":
      drillKeys = groups.doubling;
      title = t("Doubling");
      break;
    case "finishing":
      drillKeys = groups.finishing;
      title = t("Finishing");
      break;
    // if user visits /category/bull, show doubling group (since bull is folded in)
    case "bull":
      drillKeys = groups.doubling;
      title = t("Doubling");
      break;
    default:
      title = t("Category");
  }

  const cat = slugToCategory(slug);
  const raw = xpState.categoryXp || {};
const categoryXp = Math.max(
  0,
  cat === "doubles"
    ? (raw.doubles ?? 0) + (raw.bull ?? 0)
    : (raw[cat] ?? 0)
);

  const categoryRank = useMemo(
    () => getRankStateFromXp(categoryXp, XP_CAPS.categoryTierMax, "Bronze"),
    [categoryXp]
  );

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <RankBadge tier={categoryRank.tier} level={categoryRank.level} />
      </div>

      {/* Category XP progress bar (this is what was “empty”) */}
      <div style={{ marginTop: 10 }}>
        <XPBar
          label={`${t("Category XP")} · ${title}`}
          value={categoryXp}
          max={XP_CAPS.categoryTierMax}
        />
      </div>

      <div style={{ marginTop: 14 }} className="grid">
        {drillKeys.map((keyName) => {
          const d = getDrillDef(keyName);
          if (!d) return null;

          // Always use canonical key for XP + routing.
          // This prevents legacy keys from creating separate drill XP tracks.
          const canonicalKey = (d.key ?? keyName) as DrillKey;

          const drillXp = Math.max(0, xpState.drillXp?.[canonicalKey] ?? 0);
          const r = getRankStateFromXp(drillXp, XP_CAPS.drillTierMax, "Bronze");

          const xpCfg = GAME_XP[canonicalKey] ?? GAME_XP[keyName] ?? DEFAULT_GAME_XP;

          return (
            <DrillCard
              key={canonicalKey}
              keyName={canonicalKey}
              title={d.title}
              blurb={d.blurb}
              tier={r.tier as Tier}
              level={r.level}
              xpWin={xpCfg.win}
              xpLose={xpCfg.loss}
            />
          );
        })}
      </div>
    </div>
  );
}