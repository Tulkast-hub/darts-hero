import React, {
  useMemo,
  useState,
} from "react";

import DartboardHighlight, {
  tokensToSegments,
} from "../ui/DartboardHighlight";

import type { Tier } from "../xp/types";

type FinishResult = {
  payload: any;
  win: boolean;
};

type Props = {
  onFinish: (
    result: FinishResult
  ) => void;

  disabled?: boolean;

  tier: Tier;

  level: number;

  onDartsUsed?: (
    count: number
  ) => void;

  externalUndo?: {
    token: number;
    steps: number;
  };
};

type RankConfig41 = {
  labelLong: string;
  objectiveShort: string;
  targetCheckout: number;
};

type ThrowEvent = {
  target: number;
  isHit: boolean;
};

const INITIAL_TARGET = 41;

const MAX_THROWS = 70;

/* ---------------- RANK CONFIG ---------------- */

function getRankConfig41(
  tier: Tier,
  level: number
): RankConfig41 {
  if (tier === "Bronze") {
    return {
      labelLong:
        "Finish 61",
      objectiveShort:
        "Finish 61",
      targetCheckout: 61,
    };
  }

  if (tier === "Silver") {
    return {
      labelLong:
        "Finish 51",
      objectiveShort:
        "Finish 51",
      targetCheckout: 51,
    };
  }

  if (tier === "Gold") {
    return {
      labelLong:
        "Finish 61",
      objectiveShort:
        "Finish 61",
      targetCheckout: 61,
    };
  }

  if (
    tier === "Platinum"
  ) {
    return {
      labelLong:
        "Finish 67",
      objectiveShort:
        "Finish 67",
      targetCheckout: 67,
    };
  }

  if (
    tier === "Diamond"
  ) {
    return {
      labelLong:
        "Finish 75",
      objectiveShort:
        "Finish 75",
      targetCheckout: 75,
    };
  }

  return {
    labelLong:
      "Finish 61",
    objectiveShort:
      "Finish 61",
    targetCheckout: 61,
  };
}

/* ---------------- CHECKOUT SUGGESTIONS ---------------- */

const PREFERRED_ROUTES: Record<
  number,
  string[]
> = {
  170: [
    "T20",
    "T20",
    "DBULL",
  ],

  169: [],

  168: [],

  167: [
    "T20",
    "T19",
    "DBULL",
  ],

  166: [],

  165: [],

  164: [
    "T20",
    "T18",
    "DBULL",
  ],

  163: [],

  162: [],

  161: [
    "T20",
    "T17",
    "DBULL",
  ],

  160: [
    "T20",
    "T20",
    "D20",
  ],

  159: [],

  158: [
    "T20",
    "T20",
    "D19",
  ],

  157: [
    "T20",
    "T19",
    "D20",
  ],

  156: [
    "T20",
    "T20",
    "D18",
  ],

  155: [
    "T20",
    "T19",
    "D19",
  ],

  154: [
    "T20",
    "T18",
    "D20",
  ],

  153: [
    "T20",
    "T19",
    "D18",
  ],

  152: [
    "T20",
    "T20",
    "D16",
  ],

  151: [
    "T20",
    "T17",
    "D20",
  ],

  150: [
    "T20",
    "T18",
    "D18",
  ],

  149: [
    "T20",
    "T19",
    "D16",
  ],

  148: [
    "T20",
    "T16",
    "D20",
  ],

  147: [
    "T20",
    "T17",
    "D18",
  ],

  146: [
    "T20",
    "T18",
    "D16",
  ],

  145: [
    "T20",
    "T15",
    "D20",
  ],

  144: [
    "T20",
    "T20",
    "D12",
  ],

  143: [
    "T20",
    "T17",
    "D16",
  ],

  142: [
    "T20",
    "T14",
    "D20",
  ],

  141: [
    "T20",
    "T19",
    "D12",
  ],

  140: [
    "T20",
    "T16",
    "D16",
  ],

  139: [
    "T20",
    "T13",
    "D20",
  ],

  138: [
    "T20",
    "T18",
    "D12",
  ],

  137: [
    "T20",
    "T19",
    "D10",
  ],

  136: [
    "T20",
    "T20",
    "D8",
  ],

  135: [
    "T20",
    "T17",
    "D12",
  ],

  134: [
    "T20",
    "T14",
    "D16",
  ],

  133: [
    "T20",
    "T19",
    "D8",
  ],

  132: [
    "T20",
    "T16",
    "D12",
  ],

  131: [
    "T20",
    "T13",
    "D16",
  ],

  130: [
    "T20",
    "T20",
    "D5",
  ],

  129: [
    "T19",
    "T16",
    "D12",
  ],

  128: [
    "T18",
    "T14",
    "D16",
  ],

  127: [
    "T20",
    "T17",
    "D8",
  ],

  126: [
    "T19",
    "T19",
    "D6",
  ],

  125: [
    "25",
    "T20",
    "D20",
  ],

  124: [
    "T20",
    "T16",
    "D8",
  ],

  123: [
    "T19",
    "T16",
    "D9",
  ],

  122: [
    "T18",
    "T20",
    "D4",
  ],

  121: [
    "T17",
    "T10",
    "D20",
  ],

  120: [
    "T20",
    "20",
    "D20",
  ],

  119: [
    "T19",
    "T12",
    "D13",
  ],

  118: [
    "T20",
    "18",
    "D20",
  ],

  117: [
    "T20",
    "17",
    "D20",
  ],

  116: [
    "T20",
    "16",
    "D20",
  ],

  115: [
    "T20",
    "15",
    "D20",
  ],

  114: [
    "T20",
    "14",
    "D20",
  ],

  113: [
    "T20",
    "13",
    "D20",
  ],

  112: [
    "T20",
    "20",
    "D16",
  ],

  111: [
    "T19",
    "20",
    "D16",
  ],

  110: [
    "T20",
    "18",
    "D16",
  ],

  109: [
    "T20",
    "17",
    "D16",
  ],

  108: [
    "T20",
    "16",
    "D16",
  ],

  107: [
    "T19",
    "18",
    "D16",
  ],

  106: [
    "T20",
    "10",
    "D18",
  ],

  105: [
    "T20",
    "13",
    "D16",
  ],

  104: [
    "T18",
    "18",
    "D16",
  ],

  103: [
    "T20",
    "11",
    "D16",
  ],

  102: [
    "T20",
    "10",
    "D16",
  ],

  101: [
    "T17",
    "18",
    "D16",
  ],

  100: [
    "T20",
    "D20",
  ],

  99: [
    "T19",
    "10",
    "D16",
  ],

  98: [
    "T20",
    "D19",
  ],

  97: [
    "T19",
    "D20",
  ],

  96: [
    "T20",
    "D18",
  ],

  95: [
    "T19",
    "D19",
  ],

  94: [
    "T18",
    "D20",
  ],

  93: [
    "T19",
    "D18",
  ],

  92: [
    "T20",
    "D16",
  ],

  91: [
    "T17",
    "D20",
  ],

  90: [
    "T20",
    "D15",
  ],

  89: [
    "T19",
    "D16",
  ],

  88: [
    "T16",
    "D20",
  ],

  87: [
    "T17",
    "D18",
  ],

  86: [
    "T18",
    "D16",
  ],

  85: [
    "T15",
    "D20",
  ],

  84: [
    "T20",
    "D12",
  ],

  83: [
    "T17",
    "D16",
  ],

  82: [
    "T14",
    "D20",
  ],

  81: [
    "T19",
    "D12",
  ],

  80: [
    "T20",
    "D10",
  ],

  79: [
    "T19",
    "D11",
  ],

  78: [
    "T18",
    "D12",
  ],

  77: [
    "T19",
    "D10",
  ],

  76: [
    "T20",
    "D8",
  ],

  75: [
    "T17",
    "D12",
  ],

  74: [
    "T14",
    "D16",
  ],

  73: [
    "T19",
    "D8",
  ],

  72: [
    "T16",
    "D12",
  ],

  71: [
    "T13",
    "D16",
  ],

  70: [
    "T18",
    "D8",
  ],

  69: [
    "T15",
    "D12",
  ],

  68: [
    "T20",
    "D4",
  ],

  67: [
    "T17",
    "D8",
  ],

  66: [
    "T10",
    "D18",
  ],

  65: [
    "25",
    "D20",
  ],

  64: [
    "T16",
    "D8",
  ],

  63: [
    "T13",
    "D12",
  ],

  62: [
    "T10",
    "D16",
  ],

  61: [
    "25",
    "D18",
  ],

  60: [
    "20",
    "D20",
  ],

  41: [
    "9",
    "D16",
  ],

  42: [
    "10",
    "D16",
  ],

  43: [
    "3",
    "D20",
  ],

  44: [
    "4",
    "D20",
  ],

  45: [
    "13",
    "D16",
  ],

  46: [
    "6",
    "D20",
  ],

  47: [
    "7",
    "D20",
  ],

  48: [
    "16",
    "D16",
  ],

  49: [
    "17",
    "D16",
  ],

  50: [
    "18",
    "D16",
  ],

  51: [
    "19",
    "D16",
  ],

  52: [
    "20",
    "D16",
  ],

  53: [
    "13",
    "D20",
  ],

  54: [
    "14",
    "D20",
  ],

  55: [
    "15",
    "D20",
  ],

  56: [
    "16",
    "D20",
  ],

  57: [
    "17",
    "D20",
  ],

  58: [
    "18",
    "D20",
  ],

  59: [
    "19",
    "D20",
  ],
};

type Seg = {
  token: string;
  value: number;
  isDouble: boolean;
};

const NUMBER_ORDER = [
  20,
  19,
  18,
  17,
  16,
  15,
  14,
  13,
  12,
  11,
  10,
  9,
  8,
  7,
  6,
  5,
  4,
  3,
  2,
  1,
];

const SINGLE_SEGMENTS: Seg[] = [
  ...NUMBER_ORDER.map(
    (number) => ({
      token:
        String(number),
      value:
        number,
      isDouble:
        false,
    })
  ),

  {
    token: "25",
    value: 25,
    isDouble: false,
  },
];

const TREBLE_SEGMENTS: Seg[] =
  NUMBER_ORDER.map(
    (number) => ({
      token:
        `T${number}`,

      value:
        3 * number,

      isDouble:
        false,
    })
  );

const DOUBLE_SEGMENTS: Seg[] = [
  ...NUMBER_ORDER.map(
    (number) => ({
      token:
        `D${number}`,

      value:
        2 * number,

      isDouble:
        true,
    })
  ),

  {
    token:
      "DBULL",
    value: 50,
    isDouble: true,
  },
];

const SCORE_SEGMENTS:
  Seg[] = [
  ...TREBLE_SEGMENTS,
  ...SINGLE_SEGMENTS,
];

function searchRoute(
  score: number
): string[] | null {
  if (
    score < 2 ||
    score > 170
  ) {
    return null;
  }

  // 1-dart finish
  for (
    const double of
    DOUBLE_SEGMENTS
  ) {
    if (
      double.value ===
      score
    ) {
      return [
        double.token,
      ];
    }
  }

  // 2-dart finish
  for (
    const first of
    SCORE_SEGMENTS
  ) {
    for (
      const double of
      DOUBLE_SEGMENTS
    ) {
      if (
        first.value +
          double.value ===
        score
      ) {
        return [
          first.token,
          double.token,
        ];
      }
    }
  }

  // 3-dart finish
  for (
    const first of
    SCORE_SEGMENTS
  ) {
    for (
      const second of
      SCORE_SEGMENTS
    ) {
      for (
        const double of
        DOUBLE_SEGMENTS
      ) {
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

function getSuggestedRoute(
  score: number
): string[] {
  const fromMap =
    PREFERRED_ROUTES[
      score
    ];

  if (
    fromMap &&
    fromMap.length > 0
  ) {
    return fromMap;
  }

  const fromSearch =
    searchRoute(score);

  if (fromSearch) {
    return fromSearch;
  }

  return [];
}

/* ---------------- COMPONENT ---------------- */

export default function Checkout41({
  onFinish,
  disabled,
  tier,
  level,
  onDartsUsed,
  externalUndo,
}: Props) {
  const rankConfig =
    useMemo(
      () =>
        getRankConfig41(
          tier,
          level
        ),
      [
        tier,
        level,
      ]
    );

  const [
    currentTarget,
    setCurrentTarget,
  ] = useState(
    INITIAL_TARGET
  );

  const [
    throwHistory,
    setThrowHistory,
  ] = useState<
    ThrowEvent[]
  >([]);

  const [
    peakCheckout,
    setPeakCheckout,
  ] = useState(
    INITIAL_TARGET
  );

  const [
    checkoutCount,
    setCheckoutCount,
  ] = useState(0);

  const [
    currentStreak,
    setCurrentStreak,
  ] = useState(0);

  const [
    bestStreak,
    setBestStreak,
  ] = useState(0);

  const [
    finished,
    setFinished,
  ] = useState(false);

  const throwsUsedTotal =
    throwHistory.length;

  const throwsLeft =
    Math.max(
      0,
      MAX_THROWS -
        throwsUsedTotal
    );

  const throwsLeftText =
    String(throwsLeft);

  const suggestedRoute =
    useMemo(
      () =>
        getSuggestedRoute(
          currentTarget
        ),
      [
        currentTarget,
      ]
    );

  const suggestedSegments =
    useMemo(
      () =>
        tokensToSegments(
          suggestedRoute
        ),
      [
        suggestedRoute,
      ]
    );

  const accuracy =
    throwsUsedTotal > 0
      ? Math.round(
          (
            checkoutCount /
            throwsUsedTotal
          ) * 100
        )
      : 0;

  const avgThrowsPerCheckout =
    checkoutCount > 0
      ? (
          throwsUsedTotal /
          checkoutCount
        ).toFixed(1)
      : "—";

  /* --------- RECOMPUTE STATE FOR UNDO --------- */

  function recomputeDerivedState(
    events: ThrowEvent[]
  ) {
    let target =
      INITIAL_TARGET;

    let peak =
      INITIAL_TARGET;

    let hits = 0;

    let bestLocal = 0;

    let currentLocal = 0;

    events.forEach(
      (event) => {
        if (
          event.isHit
        ) {
          hits += 1;

          if (
            event.target >
            peak
          ) {
            peak =
              event.target;
          }

          currentLocal +=
            1;

          if (
            currentLocal >
            bestLocal
          ) {
            bestLocal =
              currentLocal;
          }

          target += 1;
        } else {
          currentLocal = 0;
        }
      }
    );

    setCurrentTarget(
      target
    );

    setPeakCheckout(
      peak
    );

    setCheckoutCount(
      hits
    );

    setCurrentStreak(
      currentLocal
    );

    setBestStreak(
      bestLocal
    );
  }

  /* --------- WIN LOGIC --------- */

  function checkWin(
    checkoutTarget: number
  ): boolean {
    return (
      checkoutTarget >=
      rankConfig.targetCheckout
    );
  }

  function buildFinishes(
    events: ThrowEvent[]
  ): {
    target: number;
    throwNumber: number;
  }[] {
    const finishes: {
      target: number;
      throwNumber: number;
    }[] = [];

    events.forEach(
      (
        event,
        index
      ) => {
        if (
          event.isHit
        ) {
          finishes.push({
            target:
              event.target,

            throwNumber:
              index + 1,
          });
        }
      }
    );

    return finishes;
  }

  function finishGame(
    win: boolean,
    finalHistory:
      ThrowEvent[]
  ) {
    if (finished) {
      return;
    }

    const finalThrowsUsed =
      finalHistory.length;

    const finishes =
      buildFinishes(
        finalHistory
      );

    const finalCheckoutCount =
      finishes.length;

    const finalPeak =
      finishes.length > 0
        ? Math.max(
            INITIAL_TARGET,
            ...finishes.map(
              (finish) =>
                finish.target
            )
          )
        : INITIAL_TARGET;

    let streak = 0;

    let finalBestStreak =
      0;

    finalHistory.forEach(
      (event) => {
        if (
          event.isHit
        ) {
          streak += 1;

          finalBestStreak =
            Math.max(
              finalBestStreak,
              streak
            );
        } else {
          streak = 0;
        }
      }
    );

    const finalAccuracy =
      finalThrowsUsed > 0
        ? Math.round(
            (
              finalCheckoutCount /
              finalThrowsUsed
            ) * 100
          )
        : 0;

    const avg =
      finalCheckoutCount > 0
        ? Number(
            (
              finalThrowsUsed /
              finalCheckoutCount
            ).toFixed(1)
          )
        : null;

    const payload = {
      game_key:
        "checkout_41_up",

      tier,

      level,

      win,

      throws_used:
        finalThrowsUsed,

      max_throws:
        MAX_THROWS,

      peak_checkout:
        finalPeak,

      checkout_count:
        finalCheckoutCount,

      best_streak:
        finalBestStreak,

      finishes,

      objective: {
        label:
          "Best checkout",

        target:
          rankConfig.targetCheckout,

        progress:
          finalPeak,
      },

      stats: {
        accuracy:
          finalAccuracy,

        checkout_count:
          finalCheckoutCount,

        best_streak:
          finalBestStreak,

        peak_checkout:
          finalPeak,

        avg_throws_per_checkout:
          avg,
      },
    };

    setFinished(true);

    onFinish({
      payload,
      win,
    });
  }

  /* --------- THROW RECORDING --------- */

  function recordHit() {
    const newEvent:
      ThrowEvent = {
      target:
        currentTarget,

      isHit:
        true,
    };

    const newHistory = [
      ...throwHistory,
      newEvent,
    ];

    setThrowHistory(
      newHistory
    );

    const newThrowsUsed =
      newHistory.length;

    const newPeak =
      Math.max(
        peakCheckout,
        currentTarget
      );

    setPeakCheckout(
      newPeak
    );

    const nextCheckoutCount =
      checkoutCount + 1;

    setCheckoutCount(
      nextCheckoutCount
    );

    const newCurrentStreak =
      currentStreak + 1;

    setCurrentStreak(
      newCurrentStreak
    );

    if (
      newCurrentStreak >
      bestStreak
    ) {
      setBestStreak(
        newCurrentStreak
      );
    }

    /*
     * Finish immediately when
     * the required checkout
     * itself is completed.
     */
    const didWin =
      checkWin(
        currentTarget
      );

    if (didWin) {
      finishGame(
        true,
        newHistory
      );

      return;
    }

    if (
      newThrowsUsed >=
      MAX_THROWS
    ) {
      finishGame(
        false,
        newHistory
      );

      return;
    }

    setCurrentTarget(
      (target) =>
        target + 1
    );
  }

  function recordMiss() {
    const newEvent:
      ThrowEvent = {
      target:
        currentTarget,

      isHit:
        false,
    };

    const newHistory = [
      ...throwHistory,
      newEvent,
    ];

    setThrowHistory(
      newHistory
    );

    const newThrowsUsed =
      newHistory.length;

    setCurrentStreak(0);

    if (
      newThrowsUsed >=
      MAX_THROWS
    ) {
      finishGame(
        false,
        newHistory
      );
    }
  }

  /* --------- HANDLERS --------- */

  function handleHit() {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      throwHistory.length >=
      MAX_THROWS
    ) {
      return;
    }

    onDartsUsed?.(3);

    recordHit();
  }

  function handleMiss() {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      throwHistory.length >=
      MAX_THROWS
    ) {
      return;
    }

    onDartsUsed?.(3);

    recordMiss();
  }

  function handleUndo() {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      throwHistory.length ===
      0
    ) {
      return;
    }

    const newHistory =
      throwHistory.slice(
        0,
        -1
      );

    setThrowHistory(
      newHistory
    );

    recomputeDerivedState(
      newHistory
    );
  }

  // External / Versus undo
  React.useEffect(() => {
    if (!externalUndo) {
      return;
    }

    if (
      externalUndo.steps <=
      0
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          const steps =
            Math.min(
              externalUndo.steps,
              throwHistory.length
            );

          if (
            steps <= 0
          ) {
            return;
          }

          const newHistory =
            throwHistory.slice(
              0,
              throwHistory.length -
                steps
            );

          setThrowHistory(
            newHistory
          );

          recomputeDerivedState(
            newHistory
          );
        },
        0
      );

    return () =>
      window.clearTimeout(
        timer
      );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    externalUndo?.token,
  ]);

  const canPress =
    !disabled &&
    !finished &&
    throwHistory.length <
      MAX_THROWS;

  const canUndo =
    !disabled &&
    !finished &&
    throwHistory.length >
      0;

  /* ---------------- RENDER ---------------- */

  return (
    <div className="bullout">
      {/* Header */}
      <div className="bullout-header game-objective-sticky">
        <div>
          <div className="muted">
            41+ Checkouts ·
            +1 on hit
          </div>
        </div>

        <div className="objective-pill">
          <div className="objective-label">
            Objective
          </div>

          <div className="objective-value">
            {
              rankConfig.objectiveShort
            }
          </div>
        </div>
      </div>

      <DartboardHighlight
        segments={
          suggestedSegments
        }
      />

      <div
        style={{
          fontSize: 40,
          fontWeight: 900,
          textAlign:
            "center",
          letterSpacing: 1,
          textTransform:
            "uppercase",
        }}
      >
        {suggestedRoute.length >
        0
          ? suggestedRoute.join(
              " "
            )
          : "—"}
      </div>

      {/* Main row */}
      <div className="bullout-main">
        <div
          className="bull-board-wrapper card"
          style={{
            flex: 1,
            display: "flex",
            flexDirection:
              "column",
            justifyContent:
              "center",
          }}
        >
          <div
            className="checkout41-controls"
            style={{
              marginTop: 16,
            }}
            data-hotkeys="drill"
          >
            <div
              className="row"
              style={{
                gap: 8,
                flexWrap:
                  "wrap",
              }}
            >
              <button
                className="btn success"
                style={{
                  flex: 1,
                  minWidth: 140,
                }}
                data-hotkey="1"
                onClick={
                  handleHit
                }
                disabled={
                  !canPress
                }
              >
                Check
              </button>

              <button
                className="btn secondary"
                style={{
                  flex: 1,
                  minWidth: 140,
                }}
                data-hotkey="2"
                onClick={
                  handleMiss
                }
                disabled={
                  !canPress
                }
              >
                Bust / Miss
              </button>

              <button
                className="btn outline"
                style={{
                  flex: 1,
                  minWidth: 140,
                }}
                data-hotkey="0"
                onClick={
                  handleUndo
                }
                disabled={
                  !canUndo
                }
              >
                Undo
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bullout-stats card">
          <div
            className="row"
            style={{
              justifyContent:
                "space-between",
            }}
          >
            <div>
              <div className="small muted">
                Current
                target
              </div>

              <div className="title-lg">
                {
                  currentTarget
                }
              </div>
            </div>

            <div>
              <div className="small muted">
                Throws left
              </div>

              <div className="title-lg">
                {
                  throwsLeftText
                }
              </div>
            </div>

            <div>
              <div className="small muted">
                Avg throws /
                checkout
              </div>

              <div className="title-lg">
                {
                  avgThrowsPerCheckout
                }
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
            }}
          >
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">
                  Accuracy
                </div>

                <div className="pill-value">
                  {
                    accuracy
                  }
                  %
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  # of
                  checkouts
                </div>

                <div className="pill-value">
                  {
                    checkoutCount
                  }
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  Checkout
                  streak
                </div>

                <div className="pill-value">
                  {
                    bestStreak
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}