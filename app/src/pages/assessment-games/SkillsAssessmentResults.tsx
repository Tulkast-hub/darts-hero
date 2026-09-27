import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getSkillsAssessment,
  saveSkillsAssessment,
  type SavedSkillsAssessment,
} from "../../api";
import { useAssessmentStore } from "../../skills-assessment/useAssessmentStore";
import { useI18n } from "../../i18n/I18nProvider";
import RankBadge from "../../ui/RankBadge";
import SkillsRadar from "../../ui/SkillsRadar";
import {
  calculateAssessmentMetrics,
  calculateAssessmentSkillScores,
  calculateOverallSkillScore,
  getEquivalentLevel,
  type AssessmentEquivalentLevel,
} from "../../skills-assessment/assessmentMetrics";

export default function SkillsAssessmentResults() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isHistorical = id !== undefined;

  const activeResults = useAssessmentStore(
    (state) => state.results
  );

  const [historicalAssessment, setHistoricalAssessment] =
    useState<SavedSkillsAssessment | null>(null);
  const [historyLoading, setHistoryLoading] = useState(isHistorical);
  const [historyError, setHistoryError] = useState("");
  const [historyRetry, setHistoryRetry] = useState(0);

  useEffect(() => {
    if (!isHistorical) return;

    const assessmentId = Number(id);
    if (!Number.isSafeInteger(assessmentId) || assessmentId <= 0) {
      setHistoricalAssessment(null);
      setHistoryError("Invalid assessment ID.");
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setHistoricalAssessment(null);
    setHistoryError("");
    setHistoryLoading(true);

    void getSkillsAssessment(assessmentId)
      .then((response) => {
        if (!cancelled) {
          setHistoricalAssessment(response.assessment);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : "Could not load assessment."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isHistorical, historyRetry]);

  // Historical snapshots are read-only; never replace the active store.
  const results = historicalAssessment?.gameResults ?? activeResults;

  const ensureAssessmentUuid = useAssessmentStore(
    (state) => state.ensureAssessmentUuid
  );

  type SaveStatus = "idle" | "saving" | "saved" | "error";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  const savingUuidRef = useRef<string | null>(null);
  const savedUuidRef = useRef<string | null>(null);

  const metrics = useMemo(
    () => historicalAssessment?.rawMetrics ?? calculateAssessmentMetrics(results),
    [historicalAssessment, results]
  );

  const skillScores = useMemo(
    () =>
      historicalAssessment?.skillScores ?? calculateAssessmentSkillScores(metrics),
    [historicalAssessment, metrics]
  );

  const overallScore = useMemo(
    () =>
      historicalAssessment?.overallScore ?? calculateOverallSkillScore(skillScores),
    [historicalAssessment, skillScores]
  );

  const overallRank = useMemo(
    () =>
      historicalAssessment
        ? { band: historicalAssessment.rankBand, level: historicalAssessment.rankLevel }
        : getEquivalentLevel(overallScore),
    [historicalAssessment, overallScore]
  );

  const doubles = results.doubles;
  const checkout101 =
    results.checkout101;
  const finish170 =
    results.finish170;
  const scoring = results.scoring;
  const game501 = results.game501;

  const allComplete =
    !!doubles &&
    !!checkout101 &&
    !!finish170 &&
    !!scoring &&
    !!game501;

  const checkout101Average =
    useMemo(() => {
      if (
        !checkout101?.legs.length
      ) {
        return null;
      }

      const totalDarts =
        checkout101.legs.reduce(
          (sum, leg) =>
            sum + leg.darts,
          0
        );

      return Number(
        (
          totalDarts /
          checkout101.legs.length
        ).toFixed(1)
      );
    }, [checkout101]);

  const finish170Average =
    useMemo(() => {
      if (
        !finish170?.attempts.length
      ) {
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

  const radarSkills = useMemo(
    () => [
      {
        key: "doubles",
        label: t("Doubles"),
        value:
          skillScores.doubles,
      },
      {
        key: "scoring",
        label: t("Scoring"),
        value:
          skillScores.scoring,
      },
      {
        key: "setup",
        label: t("Setup"),
        value:
          skillScores.setup,
      },
      {
        key: "finishing",
        label: t("Finishing"),
        value:
          skillScores.finishing,
      },
      {
        key: "average",
        label: t("Average"),
        value:
          skillScores.overallAverage,
      },
      {
        key: "consistency",
        label: t(
          "Consistency"
        ),
        value:
          skillScores.consistency,
      },
    ],
    [skillScores, t]
  );

  /*
   * Save the finished assessment once the results page opens.
   * The UUID is persisted in the assessment store, and the PHP
   * endpoint also deduplicates requests using that UUID.
   */
  const saveAssessment = useCallback(async () => {
    if (isHistorical || !allComplete) return;

    const uuid = ensureAssessmentUuid();

    if (
      savedUuidRef.current === uuid ||
      savingUuidRef.current === uuid
    ) {
      return;
    }

    savingUuidRef.current = uuid;
    setSaveStatus("saving");
    setSaveError("");

    try {
      const response = await saveSkillsAssessment({
        assessmentUuid: uuid,
        gameResults: results,
        rawMetrics: metrics,
        skillScores,
        overallScore,
        rankBand: overallRank.band,
        rankLevel: overallRank.level,
        calculationVersion: 1,
      });

      if (!response.ok) {
        throw new Error("Assessment could not be saved.");
      }

      savedUuidRef.current = uuid;
      setSaveStatus("saved");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Assessment could not be saved."
      );
      setSaveStatus("error");
    } finally {
      if (savingUuidRef.current === uuid) {
        savingUuidRef.current = null;
      }
    }
  }, [
    allComplete,
    isHistorical,
    ensureAssessmentUuid,
    results,
    metrics,
    skillScores,
    overallScore,
    overallRank.band,
    overallRank.level,
  ]);

  useEffect(() => {
    if (!isHistorical && allComplete) {
      void saveAssessment();
    }
  }, [isHistorical, allComplete, saveAssessment]);

  if (isHistorical && (historyLoading || historyError || !historicalAssessment)) {
    return (
      <div className="page">
        <section className="hero card">
          <div className="title">{t("Skills Assessment Results")}</div>
          {historyLoading ? (
            <p className="muted" role="status">{t("Loading assessment…")}</p>
          ) : (
            <>
              <p role="alert">{historyError || "Assessment not found."}</p>
              <button type="button" className="btn outline"
                onClick={() => setHistoryRetry((value) => value + 1)}>
                {t("Retry")}
              </button>
            </>
          )}
        </section>
        <button type="button" className="btn outline"
          style={{ marginTop: 16, width: "100%" }}
          onClick={() => nav("/stats")}>
          {t("Back to Stats")}
        </button>
      </div>
    );
  }

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
              isHistorical ? "/stats" : "/skills-assessment"
            )
          }
        >
          {t(isHistorical ? "Back to Stats" : "Back to assessment")}
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

      <div
        className="card"
        style={{
          marginTop: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
              }}
            >
              {t("Skills profile")}
            </h3>

            <div
              className="muted small"
              style={{
                marginTop: 4,
              }}
            >
              {t("Overall assessment rating")}
              {historicalAssessment && (
                <div style={{ marginTop: 4 }}>
                  {t("Saved assessment")} · {historicalAssessment.completedAt}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 12,
            }}
          >
            <RankBadge
              tier={
                overallRank.band
              }
              level={
                overallRank.level
              }
            />

            <div
              style={{
                textAlign: "right",
              }}
            >
              <div
                className="muted small"
              >
                {t(
                  "Overall score"
                )}
              </div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {overallScore}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
          }}
        >
          <SkillsRadar
            skills={radarSkills}
          />
        </div>

        {!isHistorical && <div
          role="status"
          aria-live="polite"
          className="muted small"
          style={{ marginTop: 16 }}
        >
          {saveStatus === "saving" && t("Saving assessment…")}
          {saveStatus === "saved" && t("Assessment saved to your account.")}
          {saveStatus === "error" && (
            <>
              <span role="alert">
                {t("Unable to save assessment")}: {saveError}
              </span>
              <button
                type="button"
                className="btn outline"
                style={{ marginTop: 10, display: "block" }}
                onClick={() => void saveAssessment()}
              >
                {t("Retry saving")}
              </button>
            </>
          )}
        </div>}
      </div>

      <div
        className="card"
        style={{
          marginTop: 16,
        }}
      >
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
                label={t(
                  "Doubles"
                )}
                result={`${metrics.doublesPercentage}%`}
                skillScore={
                  skillScores.doubles
                }
                rank={getEquivalentLevel(
                  skillScores.doubles
                )}
              />

              <ResultRow
                label={t(
                  "Scoring"
                )}
                result={`${metrics.scoringAverage}`}
                skillScore={
                  skillScores.scoring
                }
                rank={getEquivalentLevel(
                  skillScores.scoring
                )}
              />

              <ResultRow
                label={t(
                  "Setup Play"
                )}
                result={`${metrics.setupEfficiency}/100`}
                skillScore={
                  skillScores.setup
                }
                rank={getEquivalentLevel(
                  skillScores.setup
                )}
              />

              <ResultRow
                label={t(
                  "Finishing"
                )}
                result={`${metrics.finishingEfficiency}/100`}
                skillScore={
                  skillScores.finishing
                }
                rank={getEquivalentLevel(
                  skillScores.finishing
                )}
              />

              <ResultRow
                label={t(
                  "Overall Average"
                )}
                result={`${metrics.overallAverage}`}
                skillScore={
                  skillScores.overallAverage
                }
                rank={getEquivalentLevel(
                  skillScores.overallAverage
                )}
              />

              <ResultRow
                label={t(
                  "Consistency"
                )}
                result={`${metrics.consistencyScore}/100`}
                skillScore={
                  skillScores.consistency
                }
                rank={getEquivalentLevel(
                  skillScores.consistency
                )}
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
              {
                doubles.percentage
              }
              %
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
                checkout101Average
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
                finish170Average
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
          onClick={() => nav(isHistorical ? "/stats" : "/")}
          disabled={!isHistorical && saveStatus !== "saved"}
        >
          {t(isHistorical ? "Back to Stats" : "Finish")}
        </button>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  result,
  skillScore,
  rank,
}: {
  label: string;
  result: string;
  skillScore: number;
  rank: AssessmentEquivalentLevel;
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
        {skillScore}
      </td>

      <td
        style={{
          padding:
            "8px",
          borderTop:
            "1px solid rgba(148, 163, 184, 0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            alignItems:
              "center",
          }}
        >
          <RankBadge
            tier={rank.band}
            level={rank.level}
          />
        </div>
      </td>
    </tr>
  );
}