import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";
import { useAssessmentStore } from "../../skills-assessment/useAssessmentStore";
import { POSSIBLE_3DART_SCORES } from "../../skills-assessment/checkoutUtils";

const TOTAL_VISITS = 10;

export default function AssessmentScoring() {
  const { t } = useI18n();
  const nav = useNavigate();

  const setScoringResult = useAssessmentStore(
    (state) => state.setScoringResult
  );

  const [scoreInput, setScoreInput] = useState("");
  const [visits, setVisits] = useState<number[]>([]);

  const currentVisit = visits.length + 1;
  const complete = visits.length === TOTAL_VISITS;

  const enteredValue = scoreInput ? Number(scoreInput) : null;

  const isEnteredValid =
    enteredValue !== null &&
    enteredValue >= 0 &&
    enteredValue <= 180 &&
    POSSIBLE_3DART_SCORES.has(enteredValue);

  const totalScore = useMemo(
    () => visits.reduce((sum, score) => sum + score, 0),
    [visits]
  );

  const averageScore = visits.length
    ? Number((totalScore / visits.length).toFixed(1))
    : 0;

  function appendDigit(digit: string) {
    setScoreInput((current) => {
      const next = `${current}${digit}`.replace(/^0+(?=\d)/, "");

      if (next.length > 3) return current;

      const value = Number(next);

      if (Number.isNaN(value) || value > 180) {
        return current;
      }

      return next;
    });
  }

  function backspace() {
    setScoreInput((current) => current.slice(0, -1));
  }

  function commitScore() {
    if (
      enteredValue === null ||
      !isEnteredValid ||
      complete
    ) {
      return;
    }

    const updatedVisits = [...visits, enteredValue];

    setVisits(updatedVisits);
    setScoreInput("");

    if (updatedVisits.length === TOTAL_VISITS) {
      const finalTotal = updatedVisits.reduce(
        (sum, score) => sum + score,
        0
      );

      setScoringResult({
        visits: updatedVisits,
        totalScore: finalTotal,
        averageScore: Number(
          (finalTotal / TOTAL_VISITS).toFixed(1)
        ),
      });
    }
  }

  function handleUndo() {
    if (!visits.length || complete) {
      return;
    }

    setVisits((current) => current.slice(0, -1));
    setScoreInput("");
  }

  function continueAssessment() {
    nav("/skills-assessment/501");
  }

  React.useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (complete) return;

      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        appendDigit(event.key);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        backspace();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        commitScore();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setScoreInput("");
      }
    }

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [
    scoreInput,
    enteredValue,
    isEnteredValid,
    complete,
  ]);

  if (complete) {
    return (
      <div className="page">
        <section className="hero card">
          <div>
            <div className="title">
              {t("Skills Assessment")} · {t("Scoring")}
            </div>

            <div className="subtitle">
              <h2>{t("Scoring test complete")}</h2>
              <p>
                {t("You completed all 10 scoring visits.")}
              </p>
            </div>
          </div>
        </section>

        <div className="card result-card">
          <div className="result-main">
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Visits")}
                </div>
                <div className="pill-value">
                  {TOTAL_VISITS}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Total score")}
                </div>
                <div className="pill-value">
                  {totalScore}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Average")}
                </div>
                <div className="pill-value">
                  {averageScore}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn"
              style={{
                width: "100%",
                marginTop: 20,
              }}
              onClick={continueAssessment}
            >
              {t("Continue")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="title">
            {t("Skills Assessment")} · {t("Scoring")}
          </div>

          <div className="subtitle">
            <h2>{t("10 Scoring Visits")}</h2>

            <p>
              {t(
                "Throw 10 visits of three darts. Aim anywhere on the board and enter your total score after each visit."
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="game-surface assessment-surface">
        <div className="bullout-header">
          <div>
            <div className="muted">
              {t("Visit")} {currentVisit} {t("of")}{" "}
              {TOTAL_VISITS}
            </div>

            <div className="muted">
              {t("Each visit uses exactly 3 darts.")}
            </div>
          </div>

          <div className="objective-pill">
            <div className="objective-label">
              {t("Current average")}
            </div>

            <div className="objective-value">
              {averageScore}
            </div>
          </div>
        </div>

        <div
          className="bullout-main"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 12,
            alignItems: "start",
            marginTop: 20,
          }}
        >
          <div className="card" style={{ width: "100%" }}>
            <div
              className="row"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  minHeight: 82,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="small muted">
                  {t("Entered score")}
                </div>

                <div
                  className="title-lg"
                  style={{
                    height: 34,
                    lineHeight: "34px",
                  }}
                >
                  {scoreInput || "—"}
                </div>

                <div
                  className="muted small"
                  style={{
                    minHeight: 18,
                    lineHeight: "18px",
                  }}
                >
                  {scoreInput
                    ? isEnteredValid
                      ? t("Valid score")
                      : t("Not a possible 3-dart score")
                    : "\u00A0"}
                </div>
              </div>

              <button
                className="btn outline"
                type="button"
                onClick={handleUndo}
                disabled={!visits.length}
                data-hotkey="0"
              >
                {t("Undo")}
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {[
                  "7",
                  "8",
                  "9",
                  "4",
                  "5",
                  "6",
                  "1",
                  "2",
                  "3",
                ].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    className="btn"
                    onClick={() => appendDigit(digit)}
                  >
                    {digit}
                  </button>
                ))}

                <button
                  type="button"
                  className="btn outline"
                  onClick={backspace}
                  disabled={!scoreInput}
                >
                  ⌫
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => appendDigit("0")}
                >
                  0
                </button>

                <button
                  type="button"
                  className="btn success"
                  onClick={commitScore}
                  disabled={!scoreInput || !isEnteredValid}
                >
                  {t("Enter")}
                </button>
              </div>
            </div>
          </div>

          <div className="bullout-stats card" style={{ width: "100%" }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 900,
              textAlign: "center",
            }}
          >
            {totalScore}
          </div>

          <div
            className="muted"
            style={{ textAlign: "center" }}
          >
            {t("Total score")}
          </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
                marginTop: 16,
              }}
            >
              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Visit")}
                </div>
                <div className="pill-value">
                  {currentVisit}/{TOTAL_VISITS}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Average")}
                </div>
                <div className="pill-value">
                  {averageScore}
                </div>
              </div>
            </div>

            {visits.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="small muted">
                  {t("Last visit")}
                </div>

                <div className="title-lg">
                  {visits[visits.length - 1]}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .bullout-main {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}