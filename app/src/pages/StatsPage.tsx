import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { useI18n } from "../i18n/I18nProvider";

import {
  getSkillsAssessmentHistory,
  type SkillsAssessmentHistoryItem,
} from "../api";

import {
  getEquivalentLevel,
} from "../skills-assessment/assessmentMetrics";

import RankBadge from "../ui/RankBadge";
import SkillsRadar from "../ui/SkillsRadar";

const HISTORY_PAGE_SIZE = 5;

export default function StatsPage() {
  const { t, lang } = useI18n();
  const nav = useNavigate();

  /*
   * Saved assessment history.
   */
  const [assessments, setAssessments] = useState<
    SkillsAssessmentHistoryItem[]
  >([]);

  const [
    selectedAssessmentId,
    setSelectedAssessmentId,
  ] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(
    null
  );

  const [reloadKey, setReloadKey] = useState(0);

  /*
   * History filters.
   */
  const [selectedYear, setSelectedYear] =
    useState<string>("all");

  const [selectedMonth, setSelectedMonth] =
    useState<string>("all");

  /*
   * Number of filtered history records
   * currently visible.
   */
  const [visibleCount, setVisibleCount] = useState(
    HISTORY_PAGE_SIZE
  );

  /*
   * --------------------------------------------------
   * LOAD HISTORY
   * --------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await getSkillsAssessmentHistory();

        if (cancelled) {
          return;
        }

        setAssessments(response.assessments);

        setVisibleCount(
          HISTORY_PAGE_SIZE
        );

        /*
         * Keep currently selected assessment
         * if it still exists.
         *
         * Otherwise select the newest one.
         */
        setSelectedAssessmentId((previousId) => {
          if (
            previousId !== null &&
            response.assessments.some(
              (assessment) =>
                assessment.id === previousId
            )
          ) {
            return previousId;
          }

          return response.assessments[0]?.id ?? null;
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Could not load assessment history."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /*
   * Reset pagination whenever filters change.
   */
  useEffect(() => {
    setVisibleCount(
      HISTORY_PAGE_SIZE
    );
  }, [
    selectedYear,
    selectedMonth,
  ]);

  /*
   * --------------------------------------------------
   * SELECTED ASSESSMENT
   * --------------------------------------------------
   */

  const selectedAssessment = useMemo(() => {
    if (!assessments.length) {
      return null;
    }

    return (
      assessments.find(
        (assessment) =>
          assessment.id === selectedAssessmentId
      ) ?? assessments[0]
    );
  }, [
    assessments,
    selectedAssessmentId,
  ]);

  /*
   * Use the saved historical snapshot.
   *
   * Do not recalculate previous assessments
   * using newer formulas.
   */
  const skillScores =
    selectedAssessment?.skillScores;

  const overallScore =
    selectedAssessment?.overallScore ?? 0;

  /*
   * --------------------------------------------------
   * RADAR
   * --------------------------------------------------
   */

  const radarSkills = useMemo(() => {
    if (!skillScores) {
      return [];
    }

    return [
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
    ];
  }, [skillScores, t]);

  /*
   * --------------------------------------------------
   * AVAILABLE YEARS
   * --------------------------------------------------
   */

  const availableYears = useMemo(() => {
    const years = new Set<number>();

    assessments.forEach((assessment) => {
      const datePart =
        assessment.completedAt.split(/[ T]/)[0];

      const year =
        Number(
          datePart.split("-")[0]
        );

      if (Number.isFinite(year)) {
        years.add(year);
      }
    });

    return Array.from(years).sort(
      (a, b) => b - a
    );
  }, [assessments]);

  /*
   * --------------------------------------------------
   * FILTERED HISTORY
   * --------------------------------------------------
   */

  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) => {
      const datePart =
        assessment.completedAt.split(/[ T]/)[0];

      const parts =
        datePart.split("-");

      /*
       * Keep malformed dates visible rather
       * than silently hiding them.
       */
      if (parts.length !== 3) {
        return true;
      }

      const year =
        parts[0];

      const month =
        parts[1];

      if (
        selectedYear !== "all" &&
        year !== selectedYear
      ) {
        return false;
      }

      if (
        selectedMonth !== "all" &&
        month !== selectedMonth
      ) {
        return false;
      }

      return true;
    });
  }, [
    assessments,
    selectedYear,
    selectedMonth,
  ]);

  /*
   * --------------------------------------------------
   * PAGINATED HISTORY
   * --------------------------------------------------
   */

  const visibleAssessments = useMemo(
    () =>
      filteredAssessments.slice(
        0,
        visibleCount
      ),
    [
      filteredAssessments,
      visibleCount,
    ]
  );

  const hasMoreAssessments =
    visibleCount <
    filteredAssessments.length;

  /*
   * --------------------------------------------------
   * HELPERS
   * --------------------------------------------------
   */

  function retryHistory() {
    setReloadKey(
      (value) => value + 1
    );
  }

  function openAssessment(
    id: number
  ) {
    nav(
      `/stats/assessment/${id}`
    );
  }

  function formatAssessmentDate(
    value: string
  ): string {
    /*
     * MariaDB:
     * 2026-09-27 14:30:00
     *
     * Only show the calendar date.
     */
    const datePart =
      value.split(/[ T]/)[0];

    const parts =
      datePart.split("-").map(Number);

    if (
      parts.length !== 3 ||
      parts.some(
        (part) =>
          !Number.isFinite(part)
      )
    ) {
      return value;
    }

    const [
      year,
      month,
      day,
    ] = parts;

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      lang === "ro"
        ? "ro-RO"
        : "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(date);
  }

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
        <h3
          style={{
            margin: 0,
          }}
        >
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
            <h3
              style={{
                margin: 0,
              }}
            >
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

            {selectedAssessment &&
              !error && (
                <div
                  className="muted small"
                  style={{
                    marginTop: 6,
                  }}
                >
                  {formatAssessmentDate(
                    selectedAssessment.completedAt
                  )}
                </div>
              )}
          </div>

          {!loading &&
            !error &&
            selectedAssessment && (
              <div className="stats-assessment-overall">
                <div>
                  <div className="muted small">
                    {t("Overall score")}
                  </div>

                  <div className="stats-assessment-score">
                    {overallScore}

                    <span className="muted">
                      {" "}
                      / 100
                    </span>
                  </div>
                </div>

                <RankBadge
                  tier={
                    selectedAssessment.rankBand
                  }
                  level={
                    selectedAssessment.rankLevel
                  }
                />
              </div>
            )}
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="stats-assessment-empty">
            <div
              className="loader"
              style={{
                margin:
                  "0 auto 12px",
              }}
            />

            <p className="muted small">
              {t(
                "Loading assessment history..."
              )}
            </p>
          </div>
        ) : error ? (
          /* API ERROR */

          <div className="stats-assessment-empty">
            <h3>
              {t(
                "Could not load assessments"
              )}
            </h3>

            <p className="muted small">
              {error}
            </p>

            <button
              type="button"
              className="btn outline"
              onClick={retryHistory}
            >
              {t("Retry")}
            </button>
          </div>
        ) : !selectedAssessment ||
          !skillScores ? (
          /* EMPTY STATE */

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
              {t(
                "No completed assessment yet"
              )}
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
                nav(
                  "/skills-assessment"
                )
              }
            >
              {t("Start Assessment")}
            </button>
          </div>
        ) : (
          /* SAVED ASSESSMENT */

          <>
            <div className="stats-assessment-grid">

              {/* LEFT COLUMN */}

              <div className="stats-assessment-radar">
                <SkillsRadar
                  skills={
                    radarSkills
                  }
                />
              </div>

              {/* RIGHT COLUMN */}

              <div className="stats-assessment-skills">
                <SkillStat
                  label={
                    t("Doubles")
                  }
                  value={
                    skillScores.doubles
                  }
                />

                <SkillStat
                  label={
                    t("Scoring")
                  }
                  value={
                    skillScores.scoring
                  }
                />

                <SkillStat
                  label={
                    t("Setup Play")
                  }
                  value={
                    skillScores.setup
                  }
                />

                <SkillStat
                  label={
                    t("Finishing")
                  }
                  value={
                    skillScores.finishing
                  }
                />

                <SkillStat
                  label={
                    t("Overall Average")
                  }
                  value={
                    skillScores.overallAverage
                  }
                />

                <SkillStat
                  label={
                    t("Consistency")
                  }
                  value={
                    skillScores.consistency
                  }
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
                openAssessment(
                  selectedAssessment.id
                )
              }
            >
              {t(
                "View full assessment results"
              )}
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
        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h3
            style={{
              margin: 0,
            }}
          >
            {t("Assessment History")}
          </h3>

          {!loading &&
            !error && (
              <span className="muted small">
                {
                  assessments.length
                }{" "}
                {t("assessments")}
              </span>
            )}
        </div>

        <p
          className="muted small"
          style={{
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          {t(
            "Select a previous assessment to review its saved skills profile."
          )}
        </p>

        {/* FILTERS */}

        {!loading &&
          !error &&
          assessments.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 14,
              }}
            >
              {/* YEAR */}

              <label
                style={{
                  display: "grid",
                  gap: 4,
                  minWidth: 140,
                }}
              >
                <span className="muted small">
                  {t("Year")}
                </span>

                <select
                  value={
                    selectedYear
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedYear(
                      event.target
                        .value
                    )
                  }
                  className="input"
                >
                  <option value="all">
                    {t(
                      "All years"
                    )}
                  </option>

                  {availableYears.map(
                    (year) => (
                      <option
                        key={
                          year
                        }
                        value={String(
                          year
                        )}
                      >
                        {year}
                      </option>
                    )
                  )}
                </select>
              </label>

              {/* MONTH */}

              <label
                style={{
                  display: "grid",
                  gap: 4,
                  minWidth: 160,
                }}
              >
                <span className="muted small">
                  {t("Month")}
                </span>

                <select
                  value={
                    selectedMonth
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedMonth(
                      event.target
                        .value
                    )
                  }
                  className="input"
                >
                  <option value="all">
                    {t(
                      "All months"
                    )}
                  </option>

                  <option value="01">
                    {t(
                      "January"
                    )}
                  </option>

                  <option value="02">
                    {t(
                      "February"
                    )}
                  </option>

                  <option value="03">
                    {t(
                      "March"
                    )}
                  </option>

                  <option value="04">
                    {t(
                      "April"
                    )}
                  </option>

                  <option value="05">
                    {t(
                      "May"
                    )}
                  </option>

                  <option value="06">
                    {t(
                      "June"
                    )}
                  </option>

                  <option value="07">
                    {t(
                      "July"
                    )}
                  </option>

                  <option value="08">
                    {t(
                      "August"
                    )}
                  </option>

                  <option value="09">
                    {t(
                      "September"
                    )}
                  </option>

                  <option value="10">
                    {t(
                      "October"
                    )}
                  </option>

                  <option value="11">
                    {t(
                      "November"
                    )}
                  </option>

                  <option value="12">
                    {t(
                      "December"
                    )}
                  </option>
                </select>
              </label>
            </div>
          )}

        {/* HISTORY RESULTS */}

        {!loading &&
        !error &&
        filteredAssessments.length >
          0 ? (
          <div
            style={{
              display: "grid",
              gap: 8,
              marginTop: 16,
            }}
          >
            {visibleAssessments.map(
              (assessment) => {
                const isSelected =
                  assessment.id ===
                  selectedAssessment
                    ?.id;

                return (
                  <button
                    key={
                      assessment.id
                    }
                    type="button"
                    aria-pressed={
                      isSelected
                    }
                    onClick={() =>
                      setSelectedAssessmentId(
                        assessment.id
                      )
                    }
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      width: "100%",
                      padding:
                        "12px 14px",
                      borderRadius: 10,
                      border:
                        isSelected
                          ? "2px solid var(--accent, #22c55e)"
                          : "1px solid rgba(148, 163, 184, 0.2)",
                      background:
                        "transparent",
                      color:
                        "inherit",
                      textAlign:
                        "left",
                      cursor:
                        "pointer",
                      font:
                        "inherit",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "grid",
                        gap: 5,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        {formatAssessmentDate(
                          assessment.completedAt
                        )}
                      </div>

                      <div className="muted small">
                        {isSelected
                          ? t(
                              "Selected assessment"
                            )
                          : t(
                              "View assessment"
                            )}
                      </div>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "flex-end",
                        gap: 12,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 18,
                          fontVariantNumeric:
                            "tabular-nums",
                        }}
                      >
                        {
                          assessment.overallScore
                        }
                      </strong>

                      <RankBadge
                        tier={
                          assessment.rankBand
                        }
                        level={
                          assessment.rankLevel
                        }
                      />

                      <span
                        className="muted"
                        aria-hidden="true"
                      >
                        {isSelected
                          ? "✓"
                          : "›"}
                      </span>
                    </div>
                  </button>
                );
              }
            )}

            {/* LOAD MORE */}

            {hasMoreAssessments && (
              <button
                type="button"
                className="btn outline"
                style={{
                  width: "100%",
                  marginTop: 8,
                }}
                onClick={() =>
                  setVisibleCount(
                    (count) =>
                      count +
                      HISTORY_PAGE_SIZE
                  )
                }
              >
                {t("Load more")}
              </button>
            )}

            {/* COUNTER */}

            <div
              className="muted small"
              style={{
                marginTop: 4,
                textAlign:
                  "center",
              }}
            >
              {t("Showing")}{" "}
              {Math.min(
                visibleCount,
                filteredAssessments.length
              )}{" "}
              {t("of")}{" "}
              {
                filteredAssessments.length
              }
            </div>
          </div>
        ) : !loading &&
          !error ? (
          <div className="stats-history-empty">
            {assessments.length ===
            0
              ? t(
                  "No saved assessments yet"
                )
              : t(
                  "No assessments found for this period"
                )}
          </div>
        ) : null}
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
    getEquivalentLevel(
      value
    );

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
          tier={
            rank.band
          }
          level={
            rank.level
          }
        />
      </div>
    </div>
  );
}