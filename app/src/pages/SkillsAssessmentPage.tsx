import React from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import { useAssessmentStore } from "../skills-assessment/useAssessmentStore";

export default function SkillsAssessmentPage() {
  const { t } = useI18n();
  const nav = useNavigate();

  const resetAssessment = useAssessmentStore(
    (state) => state.resetAssessment
  );

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

  function startAssessment() {
    resetAssessment();
    nav("/skills-assessment/doubles");
  }

  function loadTestAssessment() {
    /*
     * Doubles
     */
    setDoublesResult({
      dartsThrown: 42,
      doublesHit: 20,
      percentage: 47.6,
    });

    /*
     * 101 Double Out
     */
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

    /*
     * 170 Finish
     */
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

    /*
     * 10 Scoring Visits
     */
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

    /*
     * 501
     */
    setGame501Result({
      legs: [
        {
          darts: 18,
          visits: 6,
          visitScores: [
            100,
            81,
            95,
            85,
            100,
            40,
          ],
          checkoutDarts: 3,
          doubleDarts: 2,
          checkoutDoubleDarts: 1,
        },
        {
          darts: 19,
          visits: 7,
          visitScores: [
            85,
            100,
            81,
            96,
            79,
            40,
            20,
          ],
          checkoutDarts: 1,
          doubleDarts: 3,
          checkoutDoubleDarts: 1,
        },
        {
          darts: 17,
          visits: 6,
          visitScores: [
            100,
            100,
            85,
            96,
            80,
            40,
          ],
          checkoutDarts: 2,
          doubleDarts: 2,
          checkoutDoubleDarts: 1,
        },
        {
          darts: 20,
          visits: 7,
          visitScores: [
            81,
            85,
            100,
            60,
            95,
            40,
            40,
          ],
          checkoutDarts: 2,
          doubleDarts: 4,
          checkoutDoubleDarts: 2,
        },
        {
          darts: 15,
          visits: 5,
          visitScores: [
            100,
            100,
            100,
            101,
            100,
          ],
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

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="title">
            {t("Skills Assessment")}
          </div>

          <div className="subtitle">
            <h2>
              {t("Find your current darts level")}
            </h2>

            <p>
              {t(
                "Complete five short tests covering doubles, finishing, scoring and match play."
              )}
            </p>
          </div>
        </div>
      </section>

      <div
        className="card"
        style={{
          marginTop: 16,
        }}
      >
        <h3>
          {t("Assessment games")}
        </h3>

        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 16,
          }}
        >
          <AssessmentItem
            number="1"
            title={t(
              "Around the World – Doubles"
            )}
            description={t(
              "Test your accuracy around the doubles ring."
            )}
          />

          <AssessmentItem
            number="2"
            title={t("101 Double Out")}
            description={t(
              "Finish 101 five times."
            )}
          />

          <AssessmentItem
            number="3"
            title={t("170 Finish")}
            description={t(
              "Finish 170 five times."
            )}
          />

          <AssessmentItem
            number="4"
            title={t("10 Scoring Visits")}
            description={t(
              "Record ten three-dart scoring visits."
            )}
          />

          <AssessmentItem
            number="5"
            title={t("501")}
            description={t(
              "Play five complete 501 legs."
            )}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
        }}
      >
        <button
          type="button"
          className="btn"
          style={{
            width: "100%",
          }}
          onClick={startAssessment}
        >
          {t("Start Assessment")}
        </button>
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
      </div>
    </div>
  );
}

function AssessmentItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr",
        gap: 12,
        alignItems: "center",
        padding: 12,
        border: "1px solid rgba(148, 163, 184, 0.15)",
        borderRadius: 12,
      }}
    >
      <div
        className="pill"
        style={{
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
        }}
      >
        {number}
      </div>

      <div>
        <div
          style={{
            fontWeight: 800,
          }}
        >
          {title}
        </div>

        <div
          className="small muted"
          style={{
            marginTop: 3,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}