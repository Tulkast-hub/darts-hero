import React from "react";
import { useNavigate } from "react-router-dom";

import { useI18n } from "../i18n/I18nProvider";

type Props = {
  keyName: string;
  title: string;
  blurb: string;
  xpWin?: number;
  xpLoss?: number;
};

export default function DrillCard({
  keyName,
  title,
  blurb,
  xpWin,
  xpLoss,
}: Props) {
  const nav = useNavigate();
  const { t } = useI18n();

  const hasXp =
    typeof xpWin === "number" &&
    typeof xpLoss === "number";

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
    </div>
  );
}