import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { getDrillDef } from "../drills/registry";
import type { Tier } from "../xp/types";
import { useI18n } from "../i18n/I18nProvider";

type SetupState = {
  tier: Tier;
  level: number;
  hero1: string;
  hero2: string;
};

type FinishResult = { payload: any; win: boolean };

type ActionRecord = {
  playerIndex: 0 | 1;
  undoSteps: number; // always 1 (one scoring action)
  prevActive: 0 | 1;
  prevTurnDarts: number;
  prevSlideDir: "from-left" | "from-right";
};

export default function VersusPlayPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { key } = useParams();
  const location = useLocation();

  const drillDef = getDrillDef(key || "");

  const state = (location.state || null) as SetupState | null;
  const tier = state?.tier ?? "Bronze";
  const level = state?.level ?? 1;
  const hero1 = state?.hero1 ?? t("Hero 1");
  const hero2 = state?.hero2 ?? t("Hero 2");

  const [active, setActive] = useState<0 | 1>(0);
  const [slideDir, setSlideDir] = useState<"from-left" | "from-right">("from-right");
  const [turnDarts, setTurnDarts] = useState(0);
  const [turnUndoSteps, setTurnUndoSteps] = useState(0);
  const [actionHistory, setActionHistory] = useState<ActionRecord[]>([]);

  const [p1Finish, setP1Finish] = useState<FinishResult | null>(null);
  const [p2Finish, setP2Finish] = useState<FinishResult | null>(null);

  const [p1UndoToken, setP1UndoToken] = useState(0);
  const [p2UndoToken, setP2UndoToken] = useState(0);
  const [p1UndoSteps, setP1UndoSteps] = useState(0);
  const [p2UndoSteps, setP2UndoSteps] = useState(0);

  // Keep refs so onDartsUsed can record the *previous* state accurately.
  const activeRef = useRef(active);
  const turnDartsRef = useRef(turnDarts);
  const slideDirRef = useRef(slideDir);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    turnDartsRef.current = turnDarts;
  }, [turnDarts]);
  useEffect(() => {
    slideDirRef.current = slideDir;
  }, [slideDir]);

  const title = drillDef?.title || t("Drill");
  const DrillComponent = drillDef?.Component;

  const activeName = active === 0 ? hero1 : hero2;

  const canRender = !!drillDef && !!DrillComponent;

  const frameClass = active === 0 ? "versus-border-blue" : "versus-border-red";
  const heroClass = active === 0 ? "versus-hero-blue" : "versus-hero-red";

  const p1Disabled = active !== 0 || !!p1Finish || !!p2Finish;
  const p2Disabled = active !== 1 || !!p1Finish || !!p2Finish;

  const objectiveProgress = (r: FinishResult | null) => {
    const p = r?.payload;
    const v = p?.objective?.progress;
    return typeof v === "number" ? v : null;
  };

  function decideWinnerIfBothFinished(a: FinishResult | null, b: FinishResult | null) {
    if (!a || !b) return null;
    if (a.win && !b.win) return 0;
    if (!a.win && b.win) return 1;
    if (a.win && b.win) return 0; // shouldn't happen; keep Hero 1

    // Neither completed: use raw progress (Option B)
    const pa = objectiveProgress(a) ?? 0;
    const pb = objectiveProgress(b) ?? 0;
    if (pa > pb) return 0;
    if (pb > pa) return 1;
    return null;
  }

  function goResults(p1: FinishResult | null, p2: FinishResult | null, immediateWinner?: 0 | 1 | null) {
    const computedWinnerIdx = decideWinnerIfBothFinished(p1, p2);
    const winnerIdx = typeof immediateWinner !== "undefined" ? immediateWinner : computedWinnerIdx;
    const winnerName = winnerIdx === 0 ? hero1 : winnerIdx === 1 ? hero2 : null;

    nav("/versus/result", {
      state: {
        drillKey: drillDef?.key,
        drillTitle: title,
        tier,
        level,
        hero1,
        hero2,
        p1,
        p2,
        winnerIdx,
        winnerName,
      },
    });
  }

  function finishFor(player: 0 | 1, result: FinishResult) {
    if (player === 0) setP1Finish(result);
    else setP2Finish(result);

    // Immediate win ends the match.
    if (result.win) {
      const p1 = player === 0 ? result : p1Finish;
      const p2 = player === 1 ? result : p2Finish;
      // Don't wait for the other player to "finish" — declare winner immediately.
      goResults(p1 ?? null, p2 ?? null, player);
      return;
    }

    // If both are finished without a winner, resolve by raw progress.
    const p1 = player === 0 ? result : p1Finish;
    const p2 = player === 1 ? result : p2Finish;
    if (p1 && p2) {
      goResults(p1, p2);
    }
  }

  function swapTurn() {
    const nextActive: 0 | 1 = active === 0 ? 1 : 0;

    // Slide the incoming player's view.
    setSlideDir(nextActive === 1 ? "from-right" : "from-left");

    setTurnDarts(0);
    setTurnUndoSteps(0);
    setActive(nextActive);
  }

  function onDartsUsed(darts: number) {
    // Record one *action* so "{t("Previous throw")}" can undo exactly the last input.
    const prevActive = activeRef.current;
    const prevTurnDarts = turnDartsRef.current;
    const prevSlideDir = slideDirRef.current;
    setActionHistory((h) => [
      ...h,
      { playerIndex: prevActive, undoSteps: 1, prevActive, prevTurnDarts, prevSlideDir },
    ]);

    // Each scoring action is one undo step.
    setTurnUndoSteps((s) => s + 1);
    setTurnDarts((d) => {
      const next = d + darts;
      if (next >= 3) {
        // swap after 3 darts
        setTimeout(() => swapTurn(), 0);
      }
      return next;
    });
  }

  function handlePreviousThrow() {
    if (actionHistory.length === 0) return;

    const last = actionHistory[actionHistory.length - 1];
    setActionHistory((h) => h.slice(0, -1));

    // Restore the game wrapper state to exactly what it was *before* the last action.
    setSlideDir(last.prevSlideDir);
    setActive(last.prevActive);
    setTurnDarts(last.prevTurnDarts);
    // turnUndoSteps is only used to decide whether to record a "hand"; keep it in sync.
    setTurnUndoSteps((s) => Math.max(0, s - 1));

    // Trigger external undo on the correct drill instance.
    if (last.playerIndex === 0) {
      setP1UndoSteps(last.undoSteps);
      setP1UndoToken((t) => t + 1);
    } else {
      setP2UndoSteps(last.undoSteps);
      setP2UndoToken((t) => t + 1);
    }
  }

  const canPreviousThrow = actionHistory.length > 0 && !p1Finish && !p2Finish;

  if (!canRender) {
    return (
      <div className="page">
        <div className="card">
          <div className="title">{t("Versus Mode")}</div>
          <p className="muted">{t("That drill wasn’t found.")}</p>
          <Link to="/versus" className="btn" style={{ width: "100%" }}>{t("Back to setup")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`page versus-page ${frameClass}`}>
      <div className={`card versus-topbar ${heroClass}`}>
        <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
          <div className="versus-hero-name">{activeName}</div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn outline" onClick={handlePreviousThrow} disabled={!canPreviousThrow}>{t("Previous throw")}</button>
            <Link className="btn outline" to="/versus">{t("Quit")}</Link>
          </div>
        </div>
      </div>

      {/* Keep both drills mounted so they retain independent state, but animate the active one */}
      <div className={`versus-stage ${slideDir}`}>
        <div className={`versus-panel ${active === 0 ? "is-active" : ""}`.trim()}>
          <DrillComponent
            tier={tier}
            level={level}
            disabled={p1Disabled}
            onFinish={(r: FinishResult) => finishFor(0, r)}
            onDartsUsed={onDartsUsed}
            externalUndo={{ token: p1UndoToken, steps: p1UndoSteps }}
          />
        </div>

        <div className={`versus-panel ${active === 1 ? "is-active" : ""}`.trim()}>
          <DrillComponent
            tier={tier}
            level={level}
            disabled={p2Disabled}
            onFinish={(r: FinishResult) => finishFor(1, r)}
            onDartsUsed={onDartsUsed}
            externalUndo={{ token: p2UndoToken, steps: p2UndoSteps }}
          />
        </div>
      </div>
    </div>
  );
}