
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useI18n } from "../i18n/I18nProvider";
import { useAssessmentStore } from "../skills-assessment/useAssessmentStore";

import {
  calculateAssessmentMetrics,
  calculateAssessmentSkillScores,
  calculateOverallSkillScore,
  getEquivalentLevel,
} from "../skills-assessment/assessmentMetrics";

import RankBadge from "../ui/RankBadge";
import SkillsRadar from "../ui/SkillsRadar";

export default function StatsPage() {
  const { t } = useI18n();
  const nav = useNavigate();

  const results = useAssessmentStore(
    (state) => state.results
  );

  /*
   * Check whether all five assessment
   * games have been completed.
   */
  const hasCompletedAssessment =
    !!results.doubles &&
    !!results.checkout101 &&
    !!results.finish170 &&
    !!results.scoring &&
    !!results.game501;

  /*
   * Calculate the assessment metrics
   * from the current Zustand results.
   */
  const metrics = useMemo(
    () => calculateAssessmentMetrics(results),
    [results]
  );

  const skillScores = useMemo(
    () => calculateAssessmentSkillScores(metrics),
    [metrics]
  );

  const overallScore = useMemo(
    () => calculateOverallSkillScore(skillScores),
    [skillScores]
  );

  const overallRank = useMemo(
    () => getEquivalentLevel(overallScore),
    [overallScore]
  );

  /*
   * Radar chart data.
   *
   * Same skill order as the assessment
   * results page.
   */
  const radarSkills = useMemo(
    () => [
      {
        key: "doubles",
        label: t("Doubles"),
        value: skillScores.doubles,
      },
      {
        key: "scoring",
        label: t("Scoring"),
        value: skillScores.scoring,
      },
      {
        key: "setup",
        label: t("Setup"),
        value: skillScores.setup,
      },
      {
        key: "finishing",
        label: t("Finishing"),
        value: skillScores.finishing,
      },
      {
        key: "average",
        label: t("Average"),
        value: skillScores.overallAverage,
      },
      {
        key: "consistency",
        label: t("Consistency"),
        value: skillScores.consistency,
      },
    ],
    [skillScores, t]
  );

  /*
   * Assessment breakdown.
   */
  const checkout101Average =
    results.checkout101?.averageDarts ?? 0;

  const finish170Average =
    results.finish170?.averageDarts ?? 0;

  const scoringTestAverage =
    results.scoring?.averageScore ?? 0;

  const game501Average =
    results.game501?.threeDartAverage ?? 0;

  const doublesPercentage =
    results.doubles?.percentage ?? 0;

  return (
    <div className="page">

      {/* PAGE HEADER */}

      <section className="hero card">
        <div>
          <div className="title">
            {t("Player Statistics")}
          </div>

          <div className="subtitle">
            <h2>
              {t("Your darts performance")}
            </h2>

            <p>
              {t(
                "Review your skills assessment results and track your development over time."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ASSESSMENT SECTION */}

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
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>
              {t("Skills Assessment")}
            </h3>

            <div
              className="muted small"
              style={{
                marginTop: 4,
              }}
            >
              {t(
                "Your measured performance across six skills."
              )}
            </div>
          </div>

          {hasCompletedAssessment && (
            <RankBadge
              tier={overallRank.band}
              level={overallRank.level}
            />
          )}
        </div>

        {!hasCompletedAssessment ? (
          /*
           * EMPTY STATE
           */
          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              padding: "24px 12px",
            }}
          >
            <div
              style={{
                fontSize: 42,
                marginBottom: 12,
              }}
            >
              🎯
            </div>

            <h3>
              {t("No completed assessment yet")}
            </h3>

            <p
              className="muted"
              style={{
                maxWidth: 420,
                margin: "12px auto 20px",
              }}
            >
              {t(
                "Complete the Skills Assessment to discover your current level and build your skills profile."
              )}
            </p>

            <button
              type="button"
              className="btn"
              onClick={() =>
                nav("/skills-assessment")
              }
            >
              {t("Start Assessment")}
            </button>
          </div>
        ) : (
          /*
           * COMPLETED ASSESSMENT
           */
          <>
            {/* OVERALL SCORE */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                marginTop: 24,
              }}
            >
              <div>
                <div className="muted small">
                  {t("Overall assessment score")}
                </div>

                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 900,
                    lineHeight: 1.2,
                    marginTop: 4,
                  }}
                >
                  {overallScore}

                  <span
                    className="muted"
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    {" "}
                    / 100
                  </span>
                </div>
              </div>

              <div
                style={{
                  textAlign: "right",
                }}
              >
                <div className="muted small">
                  {t("Assessment level")}
                </div>

                <div
                  style={{
                    marginTop: 8,
                  }}
                >
                  <RankBadge
                    tier={overallRank.band}
                    level={overallRank.level}
                  />
                </div>
              </div>
            </div>

            {/* RADAR */}

            <div
              style={{
                marginTop: 24,
              }}
            >
              <SkillsRadar
                skills={radarSkills}
              />
            </div>

            {/* SKILL SCORES */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 12,
                marginTop: 24,
              }}
            >
              <SkillStat
                label={t("Doubles")}
                value={skillScores.doubles}
              />

              <SkillStat
                label={t("Scoring")}
                value={skillScores.scoring}
              />

              <SkillStat
                label={t("Setup Play")}
                value={skillScores.setup}
              />

              <SkillStat
                label={t("Finishing")}
                value={skillScores.finishing}
              />

              <SkillStat
                label={t("Overall Average")}
                value={skillScores.overallAverage}
              />

              <SkillStat
                label={t("Consistency")}
                value={skillScores.consistency}
              />
            </div>

            {/* DETAILS BUTTON */}

            <button
              type="button"
              className="btn outline"
              style={{
                width: "100%",
                marginTop: 24,
              }}
              onClick={() =>
                nav("/skills-assessment/results")
              }
            >
              {t("View full assessment results")}
            </button>
          </>
        )}
      </div>

      {/* GAME BREAKDOWN */}

      {hasCompletedAssessment && (
        <div
          className="card"
          style={{
            marginTop: 16,
          }}
        >
          <h3>
            {t("Assessment breakdown")}
          </h3>

          <div
            className="row bullout-stat-row"
            style={{
              marginTop: 16,
            }}
          >
            <BreakdownStat
              label={t("ATW Doubles")}
              value={`${doublesPercentage}%`}
            />

            <BreakdownStat
              label={t("101 avg darts")}
              value={checkout101Average}
            />

            <BreakdownStat
              label={t("170 avg darts")}
              value={finish170Average}
            />

            <BreakdownStat
              label={t("Scoring test avg")}
              value={scoringTestAverage}
            />

            <BreakdownStat
              label={t("501 avg")}
              value={game501Average}
            />
          </div>
        </div>
      )}

      {/* ASSESSMENT HISTORY */}

      <div
        className="card"
        style={{
          marginTop: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>
          {t("Assessment History")}
        </h3>

        <p
          className="muted small"
          style={{
            marginTop: 8,
          }}
        >
          {t(
            "Review previous assessments and compare your performance over time."
          )}
        </p>

        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
            marginTop: 16,
            border:
              "1px dashed rgba(148, 163, 184, 0.3)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 32,
              marginBottom: 12,
            }}
          >
            📊
          </div>

          <div
            style={{
              fontWeight: 800,
            }}
          >
            {t("Assessment history coming soon")}
          </div>

          <p
            className="muted small"
            style={{
              maxWidth: 400,
              margin: "8px auto 0",
            }}
          >
            {t(
              "Completed assessments will be saved to your account so you can review previous results and track your progress."
            )}
          </p>
        </div>
      </div>

      {/* FUTURE TRAINING STATISTICS */}

      <div
        className="card"
        style={{
          marginTop: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>
          {t("Training Statistics")}
        </h3>

        <p
          className="muted small"
          style={{
            marginTop: 8,
          }}
        >
          {t(
            "Training statistics and progression tracking will be added with the upcoming training system redesign."
          )}
        </p>
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------
 * INDIVIDUAL SKILL STAT
 * --------------------------------------------------
 */

function SkillStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const rank =
    getEquivalentLevel(value);

  return (
    <div
      className="pill pill-stat"
      style={{
        minWidth: 0,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div className="pill-label">
        {label}
      </div>

      <div
        className="pill-value"
        style={{
          fontSize: 24,
        }}
      >
        {value}
      </div>

      <div>
        <RankBadge
          tier={rank.band}
          level={rank.level}
        />
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------
 * ASSESSMENT GAME STAT
 * --------------------------------------------------
 */

function BreakdownStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="pill pill-stat">
      <div className="pill-label">
        {label}
      </div>

      <div className="pill-value">
        {value}
      </div>
    </div>
  );
}