import React from "react";
import { useNavigate } from "react-router-dom";
import { useAssessmentStore } from "../../skills-assessment/useAssessmentStore";
import { useI18n } from "../../i18n/I18nProvider";

export default function Assessment101() {
  const { t } = useI18n();
  const nav = useNavigate();

  const doublesResult = useAssessmentStore(
    (state) => state.results.doubles
  );

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="title">
            {t("Skills Assessment")} · {t("101 Double Out")}
          </div>

          <div className="subtitle">
            <h2>{t("101 Double Out")}</h2>
            <p>
              {t(
                "Complete 101 five times. Each leg must finish on a double."
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="card">
        <h3>{t("Doubles result received")}</h3>

        {doublesResult ? (
          <>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">{t("Darts thrown")}</div>
                <div className="pill-value">
                  {doublesResult.dartsThrown}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">{t("Doubles hit")}</div>
                <div className="pill-value">
                  {doublesResult.doublesHit}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">{t("Accuracy")}</div>
                <div className="pill-value">
                  {doublesResult.percentage}%
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="muted">
            {t("No doubles assessment result found.")}
          </p>
        )}

        <button
          type="button"
          className="btn outline"
          style={{ width: "100%", marginTop: 20 }}
          onClick={() => nav("/skills-assessment")}
        >
          {t("Back to assessment")}
        </button>
      </div>
    </div>
  );
}