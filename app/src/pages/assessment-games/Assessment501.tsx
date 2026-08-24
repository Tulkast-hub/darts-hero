import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DartboardHighlight, {
  tokensToSegments,
} from "../../ui/DartboardHighlight";
import { useI18n } from "../../i18n/I18nProvider";
import { useAssessmentStore } from "../../skills-assessment/useAssessmentStore";
import {
  getSuggestedRoute,
  getValidDoubleDartCounts,
  getCheckoutDartsFromDoubleAttempts,
  POSSIBLE_3DART_SCORES,
} from "../../skills-assessment/checkoutUtils";

type VisitSnapshot = {
  remainder: number;
  leg: number;
  visitsInLeg: number;
  visitScores: number[];
};

type LegResult = {
  darts: number;
  visits: number;
  visitScores: number[];
  checkoutDarts: number;
  doubleDarts: number;
};

const START_SCORE = 501;
const TOTAL_LEGS = 5;

export default function Assessment501() {
  const { t } = useI18n();
  const nav = useNavigate();

  const setGame501Result = useAssessmentStore(
    (state) => state.setGame501Result
  );

  const [leg, setLeg] = useState(1);
  const [remainder, setRemainder] = useState(START_SCORE);
  const [scoreInput, setScoreInput] = useState("");
  const [visitsInLeg, setVisitsInLeg] = useState(0);
  const [visitScores, setVisitScores] = useState<number[]>([]);
  const [legs, setLegs] = useState<LegResult[]>([]);
  const [undoStack, setUndoStack] = useState<VisitSnapshot[]>([]);

  const [doubleDartOptions, setDoubleDartOptions] = useState<
    number[] | null
  >(null);

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

      if (next.length > 3) {
        return current;
      }

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
        leg,
        visitsInLeg,
        visitScores,
      },
    ]);
  }

  function commitScore() {
    if (enteredValue === null || !isEnteredValid) {
      return;
    }

    const score = enteredValue;

    /*
     * Exact remaining score:
     * only allow it if this can be completed
     * as a legal double-out checkout.
     *
     * The modal asks how many darts were thrown
     * at doubles, rather than total darts used
     * in the successful visit.
     */
    if (score === remainder) {
      const validDoubleDarts =
        getValidDoubleDartCounts(remainder);

      if (!validDoubleDarts.length) {
        return;
      }

      setScoreInput("");
      setDoubleDartOptions(validDoubleDarts);
      return;
    }

    pushUndoSnapshot();

    const nextRemainder = remainder - score;
    const nextVisits = visitsInLeg + 1;

    setScoreInput("");

    /*
     * Double-out bust:
     * - score exceeds remaining score
     * - leaves exactly 1
     *
     * The visit still counts as 3 darts,
     * but no score is credited to the leg.
     */
    if (nextRemainder < 0 || nextRemainder === 1) {
      setVisitsInLeg(nextVisits);
      setVisitScores((current) => [...current, 0]);
      return;
    }

    setRemainder(nextRemainder);
    setVisitsInLeg(nextVisits);
    setVisitScores((current) => [...current, score]);
  }

  function confirmCheckout(doubleDarts: number) {
    /*
     * Infer total darts used in the successful
     * visit from the preferred checkout route
     * and the actual number of double attempts.
     */
    const checkoutDarts =
      getCheckoutDartsFromDoubleAttempts(
        remainder,
        doubleDarts
      );

    const completedVisits = visitsInLeg + 1;

    /*
     * Every previous visit uses 3 darts.
     * The final visit uses the inferred number
     * of checkout darts.
     */
    const totalDarts =
      visitsInLeg * 3 + checkoutDarts;

    /*
     * The remaining score is exactly what
     * was scored in the successful final visit.
     */
    const completedVisitScores = [
      ...visitScores,
      remainder,
    ];

    const result: LegResult = {
      darts: totalDarts,
      visits: completedVisits,
      visitScores: completedVisitScores,
      checkoutDarts,
      doubleDarts,
    };

    const updatedLegs = [
      ...legs,
      result,
    ];

    setLegs(updatedLegs);
    setDoubleDartOptions(null);
    setUndoStack([]);
    setScoreInput("");

    if (leg >= TOTAL_LEGS) {
      const totalDartsUsed =
        updatedLegs.reduce(
          (sum, item) => sum + item.darts,
          0
        );

      const totalScore =
        START_SCORE * TOTAL_LEGS;

      const threeDartAverage = Number(
        (
          (totalScore / totalDartsUsed) *
          3
        ).toFixed(2)
      );

      setGame501Result({
        legs: updatedLegs,
        totalDarts: totalDartsUsed,
        totalScore,
        threeDartAverage,
      });

      return;
    }

    setLeg((current) => current + 1);
    setRemainder(START_SCORE);
    setVisitsInLeg(0);
    setVisitScores([]);
  }

  function handleBust() {
    pushUndoSnapshot();

    setScoreInput("");
    setVisitsInLeg(
      (current) => current + 1
    );

    /*
     * Store 0 because a bust visit consumes
     * the visit but does not reduce the score.
     */
    setVisitScores(
      (current) => [...current, 0]
    );
  }

  function handleUndo() {
    setUndoStack((current) => {
      if (!current.length) {
        return current;
      }

      const previous =
        current[current.length - 1];

      setRemainder(previous.remainder);
      setLeg(previous.leg);
      setVisitsInLeg(
        previous.visitsInLeg
      );
      setVisitScores(
        previous.visitScores
      );
      setScoreInput("");

      return current.slice(0, -1);
    });
  }

  const complete =
    legs.length === TOTAL_LEGS;

  function continueAssessment() {
    nav("/skills-assessment/results");
  }

  React.useEffect(() => {
    function handleKeyboard(
      event: KeyboardEvent
    ) {
      if (doubleDartOptions) {
        return;
      }

      if (
        event.key >= "0" &&
        event.key <= "9"
      ) {
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

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, [
    doubleDartOptions,
    scoreInput,
    remainder,
    visitsInLeg,
    enteredValue,
    isEnteredValid,
  ]);

  if (complete) {
    const totalDarts = legs.reduce(
      (sum, item) => sum + item.darts,
      0
    );

    const totalScore =
      START_SCORE * TOTAL_LEGS;

    const threeDartAverage = Number(
      (
        (totalScore / totalDarts) *
        3
      ).toFixed(2)
    );

    const totalDoubleDarts =
      legs.reduce(
        (sum, item) =>
          sum + item.doubleDarts,
        0
      );

    /*
     * Every completed leg has one
     * successful finishing double.
     */
    const doublePercentage = Number(
      (
        (TOTAL_LEGS /
          totalDoubleDarts) *
        100
      ).toFixed(1)
    );

    return (
      <div className="page">
        <section className="hero card">
          <div>
            <div className="title">
              {t("Skills Assessment")} ·{" "}
              {t("501")}
            </div>

            <div className="subtitle">
              <h2>
                {t("501 test complete")}
              </h2>

              <p>
                {t(
                  "You completed all five 501 legs."
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="card result-card">
          <div className="result-main">
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Legs")}
                </div>

                <div className="pill-value">
                  {TOTAL_LEGS}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Total darts")}
                </div>

                <div className="pill-value">
                  {totalDarts}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("501 average")}
                </div>

                <div className="pill-value">
                  {threeDartAverage}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Double %")}
                </div>

                <div className="pill-value">
                  {doublePercentage}%
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
              {t("View results")}
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
            {t("Skills Assessment")} ·{" "}
            {t("501")}
          </div>

          <div className="subtitle">
            <h2>{t("501")}</h2>

            <p>
              {t(
                "Play five complete 501 legs. Enter the total score after each visit and finish every leg on a double."
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="game-surface assessment-surface">
        <div className="bullout-header">
          <div>
            <div className="muted">
              {t("Leg")} {leg}{" "}
              {t("of")} {TOTAL_LEGS}
            </div>

            <div className="muted">
              {t(
                "Enter the score from each visit."
              )}
            </div>
          </div>

          <div className="objective-pill">
            <div className="objective-label">
              {t("Score left")}
            </div>

            <div className="objective-value">
              {remainder}
            </div>
          </div>
        </div>

        <div
          className="assessment-board"
          style={{
            marginTop: 16,
            marginBottom: 28,
          }}
        >
          <DartboardHighlight
            segments={
              remainder <= 170
                ? suggestedSegments
                : []
            }
          />

          <div
            style={{
              minHeight: 46,
              marginTop: 10,
              fontSize: 30,
              fontWeight: 900,
              textAlign: "center",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {remainder <= 170 &&
            suggestedRoute.length > 0
              ? suggestedRoute.join(" ")
              : "\u00A0"}
          </div>
        </div>

        <div
          className="bullout-main"
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr",
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
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  minHeight: 82,
                  display: "flex",
                  flexDirection:
                    "column",
                  justifyContent:
                    "flex-start",
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
                      : t(
                          "Not a possible 3-dart score"
                        )
                    : "\u00A0"}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent:
                    "flex-end",
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
                  disabled={
                    !undoStack.length
                  }
                  data-hotkey="0"
                >
                  {t("Undo")}
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
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
                    onClick={() =>
                      appendDigit(digit)
                    }
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
                  onClick={() =>
                    appendDigit("0")
                  }
                >
                  0
                </button>

                <button
                  type="button"
                  className="btn success"
                  onClick={commitScore}
                  disabled={
                    !scoreInput ||
                    !isEnteredValid
                  }
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
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 10,
                marginTop: 16,
              }}
            >
              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Leg")}
                </div>

                <div className="pill-value">
                  {leg}/{TOTAL_LEGS}
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  {t("Visits")}
                </div>

                <div className="pill-value">
                  {visitsInLeg}
                </div>
              </div>
            </div>

            {visitScores.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="small muted">
                  {t("Last visit")}
                </div>

                <div className="title-lg">
                  {
                    visitScores[
                      visitScores.length - 1
                    ]
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {doubleDartOptions && (
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
                "How many darts did you throw at a double?"
              )}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${doubleDartOptions.length}, 1fr)`,
                gap: 10,
                marginTop: 16,
              }}
            >
              {doubleDartOptions.map(
                (darts) => (
                  <button
                    key={darts}
                    type="button"
                    className="btn"
                    onClick={() =>
                      confirmCheckout(darts)
                    }
                  >
                    {darts}
                  </button>
                )
              )}
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