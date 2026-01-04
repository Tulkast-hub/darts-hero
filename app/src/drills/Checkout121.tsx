import React, { useMemo, useState } from "react";
import DartboardHighlight, {
  tokensToSegments,
} from "../ui/DartboardHighlight";
import type { Tier } from "../xp/types";

type FinishResult = {
  payload: any;
  win: boolean;
};

type Props = {
  onFinish: (result: FinishResult) => void;
  disabled?: boolean;
  tier: Tier;
  level: number;
};

type FinishEvent = {
  target: number;
  throwNumber: number;
};

type UndoSnapshot = {
  currentTarget: number;
  remainder: number;
  throwsUsedTotal: number;
  throwsUsedInWindow: number;
  peakCheckout: number;
  checkoutCount: number;
  history: FinishEvent[];
  firstOver140At: number | null;
  firstOver150At: number | null;
  firstOver160At: number | null;
  firstOver170At: number | null;
  scoreInput: string;
};

type RankConfig121 = {
  labelLong: string;
  objectiveShort: string;
  mainThresholdOver: number;
  objectiveThrows: number; // throws allowed to reach key checkout
  earlyWindow?: {
    thresholdOver: number;
    maxThrows: number;
  };
};

const INITIAL_TARGET = 121;
const MAX_THROWS = 70;

/* ---------------- RANK CONFIG (throws-based) ---------------- */

function getRankConfig121(tier: Tier, level: number): RankConfig121 {
  // Bronze – 3 throws
  if (tier === "Bronze") {
    const objectiveThrows = 3;
    if (level <= 3) {
      return {
        labelLong: "Over 140, single finish in 3 throws",
        objectiveShort: "Over 140",
        mainThresholdOver: 140,
        objectiveThrows,
      };
    }
    return {
      labelLong: "Over 150, single finish in 3 throws",
      objectiveShort: "Over 150",
      mainThresholdOver: 150,
      objectiveThrows,
    };
  }

  // Silver – 3 throws
  if (tier === "Silver") {
    const objectiveThrows = 3;
    if (level <= 3) {
      return {
        labelLong: "Over 140, double finish in 3 throws",
        objectiveShort: "Over 140",
        mainThresholdOver: 140,
        objectiveThrows,
      };
    }
    return {
      labelLong: "Over 150, double finish in 3 throws",
      objectiveShort: "Over 150",
      mainThresholdOver: 150,
      objectiveThrows,
    };
  }

  // Gold – 3 throws
  if (tier === "Gold") {
    const objectiveThrows = 3;
    if (level <= 3) {
      return {
        labelLong: "Over 160, double finish in 3 throws",
        objectiveShort: "Over 160",
        mainThresholdOver: 160,
        objectiveThrows,
      };
    }
    return {
      labelLong: "Over 170, double finish in 3 throws",
      objectiveShort: "Over 170",
      mainThresholdOver: 170,
      objectiveThrows,
    };
  }

  // Platinum – 2 throws
  if (tier === "Platinum") {
    const objectiveThrows = 2;
    if (level <= 3) {
      return {
        labelLong: "Over 170, and reach >140 within 2 throws",
        objectiveShort: "Over 170",
        mainThresholdOver: 170,
        objectiveThrows,
        earlyWindow: { thresholdOver: 140, maxThrows: 2 },
      };
    }
    return {
      labelLong: "Over 170, and reach >150 within 2 throws",
      objectiveShort: "Over 170",
      mainThresholdOver: 170,
      objectiveThrows,
      earlyWindow: { thresholdOver: 150, maxThrows: 2 },
    };
  }

  // Diamond – 2 throws
  const objectiveThrows = 2;
  if (tier === "Diamond") {
    if (level <= 3) {
      return {
        labelLong: "Over 170, and reach >160 within 2 throws",
        objectiveShort: "Over 170",
        mainThresholdOver: 170,
        objectiveThrows,
        earlyWindow: { thresholdOver: 160, maxThrows: 2 },
      };
    }
    return {
      labelLong: "Over 170, all within 2 throws",
      objectiveShort: "Over 170",
      mainThresholdOver: 170,
      objectiveThrows,
      earlyWindow: { thresholdOver: 170, maxThrows: 2 },
    };
  }

  // fallback
  return {
    labelLong: "Over 140",
    objectiveShort: "Over 140",
    mainThresholdOver: 140,
    objectiveThrows: 3,
  };
}

/* ---------------- CHECKOUT SUGGESTION ---------------- */

// Keys are score left; values are dart sequences matching the Darts501 card.
// Only scores 170–60 that can be finished in 3 darts are populated.
const PREFERRED_ROUTES: Record<number, string[]> = {
  170: ["T20", "T20", "DBULL"],
  169: [],
  168: [],
  167: ["T20", "T19", "DBULL"],
  166: [],
  165: [],
  164: ["T20", "T18", "DBULL"],
  163: [],
  162: [],
  161: ["T20", "T17", "DBULL"],
  160: ["T20", "T20", "D20"],
  159: [],
  158: ["T20", "T20", "D19"],
  157: ["T20", "T19", "D20"],
  156: ["T20", "T20", "D18"],
  155: ["T20", "T19", "D19"],
  154: ["T20", "T18", "D20"],
  153: ["T20", "T19", "D18"],
  152: ["T20", "T20", "D16"],
  151: ["T20", "T17", "D20"],
  150: ["T20", "T18", "D18"],
  149: ["T20", "T19", "D16"],
  148: ["T20", "T16", "D20"],
  147: ["T20", "T17", "D18"],
  146: ["T20", "T18", "D16"],
  145: ["T20", "T15", "D20"],
  144: ["T20", "T20", "D12"],
  143: ["T20", "T17", "D16"],
  142: ["T20", "T14", "D20"],
  141: ["T20", "T19", "D12"],
  140: ["T20", "T16", "D16"],
  139: ["T20", "T13", "D20"],
  138: ["T20", "T18", "D12"],
  137: ["T20", "T19", "D10"],
  136: ["T20", "T20", "D8"],
  135: ["T20", "T17", "D12"],
  134: ["T20", "T14", "D16"],
  133: ["T20", "T19", "D8"],
  132: ["T20", "T16", "D12"],
  131: ["T20", "T13", "D16"],
  130: ["T20", "T20", "D5"],
  129: ["T19", "T16", "D12"],
  128: ["T18", "T14", "D16"],
  127: ["T20", "T17", "D8"],
  126: ["T19", "T19", "D6"],
  125: ["25", "T20", "D20"],
  124: ["T20", "T16", "D8"],
  123: ["T19", "T16", "D9"],
  122: ["T18", "T20", "D4"],
  121: ["T17", "T10", "D20"],
  120: ["T20", "20", "D20"],

  119: ["T19", "T12", "D13"],
  118: ["T20", "18", "D20"],
  117: ["T20", "17", "D20"],
  116: ["T20", "16", "D20"],
  115: ["T20", "15", "D20"],
  114: ["T20", "14", "D20"],
  113: ["T20", "13", "D20"],
  112: ["T20", "20", "D16"],
  111: ["T19", "20", "D16"],
  110: ["T20", "18", "D16"],
  109: ["T20", "17", "D16"],
  108: ["T20", "16", "D16"],
  107: ["T19", "18", "D16"],
  106: ["T20", "10", "D18"],
  105: ["T20", "13", "D16"],
  104: ["T18", "18", "D16"],
  103: ["T20", "11", "D16"],
  102: ["T20", "10", "D16"],
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
  41: ["9", "D16"],
  42: ["10", "D16"],
  43: ["3", "D20"],
  44: ["4", "D20"],
  45: ["13", "D16"],
  46: ["6", "D20"],
  47: ["7", "D20"],
  48: ["16", "D16"],
  49: ["17", "D16"],
  50: ["18", "D16"],
  51: ["19", "D16"],
  52: ["20", "D16"],
  53: ["13", "D20"],
  54: ["14", "D20"],
  55: ["15", "D20"],
  56: ["16", "D20"],
  57: ["17", "D20"],
  58: ["18", "D20"],
  59: ["19", "D20"],
};

type Seg = { token: string; value: number; isDouble: boolean };

// Order darts in a “nice” priority: 20s first, then downwards, then bull
const NUMBER_ORDER = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];

const SINGLE_SEGMENTS: Seg[] = [
  ...NUMBER_ORDER.map((n) => ({ token: String(n), value: n, isDouble: false })),
  { token: "25", value: 25, isDouble: false }, // single bull
];

const TREBLE_SEGMENTS: Seg[] = NUMBER_ORDER.map((n) => ({
  token: `T${n}`,
  value: 3 * n,
  isDouble: false,
}));

const DOUBLE_SEGMENTS: Seg[] = [
  ...NUMBER_ORDER.map((n) => ({ token: `D${n}`, value: 2 * n, isDouble: true })),
  { token: "DBULL", value: 50, isDouble: true }, // double bull
];

// Any scoring dart that isn't forced to be a double
const SCORE_SEGMENTS: Seg[] = [...TREBLE_SEGMENTS, ...SINGLE_SEGMENTS];

function searchRoute(score: number): string[] | null {
  // sensible 501 checkout range
  if (score < 2 || score > 170) return null;

  // 1-dart finish: pure double (including DBULL)
  for (const d of DOUBLE_SEGMENTS) {
    if (d.value === score) return [d.token];
  }

  // 2-dart finish: score + double
  for (const a of SCORE_SEGMENTS) {
    for (const d of DOUBLE_SEGMENTS) {
      if (a.value + d.value === score) {
        return [a.token, d.token];
      }
    }
  }

  // 3-dart finish: score + score + double
  for (const a of SCORE_SEGMENTS) {
    for (const b of SCORE_SEGMENTS) {
      for (const d of DOUBLE_SEGMENTS) {
        if (a.value + b.value + d.value === score) {
          return [a.token, b.token, d.token];
        }
      }
    }
  }

  // no route found
  return null;
}

function getSuggestedRoute(score: number): string[] {
  // 1) Exact chart route if we’ve defined one
  const fromMap = PREFERRED_ROUTES[score];
  if (fromMap && fromMap.length > 0) return fromMap;

  // 2) Generic double-finish search
  const fromSearch = searchRoute(score);
  if (fromSearch) return fromSearch;

  // 3) Otherwise no sensible checkout – show nothing
  return [];
}

/* ---------------- COMPONENT ---------------- */

export default function Checkout121({ onFinish, disabled, tier, level }: Props) {
  const rankConfig = useMemo(
    () => getRankConfig121(tier, level),
    []
  );

  const [currentTarget, setCurrentTarget] = useState(INITIAL_TARGET);
  const [remainder, setRemainder] = useState(INITIAL_TARGET);

  const [throwsUsedTotal, setThrowsUsedTotal] = useState(0);
  const [throwsUsedInWindow, setThrowsUsedInWindow] = useState(0);
  const [peakCheckout, setPeakCheckout] = useState(0);

  const [scoreInput, setScoreInput] = useState("");
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [finished, setFinished] = useState(false);
  const [history, setHistory] = useState<FinishEvent[]>([]);

  const [checkoutCount, setCheckoutCount] = useState(0);

  const [firstOver140At, setFirstOver140At] = useState<number | null>(null);
  const [firstOver150At, setFirstOver150At] = useState<number | null>(null);
  const [firstOver160At, setFirstOver160At] = useState<number | null>(null);
  const [firstOver170At, setFirstOver170At] = useState<number | null>(null);

  const suggestedRoute = useMemo(
    () => getSuggestedRoute(remainder),
    [remainder]
  );
  const suggestedSegments = useMemo(
    () => tokensToSegments(suggestedRoute),
    [suggestedRoute]
  );

  const throwsLeftGlobal = MAX_THROWS - throwsUsedTotal;
  const throwsLeftText = String(throwsLeftGlobal);

  // window counter – resets on any hit or bust
  const throwsRemainingWindow =
    rankConfig.objectiveThrows - throwsUsedInWindow;
  const throwsPerCheckoutText = `${throwsRemainingWindow}/${rankConfig.objectiveThrows}`;

  const finishes = history.length;
  const accuracy =
    throwsUsedTotal > 0
      ? Math.round((finishes / throwsUsedTotal) * 100)
      : 0;

  /* --------- WIN LOGIC --------- */

  function checkWin(nextHistory: FinishEvent[], newPeak: number): boolean {
    const { mainThresholdOver, earlyWindow } = rankConfig;

    if (newPeak <= mainThresholdOver) return false;

    if (earlyWindow) {
      const { thresholdOver, maxThrows } = earlyWindow;
      const earlyHit = nextHistory.find(
        (f) => f.target > thresholdOver && f.throwNumber <= maxThrows
      );
      if (!earlyHit) return false;
    }

    return true;
  }

  function finishGame(
    win: boolean,
    finalHistory: FinishEvent[],
    finalThrowsUsed: number,
    finalPeak: number
  ) {
    if (finished) return;
    setFinished(true);

    const payload = {
      game_key: "checkout_121",
      tier,
      level,

      win,
      throws_used: finalThrowsUsed,
      max_throws: MAX_THROWS,
      peak_checkout: finalPeak,

      first_over_140_at: firstOver140At,
      first_over_150_at: firstOver150At,
      first_over_160_at: firstOver160At,
      first_over_170_at: firstOver170At,

      finishes: finalHistory,

      // Objective + stats (used by the Results page)
      objective: {
        label: "Best checkout",
        target: rankConfig.mainThresholdOver + 1,
        progress: finalPeak,
      },
      stats: {
        accuracy,
        checkout_count: checkoutCount,
        peak_checkout: finalPeak,
        avg_throws_per_checkout:
          checkoutCount > 0 ? Number((finalThrowsUsed / checkoutCount).toFixed(1)) : null,
      },
    };

    onFinish({ payload, win });
  }

  function resolveMiss(newThrowsUsedTotal: number) {
    const nextTarget = Math.max(INITIAL_TARGET, currentTarget - 1);

    setThrowsUsedInWindow(0);
    setCurrentTarget(nextTarget);
    setRemainder(nextTarget);

    if (newThrowsUsedTotal >= MAX_THROWS) {
      finishGame(false, history, newThrowsUsedTotal, peakCheckout);
    }
  }

  function resolveHit(newThrowsUsedTotal: number) {
    const newPeak = Math.max(peakCheckout, currentTarget);
    setPeakCheckout(newPeak);

    // increment number of successful checkouts
    setCheckoutCount((c) => c + 1);

    const newHistory: FinishEvent[] = [
      ...history,
      { target: currentTarget, throwNumber: newThrowsUsedTotal },
    ];
    setHistory(newHistory);

    if (currentTarget > 140 && firstOver140At == null) {
      setFirstOver140At(newThrowsUsedTotal);
    }
    if (currentTarget > 150 && firstOver150At == null) {
      setFirstOver150At(newThrowsUsedTotal);
    }
    if (currentTarget > 160 && firstOver160At == null) {
      setFirstOver160At(newThrowsUsedTotal);
    }
    if (currentTarget > 170 && firstOver170At == null) {
      setFirstOver170At(newThrowsUsedTotal);
    }

    const didWin = checkWin(newHistory, newPeak);
    if (didWin || newThrowsUsedTotal >= MAX_THROWS) {
      finishGame(didWin, newHistory, newThrowsUsedTotal, newPeak);
      return;
    }

    const nextTarget = currentTarget + 5;
    setCurrentTarget(nextTarget);
    setRemainder(nextTarget);
    setThrowsUsedInWindow(0);
  }

  /* --------- THROW SPEND + HANDLERS --------- */

  function spendThrow(): { total: number; window: number } {
    const total = Math.min(MAX_THROWS, throwsUsedTotal + 1);
    const window = throwsUsedInWindow + 1;

    setThrowsUsedTotal(total);
    setThrowsUsedInWindow(window);

    return { total, window };
  }

  // ENTER SCORE – deduct from *remainder* and only resolve when we hit 0 or bust
  function handleEnterScore() {
    if (disabled || finished) return;
    if (throwsUsedTotal >= MAX_THROWS) return;

    // push snapshot for undo
    setUndoStack((s) => [
      ...s,
      {
        currentTarget,
        remainder,
        throwsUsedTotal,
        throwsUsedInWindow,
        peakCheckout,
        checkoutCount,
        history,
        firstOver140At,
        firstOver150At,
        firstOver160At,
        firstOver170At,
        scoreInput,
      },
    ]);

    const raw = scoreInput.trim();
    if (!raw) return;
    const val = parseInt(raw, 10);
    if (Number.isNaN(val) || val < 0) return;

    const { total: newThrowsUsed, window: newWindow } = spendThrow();
    setScoreInput("");

    const newRemainder = remainder - val;
    setRemainder(newRemainder);

    // exact 0 = check (hit)
    if (newRemainder === 0) {
      resolveHit(newThrowsUsed);
      return;
    }

    // negative = bust (miss)
    if (newRemainder < 0) {
      resolveMiss(newThrowsUsed);
      return;
    }

    // still > 0: if we've used all allowed throws for this finish,
    // treat it as a bust
    if (newWindow >= rankConfig.objectiveThrows) {
      resolveMiss(newThrowsUsed);
      return;
    }

    // still some left on this finish – leg continues
    if (newThrowsUsed >= MAX_THROWS) {
      finishGame(false, history, newThrowsUsed, peakCheckout);
    }
  }

  // BUST BUTTON – counts as a throw + full miss
  function handleBust() {
    if (disabled || finished) return;
    if (throwsUsedTotal >= MAX_THROWS) return;

    setUndoStack((s) => [
      ...s,
      {
        currentTarget,
        remainder,
        throwsUsedTotal,
        throwsUsedInWindow,
        peakCheckout,
        checkoutCount,
        history,
        firstOver140At,
        firstOver150At,
        firstOver160At,
        firstOver170At,
        scoreInput,
      },
    ]);

    const { total: newThrowsUsed } = spendThrow();
    resolveMiss(newThrowsUsed);
  }

  function handleUndo() {
    if (disabled || finished) return;
    setUndoStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      setCurrentTarget(prev.currentTarget);
      setRemainder(prev.remainder);
      setThrowsUsedTotal(prev.throwsUsedTotal);
      setThrowsUsedInWindow(prev.throwsUsedInWindow);
      setPeakCheckout(prev.peakCheckout);
      setCheckoutCount(prev.checkoutCount);
      setHistory(prev.history);
      setFirstOver140At(prev.firstOver140At);
      setFirstOver150At(prev.firstOver150At);
      setFirstOver160At(prev.firstOver160At);
      setFirstOver170At(prev.firstOver170At);
      setScoreInput(prev.scoreInput);
      return s.slice(0, -1);
    });
  }

  const canPress = !disabled && !finished && throwsUsedTotal < MAX_THROWS;
  const canUndo = !disabled && !finished && undoStack.length > 0;

  /* ---------------- RENDER ---------------- */

  return (
    <div className="bullout">
      {/* header */}
      <div className="bullout-header">
        <div>
          <div className="muted">121 Ladder · +5 on hit, −1 on miss</div>
        </div>
        <div className="objective-pill">
          <div className="objective-label">Objective</div>
          <div className="objective-value">{rankConfig.objectiveShort}</div>
        </div>
      </div>

      {/* main row: board left, stats right */}
      <div className="bullout-main">
        <div
          className="bull-board-wrapper card"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <DartboardHighlight segments={suggestedSegments} />
          <div
            style={{
              marginTop: 12,
              fontSize: 16,
              fontWeight: 600,
              textAlign: "center",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {suggestedRoute.length > 0 ? suggestedRoute.join(" ") : "—"}
          </div>
        </div>

        <div className="bullout-stats card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="small muted">Current target</div>
              <div className="title-lg">{currentTarget}</div>
            </div>
            <div>
              <div className="small muted">Throws left</div>
              <div className="title-lg">{throwsLeftText}</div>
            </div>
            <div>
              <div className="small muted">Throws / checkout</div>
              <div className="title-lg">{throwsPerCheckoutText}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">Best checkout</div>
                <div className="pill-value">
                  {peakCheckout > 0 ? peakCheckout : "—"}
                </div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Accuracy</div>
                <div className="pill-value">{accuracy}%</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label"># of checkouts</div>
                <div className="pill-value">{checkoutCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* bottom controls (independent layout, no shared grid) */}
      <div className="checkout121-controls" style={{ marginTop: 16 }}>
        {/* row 1: score + score left */}
        <div
          className="row"
          style={{ alignItems: "flex-end", marginBottom: 16 }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <label
              className="small"
              htmlFor="checkout121-score"
              style={{ display: "block", marginBottom: 6 }}
            >
              Score
            </label>
            <input
              id="checkout121-score"
              type="number"
              inputMode="numeric"
              value={scoreInput}
              disabled={disabled || finished || throwsUsedTotal >= MAX_THROWS}
              onChange={(e) => setScoreInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleEnterScore();
                }
              }}
              placeholder="Enter 3-dart score"
              style={{
                background: "#020617",
                borderColor: "#243257",
                color: "var(--text)",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="small muted">Score left</div>
            <div className="title-lg">{remainder}</div>
          </div>
        </div>

        {/* row 2: buttons */}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn"
            style={{ flex: 1, minWidth: 140 }}
            onClick={handleEnterScore}
            disabled={!canPress}
          >
            Check
          </button>
          <button
            className="btn secondary"
            style={{ flex: 1, minWidth: 140 }}
            onClick={handleBust}
            disabled={!canPress}
          >
            Bust
          </button>
          <button
            className="btn outline"
            style={{ flex: 1, minWidth: 140 }}
            onClick={handleUndo}
            disabled={!canUndo}
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}
