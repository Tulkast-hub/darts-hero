import React from "react";
import { useNavigate } from "react-router-dom";

import { useI18n } from "../i18n/I18nProvider";

type Props = {
  keyName: string;
  title: string;
  blurb: string;
};

export default function DrillCard({
  keyName,
  title,
  blurb,
}: Props) {
  const nav = useNavigate();
  const { t } = useI18n();

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
    </div>
  );
}