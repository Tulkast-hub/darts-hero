import React from "react";
import { useI18n } from "../i18n/I18nProvider";

export default function StatsPage(){
  const { t } = useI18n();
  return (
    <div className="page">
      <h2 className="page-title">{t("Stats (Wireframe)")}</h2>
      <div className="card">
        <p className="muted">{t("30-day charts will live here.")}</p>
      </div>
    </div>
  );
}