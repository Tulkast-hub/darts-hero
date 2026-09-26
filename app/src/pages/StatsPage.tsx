
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

  const hasCompletedAssessment =
    !!results.doubles &&
    !!results.checkout101 &&
    !!results.finish170 &&
    !!results.scoring &&
    !!results.game501;

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
                "Review your training statistics, skills assessment and development over time."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* TRAINING STATISTICS */}

      <section
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
            marginBottom: 0,
          }}
        >
          {t(
            "Your training performance and progression will appear here as we build the new training system."
          )}
        </p>
      </section>

      {/* SKILLS ASSESSMENT */}

      <section
        className="card"
        style={{
          marginTop: 16,
        }}
      >
        <div className="stats-assessment-header">
          <div>
            <h3 style={{ margin: 0 }}>
              {t("Skills Assessment")}
            </h3>

            <p
              className="muted small"
              style={{
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              {t(
                "Your measured performance across six skills."
              )}
            </p>
          </div>

          {hasCompletedAssessment && (
            <div className="stats-assessment-overall">
              <div>
                <div className="muted small">
                  {t("Overall score")}
                </div>

                <div className="stats-assessment-score">
                  {overallScore}
                  <span className="muted">
                    {" "}/ 100
                  </span>
                </div>
              </div>

              <RankBadge
                tier={overallRank.band}
                level={overallRank.level}
              />
            </div>
          )}
        </div>

        {!hasCompletedAssessment ? (
          <div className="stats-assessment-empty">
            <div
              style={{
                fontSize: 32,
                marginBottom: 8,
              }}
            >
              🎯
            </div>

            <h3>
              {t("No completed assessment yet")}
            </h3>

            <p className="muted small">
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
          <>
            <div className="stats-assessment-grid">

              {/* LEFT COLUMN: RADAR */}

              <div className="stats-assessment-radar">
                <SkillsRadar
                  skills={radarSkills}
                />
              </div>

              {/* RIGHT COLUMN: SKILL SCORES */}

              <div className="stats-assessment-skills">
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
            </div>

            <button
              type="button"
              className="btn outline"
              style={{
                width: "100%",
                marginTop: 16,
              }}
              onClick={() =>
                nav("/skills-assessment/results")
              }
            >
              {t("View full assessment results")}
            </button>
          </>
        )}
      </section>

      {/* ASSESSMENT HISTORY */}

      <section
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
            marginBottom: 0,
          }}
        >
          {t(
            "Completed assessments will be saved to your account so you can review previous results and track your progress."
          )}
        </p>

        <div className="stats-history-empty">
          {t("Assessment history coming soon")}
        </div>
      </section>
    </div>
  );
}

/*
 * --------------------------------------------------
 * COMPACT SKILL STAT
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
    <div className="stats-skill-row">
      <div className="stats-skill-label">
        {label}
      </div>

      <div className="stats-skill-result">
        <span className="stats-skill-value">
          {value}
        </span>

        <RankBadge
          tier={rank.band}
          level={rank.level}
        />
      </div>
    </div>
  );
}