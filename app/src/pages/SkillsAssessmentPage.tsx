import React from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";

export default function SkillsAssessmentPage() {
  const { t } = useI18n();
  const nav = useNavigate();

  const tests = [
    {
      number: 1,
      title: "Around the World – Doubles",
      description: "Measure your overall doubles accuracy.",
    },
    {
      number: 2,
      title: "101 Double Out",
      description: "Complete 101 five times.",
    },
    {
      number: 3,
      title: "170 Finish",
      description: "Play five attempts from 170.",
    },
    {
      number: 4,
      title: "Scoring",
      description: "Play 10 scoring visits of three darts.",
    },
    {
      number: 5,
      title: "501",
      description: "Play five complete 501 legs.",
    },
  ];

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="title">{t("Skills Assessment")}</div>

          <div className="subtitle">
            <h2>{t("Test your current level")}</h2>
            <p>
              {t(
                "Complete five short tests to build your darts skill profile."
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="stack-wrap">
        <div className="stack-list">
          {tests.map((test) => (
            <div key={test.number} className="category-card card">
              <div className="category-title">
                {test.number}. {t(test.title)}
              </div>

              <div className="muted">{t(test.description)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          className="btn"
          style={{ width: "100%" }}
          onClick={() => nav("/skills-assessment/doubles")}
        >
          {t("Start assessment")}
        </button>
      </div>
    </div>
  );
}