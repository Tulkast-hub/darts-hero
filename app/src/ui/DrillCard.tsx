import React from "react";
import { useNavigate } from "react-router-dom";

import { useI18n } from "../i18n/I18nProvider";
import type { StatCategory } from "../drills/registry";

type Props = {
  keyName: string;
  title: string;
  blurb: string;
  xpWin?: number;
  xpLoss?: number;
  statCategories?: StatCategory[];
};

const STAT_LABELS: Record<StatCategory, string> = {
  doubles: "Doubles",
  scoring: "Scoring",
  setup: "Setup",
  finishing: "Finishing",
  overallAverage: "Average",
  consistency: "Consistency",
};

export default function DrillCard({
  keyName,
  title,
  blurb,
  xpWin,
  xpLoss,
  statCategories = [],
}: Props) {
  const nav = useNavigate();
  const { t } = useI18n();

  const hasXp =
    typeof xpWin === "number" &&
    typeof xpLoss === "number";

  const hasStats =
    statCategories.length > 0;

  return (
    <div
      className="drill-card"
      onClick={() => nav(`/drill/${keyName}`)}
    >
      <div className="drill-head">
        <strong>{t(title)}</strong>
      </div>

      <p className="muted">
        {t(blurb)}
      </p>

      {hasXp && (
        <div className="drill-card__xp">
          <span className="drill-card__xp-win">
            +{xpWin} XP
          </span>

          <span className="drill-card__xp-loss">
            -{xpLoss} XP
          </span>
        </div>
      )}

      {hasStats && (
        <div className="drill-card__stats">
          {statCategories.map((category) => (
            <span
              key={category}
              className="drill-card__stat-pill"
            >
              {t(STAT_LABELS[category])}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}