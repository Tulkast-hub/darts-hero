import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DartboardHighlight, {
  tokensToSegments,
} from "../../ui/DartboardHighlight";
import { useI18n } from "../../i18n/I18nProvider";
import { useAssessmentStore } from "../../skills-assessment/useAssessmentStore";

type VisitSnapshot = {
  remainder: number;
  visit: number;
  visitsInLeg: number;
};

type LegResult = {
  darts: number;
  visits: number;
};

const START_SCORE = 101;
const TOTAL_LEGS = 5;

/* ---------------- CHECKOUT ROUTES ---------------- */

const PREFERRED_ROUTES: Record<number, string[]> = {
  101: ["T17", "18", "D16"],
  100: ["T20", "D20"],
  99: ["T19", "10", "D16"],
  98: ["T20", "D19"],
  97: ["T19", "D20"],
  96: ["T20", "D18"],
  95: ["T19", "D19"],
  94: ["T18", "D20"],
  93: ["T19", "D18"],
  92: ["T20", "D16"],
  91: ["T17", "D20"],
  90: ["T20", "D15"],
  89: ["T19", "D16"],
  88: ["T16", "D20"],
  87: ["T17", "D18"],
  86: ["T18", "D16"],
  85: ["T15", "D20"],
  84: ["T20", "D12"],
  83: ["T17", "D16"],
  82: ["T14", "D20"],
  81: ["T19", "D12"],
  80: ["T20", "D10"],
  79: ["T19", "D11"],
  78: ["T18", "D12"],
  77: ["T19", "D10"],
  76: ["T20", "D8"],
  75: ["T17", "D12"],
  74: ["T14", "D16"],
  73: ["T19", "D8"],
  72: ["T16", "D12"],
  71: ["T13", "D16"],
  70: ["T18", "D8"],
  69: ["T15", "D12"],
  68: ["T20", "D4"],
  67: ["T17", "D8"],
  66: ["T10", "D18"],
  65: ["25", "D20"],
  64: ["T16", "D8"],
  63: ["T13", "D12"],
  62: ["T10", "D16"],
  61: ["T15", "D8"],
  60: ["20", "D20"],
  59: ["19", "D20"],
  58: ["18", "D20"],
  57: ["17", "D20"],
  56: ["16", "D20"],
  55: ["15", "D20"],
  54: ["14", "D20"],
  53: ["13", "D20"],
  52: ["20", "D16"],
  51: ["19", "D16"],
  50: ["18", "D16"],
  49: ["17", "D16"],
  48: ["16", "D16"],
  47: ["15", "D16"],
  46: ["14", "D16"],
  45: ["13", "D16"],
  44: ["12", "D16"],
  43: ["11", "D16"],
  42: ["10", "D16"],
  41: ["9", "D16"],
  40: ["D20"],
  39: ["7", "D16"],
  38: ["D19"],
  37: ["5", "D16"],
  36: ["D18"],
  35: ["3", "D16"],
  34: ["D17"],
  33: ["1", "D16"],
  32: ["D16"],
  31: ["15", "D8"],
  30: ["D15"],
  29: ["13", "D8"],
  28: ["D14"],
  27: ["11", "D8"],
  26: ["D13"],
  25: ["9", "D8"],
  24: ["D12"],
  23: ["7", "D8"],
  22: ["D11"],
  21: ["5", "D8"],
  20: ["D10"],
  19: ["3", "D8"],
  18: ["D9"],
  17: ["1", "D8"],
  16: ["D8"],
  15: ["7", "D4"],
  14: ["D7"],
  13: ["5", "D4"],
  12: ["D6"],
  11: ["3", "D4"],
  10: ["D5"],
  9: ["1", "D4"],
  8: ["D4"],
  7: ["3", "D2"],
  6: ["D3"],
  5: ["1", "D2"],
  4: ["D2"],
  3: ["1", "D1"],
  2: ["D1"],
};

type Segment = {
  token: string;
  value: number;
  isDouble: boolean;
};

const NUMBER_ORDER = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
  10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];

const SINGLE_SEGMENTS: Segment[] = [
  ...NUMBER_ORDER.map((n) => ({
    token: String(n),
    value: n,
    isDouble: false,
  })),
  {
    token: "25",
    value: 25,
    isDouble: false,
  },
];

const TREBLE_SEGMENTS: Segment[] = NUMBER_ORDER.map((n) => ({
  token: `T${n}`,
  value: n * 3,
  isDouble: false,
}));

const DOUBLE_SEGMENTS: Segment[] = [
  ...NUMBER_ORDER.map((n) => ({
    token: `D${n}`,
    value: n * 2,
    isDouble: true,
  })),
  {
    token: "DBULL",
    value: 50,
    isDouble: true,
  },
];

const SCORE_SEGMENTS = [
  ...TREBLE_SEGMENTS,
  ...SINGLE_SEGMENTS,
  ...DOUBLE_SEGMENTS,
];

function searchRoute(score: number): string[] | null {
  for (const double of DOUBLE_SEGMENTS) {
    if (double.value === score) {
      return [double.token];
    }
  }

  for (const first of SCORE_SEGMENTS) {
    for (const double of DOUBLE_SEGMENTS) {
      if (first.value + double.value === score) {
        return [first.token, double.token];
      }
    }
  }

  for (const first of SCORE_SEGMENTS) {
    for (const second of SCORE_SEGMENTS) {
      for (const double of DOUBLE_SEGMENTS) {
        if (
          first.value +
            second.value +
            double.value ===
          score
        ) {
          return [
            first.token,
            second.token,
            double.token,
          ];
        }
      }
    }
  }

  return null;
}

function getSuggestedRoute(score: number): string[] {
  const preferred = PREFERRED_ROUTES[score];

  if (preferred?.length) {
    return preferred;
  }

  return searchRoute(score) ?? [];
}

/* ---------------- VALID VISIT SCORES ---------------- */

function buildPossible3DartScores(): Set<number> {
  const dartValues = new Set<number>([0]);

  for (let n = 1; n <= 20; n += 1) {
    dartValues.add(n);
    dartValues.add(n * 2);
    dartValues.add(n * 3);
  }

  dartValues.add(25);
  dartValues.add(50);

  const values = [...dartValues];
  const possible = new Set<number>();

  for (const a of values) {
    for (const b of values) {
      for (const c of values) {
        possible.add(a + b + c);
      }
    }
  }

  return possible;
}

const POSSIBLE_3DART_SCORES =
  buildPossible3DartScores();

function getValidCheckoutDartCounts(
  score: number
): number[] {
  const route = searchRoute(score);

  if (!route) return [];

  const minimum = route.length;

  const options: number[] = [];

  for (let darts = minimum; darts <= 3; darts += 1) {
    options.push(darts);
  }

  return options;
}

/* ---------------- COMPONENT ---------------- */

export default function Assessment101() {
  const { t } = useI18n();
  const nav = useNavigate();

  const setCheckout101Result = useAssessmentStore(
    (state) => state.setCheckout101Result
  );

  const [leg, setLeg] = useState(1);
  const [remainder, setRemainder] =
    useState(START_SCORE);

  const [scoreInput, setScoreInput] =
    useState("");

  const [visitsInLeg, setVisitsInLeg] =
    useState(0);

  const [legs, setLegs] = useState<LegResult[]>(
    []
  );

  const [undoStack, setUndoStack] = useState<
    VisitSnapshot[]
  >([]);

  const [checkoutOptions, setCheckoutOptions] =
    useState<number[] | null>(null);

  const suggestedRoute = useMemo(
    () => getSuggestedRoute(remainder),
    [remainder]
  );

  const suggestedSegments = useMemo(
    () => tokensToSegments(suggestedRoute),
    [suggestedRoute]
  );

  const enteredValue = scoreInput
    ? Number(scoreInput)
    : null;

  const isEnteredValid =
    enteredValue !== null &&
    POSSIBLE_3DART_SCORES.has(enteredValue);

  function appendDigit(digit: string) {
    setScoreInput((current) => {
      const next = `${current}${digit}`.replace(
        /^0+(?=\d)/,
        ""
      );

      if (next.length > 3) return current;

      const value = Number(next);

      if (value > 180) return current;

      return next;
    });
  }

  function backspace() {
    setScoreInput((current) =>
      current.slice(0, -1)
    );
  }

  function pushUndoSnapshot() {
    setUndoStack((current) => [
      ...current,
      {
        remainder,
        visit: leg,
        visitsInLeg,
      },
    ]);
  }

  function commitScore() {
    if (
      enteredValue === null ||
      !isEnteredValid
    ) {
      return;
    }

    const score = enteredValue;

    /* Exact checkout */
    if (score === remainder) {
      const validDarts =
        getValidCheckoutDartCounts(remainder);

      if (!validDarts.length) {
        return;
      }

      setScoreInput("");
      setCheckoutOptions(validDarts);
      return;
    }

    pushUndoSnapshot();

    const nextRemainder = remainder - score;
    const nextVisits = visitsInLeg + 1;

    setScoreInput("");

    /*
     * Double-out bust:
     * - score exceeds remaining
     * - leaves 1
     */
    if (
      nextRemainder < 0 ||
      nextRemainder === 1
    ) {
      setVisitsInLeg(nextVisits);
      return;
    }

    setRemainder(nextRemainder);
    setVisitsInLeg(nextVisits);
  }

  function confirmCheckout(
    dartsUsed: number
  ) {
    const completedVisits =
      visitsInLeg + 1;

    /*
     * Every previous visit = 3 darts.
     * Final visit uses selected number.
     */
    const totalDarts =
      visitsInLeg * 3 + dartsUsed;

    const result: LegResult = {
      darts: totalDarts,
      visits: completedVisits,
    };

    const updatedLegs = [...legs, result];

    setLegs(updatedLegs);
    setCheckoutOptions(null);
    setUndoStack([]);
    setScoreInput("");

    if (leg >= TOTAL_LEGS) {
      const allDarts = updatedLegs.reduce(
        (sum, item) => sum + item.darts,
        0
      );

      setCheckout101Result({
        legs: updatedLegs,
        totalDarts: allDarts,
        averageDarts: Number(
          (
            allDarts / updatedLegs.length
          ).toFixed(1)
        ),
      });

      return;
    }

    setLeg((current) => current + 1);
    setRemainder(START_SCORE);
    setVisitsInLeg(0);
  }

  function handleBust() {
    pushUndoSnapshot();
    setScoreInput("");
    setVisitsInLeg((current) => current + 1);
  }

  function handleUndo() {
    setUndoStack((current) => {
      if (!current.length) return current;

      const previous =
        current[current.length - 1];

      setRemainder(previous.remainder);
      setLeg(previous.visit);
      setVisitsInLeg(
        previous.visitsInLeg
      );
      setScoreInput("");

      return current.slice(0, -1);
    });
  }

  const complete =
    legs.length === TOTAL_LEGS;

  function continueAssessment() {
    nav("/skills-assessment/170");
  }

  React.useEffect(() => {
    function handleKeyboard(
      event: KeyboardEvent
    ) {
      if (checkoutOptions) return;

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
        setScoreInput("");
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
  });

  if (complete) {
    const totalDarts = legs.reduce(
      (sum, item) => sum + item.darts,
      0
    );

    const averageDarts = Number(
      (totalDarts / TOTAL_LEGS).toFixed(1)
    );

    return (
      <div className="page">
        <section className="hero card">
          <div>
            <div className="title">
              {t("Skills Assessment")} ·{" "}
              {t("101 Double Out")}
            </div>

            <div className="subtitle">
              <h2>
                {t("101 test complete")}
              </h2>
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
                  5
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
                  {t("Average darts")}
                </div>
                <div className="pill-value">
                  {averageDarts}
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
            {t("Skills Assessment")} ·{" "}
            {t("101 Double Out")}
          </div>

          <div className="subtitle">
            <h2>{t("101 Double Out")}</h2>

            <p>
              {t(
                "Finish 101 five times. Each leg must end on a double."
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="game-surface assessment-surface">
        <div className="bullout-header">
          <div>
            <div className="muted">
              {t("Leg")} {leg} {t("of")}{" "}
              {TOTAL_LEGS}
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
            segments={suggestedSegments}
          />

          <div
            style={{
              marginTop: 10,
              fontSize: 30,
              fontWeight: 900,
              textAlign: "center",
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
            style={{ width: "100%" }}
          >
            <div
              className="row"
              style={{
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div className="small muted">
                  {t("Entered score")}
                </div>

                <div
                  className="title-lg"
                  style={{ minHeight: 34 }}
                >
                  {scoreInput || "—"}
                </div>

                {scoreInput && (
                  <div className="muted small">
                    {isEnteredValid
                      ? t("Valid score")
                      : t(
                          "Not a possible 3-dart score"
                        )}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
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

            <div style={{ marginTop: 12 }}>
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
            style={{ width: "100%" }}
          >
            <div
              style={{
                fontSize: 60,
                fontWeight: 900,
                textAlign: "center",
              }}
            >
              {remainder}
            </div>

            <div
              className="muted"
              style={{ textAlign: "center" }}
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
                  {leg}/5
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
          </div>
        </div>
      </div>

      {checkoutOptions && (
        <div
          className="modal-backdrop"
          role="presentation"
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-darts-title"
            style={{
              maxWidth: 420,
              width: "calc(100% - 32px)",
            }}
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
              }}
            >
              {checkoutOptions.map(
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