import React from "react";
import { useI18n } from "../../i18n/I18nProvider";

export default function Assessment170() {
  const { t } = useI18n();

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="title">
            {t("Skills Assessment")} · {t("170 Finish")}
          </div>

          <div className="subtitle">
            <h2>{t("170 Finish")}</h2>
            <p>{t("Complete five attempts starting from 170.")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}