import React, { useMemo, useState } from "react";
import DartboardHighlight, { tokensToSegments } from "../ui/DartboardHighlight";
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
  onDartsUsed?: (count: number) => void;
  externalUndo?: { token: number; steps: number };
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

const NUMBER_ORDER = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];

const SINGLE_SEGMENTS: Seg[] = [
  ...NUMBER_ORDER.map((n) => ({ token: String(n), value: n, isDouble: false })),
  { token: "25", value: 25, isDouble: false },
];

const TREBLE_SEGMENTS: Seg[] = NUMBER_ORDER.map((n) => ({
  token: `T${n}`,
  value: 3 * n,
  isDouble: false,
}));

const DOUBLE_SEGMENTS: Seg[] = [
  ...NUMBER_ORDER.map((n) => ({ token: `D${n}`, value: 2 * n, isDouble: true })),
  { token: "DBULL", value: 50, isDouble: true },
];

const SCORE_SEGMENTS: Seg[] = [...TREBLE_SEGMENTS, ...SINGLE_SEGMENTS];

function searchRoute(score: number): string[] | null {
  if (score < 2 || score > 170) return null;

  for (const d of DOUBLE_SEGMENTS) {
    if (d.value === score) return [d.token];
  }

  for (const a of SCORE_SEGMENTS) {
    for (const d of DOUBLE_SEGMENTS) {
      if (a.value + d.value === score) {
        return [a.token, d.token];
      }
    }
  }

  for (const a of SCORE_SEGMENTS) {
    for (const b of SCORE_SEGMENTS) {
      for (const d of DOUBLE_SEGMENTS) {
        if (a.value + b.value + d.value === score) {
          return [a.token, b.token, d.token];
        }
      }
    }
  }

  return null;
}

function getSuggestedRoute(score: number): string[] {
  const fromMap = PREFERRED_ROUTES[score];
  if (fromMap && fromMap.length > 0) return fromMap;

  const fromSearch = searchRoute(score);
  if (fromSearch) return fromSearch;

  return [];
}

/* ---------------- DART SCORE VALIDATION ----------------
   We only allow: 0..180, and the value must be achievable
   with up to 3 darts (singles/doubles/trebles + bull 25/50).
---------------------------------------------------------*/

function buildPossible3DartScores(): Set<number> {
  const single: number[] = [];
  for (let n = 1; n <= 20; n++) single.push(n);
  single.push(25);

  const dbl: number[] = [];
  for (let n = 1; n <= 20; n++) dbl.push(2 * n);
  dbl.push(50);

  const tre: number[] = [];
  for (let n = 1; n <= 20; n++) tre.push(3 * n);

  const one = [0, ...single, ...dbl, ...tre]; // allow 0 (miss dart)
  const set = new Set<number>();

  for (const a of one) {
    for (const b of one) {
      for (const c of one) {
        set.add(a + b + c);
      }
    }
  }
  return set;
}

const POSSIBLE_3DART_SCORES = buildPossible3DartScores();

/* ---------------- COMPONENT ---------------- */

export default function Checkout121({ onFinish, disabled, tier, level, onDartsUsed, externalUndo }: Props) {
  const rankConfig = useMemo(() => getRankConfig121(tier, level), []);

  const [currentTarget, setCurrentTarget] = useState(INITIAL_TARGET);
  const [remainder, setRemainder] = useState(INITIAL_TARGET);

  const [throwsUsedTotal, setThrowsUsedTotal] = useState(0);
  const [throwsUsedInWindow, setThrowsUsedInWindow] = useState(0);
  const [peakCheckout, setPeakCheckout] = useState(0);

  // now stores typed digits from keypad
  const [scoreInput, setScoreInput] = useState("");
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [finished, setFinished] = useState(false);
  const [history, setHistory] = useState<FinishEvent[]>([]);
  const [checkoutCount, setCheckoutCount] = useState(0);

  const [firstOver140At, setFirstOver140At] = useState<number | null>(null);
  const [firstOver150At, setFirstOver150At] = useState<number | null>(null);
  const [firstOver160At, setFirstOver160At] = useState<number | null>(null);
  const [firstOver170At, setFirstOver170At] = useState<number | null>(null);

  const suggestedRoute = useMemo(() => getSuggestedRoute(remainder), [remainder]);
  const suggestedSegments = useMemo(() => tokensToSegments(suggestedRoute), [suggestedRoute]);

  const throwsLeftGlobal = MAX_THROWS - throwsUsedTotal;

  const throwsRemainingWindow = rankConfig.objectiveThrows - throwsUsedInWindow;
  const throwsPerCheckoutText = `${throwsRemainingWindow}/${rankConfig.objectiveThrows}`;

  const finishes = history.length;
  const accuracy = throwsUsedTotal > 0 ? Math.round((finishes / throwsUsedTotal) * 100) : 0;

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

    setCheckoutCount((c) => c + 1);

    const newHistory: FinishEvent[] = [
      ...history,
      { target: currentTarget, throwNumber: newThrowsUsedTotal },
    ];
    setHistory(newHistory);

    if (currentTarget > 140 && firstOver140At == null) setFirstOver140At(newThrowsUsedTotal);
    if (currentTarget > 150 && firstOver150At == null) setFirstOver150At(newThrowsUsedTotal);
    if (currentTarget > 160 && firstOver160At == null) setFirstOver160At(newThrowsUsedTotal);
    if (currentTarget > 170 && firstOver170At == null) setFirstOver170At(newThrowsUsedTotal);

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

  function pushUndoSnapshot() {
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
  }

  function commitEnteredScore() {
    if (disabled || finished) return;
    if (throwsUsedTotal >= MAX_THROWS) return;

    onDartsUsed?.(3);

    const raw = scoreInput.trim();
    if (!raw) return;

    const val = parseInt(raw, 10);
    if (Number.isNaN(val) || val < 0) return;

    // Validate possible 3-dart score
    if (!POSSIBLE_3DART_SCORES.has(val)) return;

    // Snapshot for undo
    pushUndoSnapshot();

    const { total: newThrowsUsed, window: newWindow } = spendThrow();
    setScoreInput("");

    const newRemainder = remainder - val;
    setRemainder(newRemainder);

    if (newRemainder === 0) {
      resolveHit(newThrowsUsed);
      return;
    }

    if (newRemainder < 0) {
      resolveMiss(newThrowsUsed);
      return;
    }

    if (newWindow >= rankConfig.objectiveThrows) {
      resolveMiss(newThrowsUsed);
      return;
    }

    if (newThrowsUsed >= MAX_THROWS) {
      finishGame(false, history, newThrowsUsed, peakCheckout);
    }
  }

  function handleBust() {
    if (disabled || finished) return;
    if (throwsUsedTotal >= MAX_THROWS) return;

    onDartsUsed?.(3);

    pushUndoSnapshot();

    const { total: newThrowsUsed } = spendThrow();
    setScoreInput("");
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

  React.useEffect(() => {
    if (!externalUndo) return;
    if (externalUndo.steps <= 0) return;
    const t = window.setTimeout(() => {
      for (let i = 0; i < externalUndo.steps; i++) {
        handleUndo();
      }
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUndo?.token]);

  const canPress = !disabled && !finished && throwsUsedTotal < MAX_THROWS;
  const canUndo = !disabled && !finished && undoStack.length > 0;

  // Keypad input helpers
  function appendDigit(d: string) {
    if (!canPress) return;
    setScoreInput((cur) => {
      const next = (cur + d).replace(/^0+(?=\d)/, ""); // avoid leading zeros
      if (next.length > 3) return cur; // max 3 digits
      const n = parseInt(next || "0", 10);
      if (Number.isNaN(n) || n > 180) return cur;
      return next;
    });
  }

  function backspace() {
    if (!canPress) return;
    setScoreInput((cur) => cur.slice(0, -1));
  }

  const enteredVal = scoreInput.trim() ? parseInt(scoreInput, 10) : null;
  const isEnteredValid =
    enteredVal != null &&
    enteredVal >= 0 &&
    enteredVal <= 180 &&
    POSSIBLE_3DART_SCORES.has(enteredVal);

  /* ---------------- Keyboard support (like numpad) ---------------- */
  React.useEffect(() => {
    if (disabled || finished) return;

    function onKeyDown(e: KeyboardEvent) {
      // digits
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        appendDigit(e.key);
        return;
      }
      // numpad digits come through as "0".."9" too (handled above)
      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        commitEnteredScore();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setScoreInput("");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, finished, remainder, scoreInput, throwsUsedTotal, throwsUsedInWindow]);

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

      {/* Board + suggested route on top (no card background) */}
      <div style={{ marginTop: 8, marginBottom: 10 }}>
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
            {suggestedRoute.length > 0 ? suggestedRoute.join(" ") : "—"}
          </div>
      </div>

      {/* Custom layout: left 2/3 controls, right 1/3 stats. Mobile still stacks. */}
      <div
        className="bullout-main"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        {/* Left: keypad + actions */}
        <div className="card" style={{ width: "100%" }}>
          {/* Entered score display */}
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="small muted">Entered score</div>
              <div className="title-lg" style={{ minHeight: 34 }}>
                {scoreInput || "—"}
              </div>
              {!scoreInput ? (
                <div className="muted small">Tap numbers or use your keyboard.</div>
              ) : isEnteredValid ? (
                <div className="muted small">Valid 3-dart score</div>
              ) : (
                <div className="muted small" style={{ opacity: 0.8 }}>
                  Not a possible 3-dart score
                </div>
              )}
            </div>

            {/* Actions on the right of the entry display */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="btn secondary" onClick={handleBust} disabled={!canPress}>
                Bust
              </button>
              <button className="btn outline" onClick={handleUndo} disabled={!canUndo} data-hotkey="0">
                Undo
              </button>
            </div>
          </div>

          {/* Keypad */}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
                <button
                  key={d}
                  className="btn"
                  type="button"
                  onClick={() => appendDigit(d)}
                  disabled={!canPress}
                  style={{ fontSize: 18, fontWeight: 800 }}
                >
                  {d}
                </button>
              ))}

              {/* Backspace */}
              <button
                className="btn outline"
                type="button"
                onClick={backspace}
                disabled={!canPress || !scoreInput}
                style={{ fontSize: 14, fontWeight: 700 }}
              >
                ⌫
              </button>

              {/* 0 */}
              <button
                className="btn"
                type="button"
                onClick={() => appendDigit("0")}
                disabled={!canPress}
                style={{ fontSize: 18, fontWeight: 800 }}
              >
                0
              </button>

              {/* Enter */}
              <button
                className="btn success"
                type="button"
                onClick={commitEnteredScore}
                disabled={!canPress || !scoreInput || !isEnteredValid}
                style={{ fontSize: 14, fontWeight: 800 }}
              >
                Enter
              </button>
            </div>
          </div>
        </div>

        {/* Right: stats (2 per row) */}
        <div className="bullout-stats card" style={{ width: "100%" }}>

          <div
            style={{
              marginTop: 10,
              fontSize: 60,
              fontWeight: 900,
              textAlign: "center",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}>
               {remainder}
          </div>
          <div className="muted">Current target</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <div style={{ textAlign: "center", flex: 1 }}>
              <div className="title-lg">{currentTarget}</div>
              <div className="muted">Current target</div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div className="title-lg">{throwsPerCheckoutText}</div>
              <div className="muted">Throws / checkout</div>
            </div>
            <div className="pill pill-stat">
              <div className="pill-label">Throws left</div>
              <div className="pill-value">{throwsLeftGlobal}</div>
            </div>

            <div className="pill pill-stat">
              <div className="pill-label">Best checkout</div>
              <div className="pill-value">{peakCheckout > 0 ? peakCheckout : "—"}</div>
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

      {/* Mobile fallback: stack columns */}
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
