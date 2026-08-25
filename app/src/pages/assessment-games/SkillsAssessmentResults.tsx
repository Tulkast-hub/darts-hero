import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAssessmentStore } from "../../skills-assessment/useAssessmentStore";
import { useI18n } from "../../i18n/I18nProvider";
import { calculateAssessmentMetrics } from "../../skills-assessment/assessmentMetrics";

export default function SkillsAssessmentResults() {
  const { t } = useI18n();
  const nav = useNavigate();

  const results = useAssessmentStore(
    (state) => state.results
  );

  const metrics = useMemo(
    () => calculateAssessmentMetrics(results),
    [results]
  );

  const doubles = results.doubles;
  const checkout101 = results.checkout101;
  const finish170 = results.finish170;
  const scoring = results.scoring;
  const game501 = results.game501;

  const allComplete =
    !!doubles &&
    !!checkout101 &&
    !!finish170 &&
    !!scoring &&
    !!game501;

  const checkout101Average = useMemo(() => {
    if (!checkout101?.legs.length) {
      return null;
    }

    const totalDarts =
      checkout101.legs.reduce(
        (sum, leg) => sum + leg.darts,
        0
      );

    return Number(
      (
        totalDarts /
        checkout101.legs.length
      ).toFixed(1)
    );
  }, [checkout101]);

  const finish170Average = useMemo(() => {
    if (!finish170?.attempts.length) {
      return null;
    }

    const totalDarts =
      finish170.attempts.reduce(
        (sum, attempt) =>
          sum + attempt.darts,
        0
      );

    return Number(
      (
        totalDarts /
        finish170.attempts.length
      ).toFixed(1)
    );
  }, [finish170]);

  if (!allComplete) {
    return (
      <div className="page">
        <section className="hero card">
          <div>
            <div className="title">
              {t(
                "Skills Assessment Results"
              )}
            </div>

            <div className="subtitle">
              <h2>
                {t(
                  "Assessment incomplete"
                )}
              </h2>

              <p>
                {t(
                  "Complete all five assessment games before viewing your final results."
                )}
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="btn"
          style={{
            width: "100%",
          }}
          onClick={() =>
            nav(
              "/skills-assessment"
            )
          }
        >
          {t(
            "Back to assessment"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="title">
            {t(
              "Skills Assessment Results"
            )}
          </div>

          <div className="subtitle">
            <h2>
              {t(
                "Your darts profile"
              )}
            </h2>

            <p>
              {t(
                "These results are based on all five parts of your skills assessment."
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="card">
        <h3>
          {t(
            "Assessment summary"
          )}
        </h3>

        <div
          style={{
            overflowX: "auto",
            marginTop: 16,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign:
                      "left",
                    padding:
                      "10px 8px",
                  }}
                >
                  {t("Skill")}
                </th>

                <th
                  style={{
                    textAlign:
                      "right",
                    padding:
                      "10px 8px",
                  }}
                >
                  {t("Result")}
                </th>

                <th
                  style={{
                    textAlign:
                      "right",
                    padding:
                      "10px 8px",
                  }}
                >
                  {t(
                    "Skill score"
                  )}
                </th>

                <th
                  style={{
                    textAlign:
                      "right",
                    padding:
                      "10px 8px",
                  }}
                >
                  {t(
                    "Equivalent level"
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              <ResultRow
                label={t("Doubles")}
                result={`${metrics.doublesPercentage}%`}
              />

              <ResultRow
                label={t("Scoring")}
                result={`${metrics.scoringAverage}`}
              />

              <ResultRow
                label={t(
                  "Overall Average"
                )}
                result={`${metrics.overallAverage}`}
              />

              <ResultRow
                label={t(
                  "Consistency"
                )}
                result={`${metrics.consistencyScore}/100`}
              />

              <ResultRow
                label={t(
                  "101 Double Out"
                )}
                result={`${checkout101Average} darts`}
              />

              <ResultRow
                label={t(
                  "170 Finish"
                )}
                result={`${finish170Average} darts`}
              />
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginTop: 16,
        }}
      >
        <h3>
          {t(
            "Test breakdown"
          )}
        </h3>

        <div className="row bullout-stat-row">
          <div className="pill pill-stat">
            <div className="pill-label">
              {t(
                "ATW Doubles"
              )}
            </div>

            <div className="pill-value">
              {doubles.percentage}%
            </div>
          </div>

          <div className="pill pill-stat">
            <div className="pill-label">
              {t(
                "101 avg darts"
              )}
            </div>

            <div className="pill-value">
              {
                checkout101.averageDarts
              }
            </div>
          </div>

          <div className="pill pill-stat">
            <div className="pill-label">
              {t(
                "170 avg darts"
              )}
            </div>

            <div className="pill-value">
              {
                finish170.averageDarts
              }
            </div>
          </div>

          <div className="pill pill-stat">
            <div className="pill-label">
              {t(
                "Scoring test avg"
              )}
            </div>

            <div className="pill-value">
              {
                scoring.averageScore
              }
            </div>
          </div>

          <div className="pill pill-stat">
            <div className="pill-label">
              {t("501 avg")}
            </div>

            <div className="pill-value">
              {
                game501.threeDartAverage
              }
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
        }}
      >
        <button
          type="button"
          className="btn outline"
          style={{
            width: "100%",
          }}
          onClick={() =>
            nav("/")
          }
        >
          {t("Finish")}
        </button>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  result,
}: {
  label: string;
  result: string;
}) {
  return (
    <tr>
      <td
        style={{
          padding:
            "12px 8px",
          borderTop:
            "1px solid rgba(148, 163, 184, 0.15)",
        }}
      >
        <strong>
          {label}
        </strong>
      </td>

      <td
        style={{
          padding:
            "12px 8px",
          textAlign:
            "right",
          borderTop:
            "1px solid rgba(148, 163, 184, 0.15)",
        }}
      >
        {result}
      </td>

      <td
        style={{
          padding:
            "12px 8px",
          textAlign:
            "right",
          borderTop:
            "1px solid rgba(148, 163, 184, 0.15)",
        }}
      >
        —
      </td>

      <td
        style={{
          padding:
            "12px 8px",
          textAlign:
            "right",
          borderTop:
            "1px solid rgba(148, 163, 184, 0.15)",
        }}
      >
        —
      </td>
    </tr>
  );
}