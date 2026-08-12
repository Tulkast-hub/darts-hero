import React from "react";
import { useI18n } from "../i18n/I18nProvider";

export default function ProfilePage(){
  const { t } = useI18n();
  return (
    <div className="page">
      <h2 className="page-title">{t("Profile (Wireframe)")}</h2>
      <div className="card">
        <p className="muted">{t("Username, avatar, global averages, etc.")}</p>
      </div>
    </div>
  );
}