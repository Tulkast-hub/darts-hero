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

  const setDoublesResult = useAssessmentStore(
    (state) => state.setDoublesResult
  );
  
  const setCheckout101Result = useAssessmentStore(
    (state) => state.setCheckout101Result
  );
  
  const setFinish170Result = useAssessmentStore(
    (state) => state.setFinish170Result
  );
  
  const setScoringResult = useAssessmentStore(
    (state) => state.setScoringResult
  );
  
  const setGame501Result = useAssessmentStore(
    (state) => state.setGame501Result
  );

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
      {import.meta.env.DEV && (
  <button
    type="button"
    className="btn outline"
    style={{
      width: "100%",
      marginTop: 12,
    }}
    onClick={loadTestAssessment}
  >
    Load test results
  </button>
)}
    </div>
  );
}

function loadTestAssessment() {
  setDoublesResult({
    dartsThrown: 42,
    doublesHit: 20,
    percentage: 47.6,
  });

  setCheckout101Result({
    legs: [
      {
        darts: 6,
        visits: 2,
        checkoutDarts: 3,
        doubleDarts: 2,
        checkoutDoubleDarts: 1,
      },
      {
        darts: 5,
        visits: 2,
        checkoutDarts: 2,
        doubleDarts: 3,
        checkoutDoubleDarts: 2,
      },
      {
        darts: 7,
        visits: 3,
        checkoutDarts: 1,
        doubleDarts: 2,
        checkoutDoubleDarts: 1,
      },
      {
        darts: 6,
        visits: 2,
        checkoutDarts: 3,
        doubleDarts: 4,
        checkoutDoubleDarts: 2,
      },
      {
        darts: 5,
        visits: 2,
        checkoutDarts: 2,
        doubleDarts: 2,
        checkoutDoubleDarts: 1,
      },
    ],
    totalDarts: 29,
    averageDarts: 5.8,
  });

  setFinish170Result({
    attempts: [
      {
        darts: 6,
        visits: 2,
        visitScores: [110, 60],
        checkoutDarts: 3,
        doubleDarts: 2,
        checkoutDoubleDarts: 1,
      },
      {
        darts: 7,
        visits: 3,
        visitScores: [100, 38, 32],
        checkoutDarts: 1,
        doubleDarts: 3,
        checkoutDoubleDarts: 1,
      },
      {
        darts: 6,
        visits: 2,
        visitScores: [96, 74],
        checkoutDarts: 3,
        doubleDarts: 2,
        checkoutDoubleDarts: 1,
      },
      {
        darts: 8,
        visits: 3,
        visitScores: [85, 45, 40],
        checkoutDarts: 2,
        doubleDarts: 4,
        checkoutDoubleDarts: 2,
      },
      {
        darts: 7,
        visits: 3,
        visitScores: [95, 43, 32],
        checkoutDarts: 1,
        doubleDarts: 3,
        checkoutDoubleDarts: 1,
      },
    ],
    totalDarts: 34,
    averageDarts: 6.8,
  });

  setScoringResult({
    visits: [
      100,
      85,
      81,
      60,
      96,
      78,
      83,
      59,
      95,
      79,
    ],
    totalScore: 816,
    averageScore: 81.6,
  });

  setGame501Result({
    legs: [
      {
        darts: 18,
        visits: 6,
        visitScores: [100, 81, 95, 85, 100, 40],
        checkoutDarts: 3,
        doubleDarts: 2,
        checkoutDoubleDarts: 1,
      },
      {
        darts: 19,
        visits: 7,
        visitScores: [85, 100, 81, 96, 79, 40, 20],
        checkoutDarts: 1,
        doubleDarts: 3,
        checkoutDoubleDarts: 1,
      },
      {
        darts: 17,
        visits: 6,
        visitScores: [100, 100, 85, 96, 80, 40],
        checkoutDarts: 2,
        doubleDarts: 2,
        checkoutDoubleDarts: 1,
      },
      {
        darts: 20,
        visits: 7,
        visitScores: [81, 85, 100, 60, 95, 40, 40],
        checkoutDarts: 2,
        doubleDarts: 4,
        checkoutDoubleDarts: 2,
      },
      {
        darts: 15,
        visits: 5,
        visitScores: [100, 100, 100, 101, 100],
        checkoutDarts: 3,
        doubleDarts: 1,
        checkoutDoubleDarts: 1,
      },
    ],
    totalDarts: 89,
    totalScore: 2505,
    threeDartAverage: Number(
      ((2505 / 89) * 3).toFixed(2)
    ),
  });

  nav("/skills-assessment/results");
}