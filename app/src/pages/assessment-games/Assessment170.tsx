import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DartboardHighlight, {
  tokensToSegments,
} from "../../ui/DartboardHighlight";
import { useI18n } from "../../i18n/I18nProvider";
import { useAssessmentStore } from "../../skills-assessment/useAssessmentStore";
import {
  getSuggestedRoute,
  getValidCheckoutDartCounts,
  POSSIBLE_3DART_SCORES,
} from "../../skills-assessment/checkoutUtils";

type VisitSnapshot = {
  remainder: number;
  attempt: number;
  visitsInAttempt: number;
  visitScores: number[];
};

type AttemptResult = {
  darts: number;
  visits: number;
  visitScores: number[];
  checkoutDarts: number;
};

const START_SCORE = 170;
const TOTAL_ATTEMPTS = 5;

export default function Assessment170() {
  const { t } = useI18n();
  const nav = useNavigate();

  const setFinish170Result = useAssessmentStore(
    (state) => state.setFinish170Result
  );

  const [attempt, setAttempt] = useState(1);
  const [remainder, setRemainder] = useState(START_SCORE);
  const [scoreInput, setScoreInput] = useState("");
  const [visitsInAttempt, setVisitsInAttempt] = useState(0);
  const [visitScores, setVisitScores] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [undoStack, setUndoStack] = useState<VisitSnapshot[]>([]);
  const [checkoutOptions, setCheckoutOptions] = useState<number[] | null>(
    null
  );

  const suggestedRoute = useMemo(
    () => getSuggestedRoute(remainder),
    [remainder]
  );

  const suggestedSegments = useMemo(
    () => tokensToSegments(suggestedRoute),
    [suggestedRoute]
  );

  const enteredValue = scoreInput ? Number(scoreInput) : null;

  const isEnteredValid =
    enteredValue !== null &&
    enteredValue >= 0 &&
    enteredValue <= 180 &&
    POSSIBLE_3DART_SCORES.has(enteredValue);

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

  function pushUndoSnapshot() {
    setUndoStack((current) => [
      ...current,
      {
        remainder,
        attempt,
        visitsInAttempt,
        visitScores,
      },
    ]);
  }

  function commitScore() {
    if (enteredValue === null || !isEnteredValid) {
      return;
    }

    const score = enteredValue;

    if (score === remainder) {
      const validDarts = getValidCheckoutDartCounts(remainder);

      if (!validDarts.length) {
        return;
      }

      setScoreInput("");
      setCheckoutOptions(validDarts);
      return;
    }

    pushUndoSnapshot();

    const nextRemainder = remainder - score;
    const nextVisits = visitsInAttempt + 1;

    setScoreInput("");

    /*
     * Bust:
     * - score exceeds remainder
     * - leaves 1
     *
     * The visit still counts, but the remainder stays unchanged.
     */
    if (nextRemainder < 0 || nextRemainder === 1) {
      setVisitsInAttempt(nextVisits);
      setVisitScores((current) => [...current, 0]);
      return;
    }

    setRemainder(nextRemainder);
    setVisitsInAttempt(nextVisits);
    setVisitScores((current) => [...current, score]);
  }

  function confirmCheckout(dartsUsed: number) {
    const completedVisits = visitsInAttempt + 1;

    const totalDarts =
      visitsInAttempt * 3 + dartsUsed;

    const completedScores = [...visitScores, remainder];

    const result: AttemptResult = {
      darts: totalDarts,
      visits: completedVisits,
      visitScores: completedScores,
      checkoutDarts: dartsUsed,
    };

    const updatedAttempts = [...attempts, result];

    setAttempts(updatedAttempts);
    setCheckoutOptions(null);
    setUndoStack([]);
    setScoreInput("");

    if (attempt >= TOTAL_ATTEMPTS) {
      const totalDartsUsed = updatedAttempts.reduce(
        (sum, item) => sum + item.darts,
        0
      );

      setFinish170Result({
        attempts: updatedAttempts,
        totalDarts: totalDartsUsed,
        averageDarts: Number(
          (totalDartsUsed / updatedAttempts.length).toFixed(1)
        ),
      });

      return;
    }

    setAttempt((current) => current + 1);
    setRemainder(START_SCORE);
    setVisitsInAttempt(0);
    setVisitScores([]);
  }

  function handleBust() {
    pushUndoSnapshot();

    setScoreInput("");
    setVisitsInAttempt((current) => current + 1);
    setVisitScores((current) => [...current, 0]);
  }

  function handleUndo() {
    setUndoStack((current) => {
      if (!current.length) {
        return current;
      }

      const previous = current[current.length - 1];

      setRemainder(previous.remainder);
      setAttempt(previous.attempt);
      setVisitsInAttempt(previous.visitsInAttempt);
      setVisitScores(previous.visitScores);
      setScoreInput("");

      return current.slice(0, -1);
    });
  }

  const complete = attempts.length === TOTAL_ATTEMPTS;

  function continueAssessment() {
    nav("/skills-assessment/scoring");
  }

  React.useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (checkoutOptions) {
        return;
      }

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
    checkoutOptions,
    scoreInput,
    remainder,
    visitsInAttempt,
    enteredValue,
    isEnteredValid,
  ]);

  if (complete) {
    const totalDarts = attempts.reduce(
      (sum, item) => sum + item.darts,
      0
    );

    const averageDarts = Number(
      (totalDarts / TOTAL_ATTEMPTS).toFixed(1)
    );

    return (
      <div className="page">
        <section className="hero card">
          <div>
            <div className="title">
              {t("Skills Assessment")} · {t("170 Finish")}
            </div>

            <div className="subtitle">
              <h2>{t("170 test complete")}</h2>

              <p>
                {t(
                  "You completed all five 170 finishing attempts."
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="card result-card">
          <div className="result-main">
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">{t("Attempts")}</div>
                <div className="pill-value">{TOTAL_ATTEMPTS}</div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">{t("Total darts")}</div>
                <div className="pill-value">{totalDarts}</div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">{t("Average darts")}</div>
                <div className="pill-value">{averageDarts}</div>
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
            {t("Skills Assessment")} · {t("170 Finish")}
          </div>

          <div className="subtitle">
            <h2>{t("170 Finish")}</h2>

            <p>
              {t(
                "Finish 170 five times. Each attempt must end on a double."
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="game-surface assessment-surface">
        <div className="bullout-header">
          <div>
            <div className="muted">
              {t("Attempt")} {attempt} {t("of")} {TOTAL_ATTEMPTS}
            </div>

            <div className="muted">
              {t("Enter the score from each visit.")}
            </div>
          </div>

          <div className="objective-pill">
            <div className="objective-label">{t("Score left")}</div>
            <div className="objective-value">{remainder}</div>
          </div>
        </div>

        <div
          className="assessment-board"
          style={{
            marginTop: 16,
            marginBottom: 28,
          }}
        >
          <DartboardHighlight segments={suggestedSegments} />

          <div
            style={{
              marginTop: 10,
              fontSize: 30,
              fontWeight: 900,
              textAlign: "center",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {suggestedRoute.length
              ? suggestedRoute.join(" ")
              : "—"}
          </div>
        </div>

        <div
          className="bullout-main"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 12,
            alignItems: "start",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
            }}
          >
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
                  justifyContent: "flex-start",
                }}
              >
                <div className="small muted">
                  {t("Entered score")}
                </div>

                <div
                  className="title-lg"
                  style={{
                    height: 40 ,
                    lineHeight: "36px",
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

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="btn secondary"
                  type="button"
                  onClick={handleBust}
                >
                  {t("Bust")}
                </button>

                <button
                  className="btn outline"
                  type="button"
                  onClick={handleUndo}
                  disabled={!undoStack.length}
                  data-hotkey="0"
                >
                  {t("Undo")}
                </button>
              </div>
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

          <div
            className="bullout-stats card"
            style={{
              width: "100%",
            }}
          >
            <div
              style={{
                fontSize: 60,
                fontWeight: 900,
                textAlign: "center",
                letterSpacing: 1,
              }}
            >
              {remainder}
            </div>

            <div
              className="muted"
              style={{
                textAlign: "center",
              }}
            >
              {t("Score left")}
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
                <div className="pill-label">{t("Attempt")}</div>

                <div className="pill-value">
                  {attempt}/{TOTAL_ATTEMPTS}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">{t("Visits")}</div>

                <div className="pill-value">{visitsInAttempt}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {checkoutOptions && (
        <div
          className="assessment-modal-backdrop"
          role="presentation"
        >
          <div
            className="card assessment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-darts-title"
          >
            <h2 id="checkout-darts-title">
              {t("Checkout complete")}
            </h2>

            <p className="muted">
              {t(
                "How many darts did you use on this visit?"
              )}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${checkoutOptions.length}, 1fr)`,
                gap: 10,
                marginTop: 16,
              }}
            >
              {checkoutOptions.map((darts) => (
                <button
                  key={darts}
                  type="button"
                  className="btn"
                  onClick={() => confirmCheckout(darts)}
                >
                  {darts}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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