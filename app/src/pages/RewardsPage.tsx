import React from "react";
import { useI18n } from "../i18n/I18nProvider";

export default function RewardsPage(){
  const { t } = useI18n();
  return (
    <div className="page">
      <h2 className="page-title">{t("Rewards (Placeholder)")}</h2>
      <div className="grid">
        <div className="card"><strong>{t("First Steps")}</strong><div className="muted">{t("Complete your first session")}</div></div>
        <div className="card"><strong>{t("Sharp Shooter")}</strong><div className="muted">{t("Accuracy ≥ 70% on diff ≥ 3")}</div></div>
        <div className="card"><strong>{t("On a Roll")}</strong><div className="muted">{t("3-day streak")}</div></div>
      </div>
    </div>
  );
}