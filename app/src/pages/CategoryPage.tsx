import React, { useMemo } from "react";
import { useParams } from "react-router-dom";

import DrillCard from "../ui/DrillCard";
import RankBadge from "../ui/RankBadge";
import XPBar from "../ui/XPBar";

import { useXpStore } from "../xp/useXpStore";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
import type { XpCategory } from "../xp/types";

import {
  getDrillDef,
  type DrillKey,
} from "../drills/registry";

import { useI18n } from "../i18n/I18nProvider";

function slugToCategory(
  slug: string
): XpCategory {
  switch (slug) {
    case "scoring":
      return "scoring";

    case "doubling":
      return "doubles";

    case "finishing":
      return "finishing";

    default:
      return "other";
  }
}

export default function CategoryPage() {
  const { t } = useI18n();

  const {
    slug = "",
  } = useParams();

  const xpState = useXpStore(
    (s) => s.state
  );

  const groups: Record<
    string,
    DrillKey[]
  > = {
    scoring: [
      "t20_scoring",
      "scoring_ladder",
      "scoring_bingo",
    ],

    doubling: [
      "bull_out",
      "doubles_world",
      "checkout_25_repeat",
    ],

    finishing: [
      "three_dart_checkouts",
      "checkout_121",
      "checkout_41_up",
    ],
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

    default:
      title = t("Category");
      break;
  }

  const category =
    slugToCategory(slug);

  const categoryXp = Math.max(
    0,
    xpState.categoryXp?.[category] ?? 0
  );

  const categoryRank = useMemo(
    () =>
      getRankStateFromXp(
        categoryXp,
        XP_CAPS.categoryTierMax,
        "Bronze"
      ),
    [categoryXp]
  );

  return (
    <div className="page">
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>
          {title}
        </h2>

        <RankBadge
          tier={categoryRank.tier}
          level={categoryRank.level}
        />
      </div>

      <div
        style={{
          marginTop: 10,
        }}
      >
        <XPBar
          label={`${t("Category XP")} · ${title}`}
          value={categoryXp}
          max={XP_CAPS.categoryTierMax}
        />
      </div>

      <div
        className="grid"
        style={{
          marginTop: 14,
        }}
      >
        {drillKeys.map((keyName) => {
          const drill =
            getDrillDef(keyName);

          if (!drill) {
            return null;
          }

          const canonicalKey =
            (drill.key ??
              keyName) as DrillKey;

          return (
          <DrillCard
            key={canonicalKey}
            keyName={canonicalKey}
            title={drill.title}
            blurb={drill.blurb}
          />
          );
        })}
      </div>
    </div>
  );
}