import React, { useMemo, useState } from "react";
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

type HitMode = "wedge_any" | "fat_single" | "double_only";

type RankConfig = {
  tier: Tier;
  level: number;        // 1..5
  hitMode: HitMode;
  requiredHits: number; // 1..4
  baseSectionDarts: number; // 9 or 12
};

type SectionResult = {
  number: number;        // 1..20
  phase: 1 | 2 | null;
  dartsUsed: number;
  hits: number;
  requiredHits: number;
  success: boolean | null;
};

type HistoryEvent = {
  sectionIndex: number;
  phase: 1 | 2;
  kind: "hit" | "miss" | "miss3";
};

// ---- TEMP RANK (later this will come from profile / XP system) -------------
const CURRENT_TIER: Tier = "Gold";
const CURRENT_LEVEL = 2;

// ---- RANK CONFIG -----------------------------------------------------------

function getRankConfig(tier: Tier, level: number): RankConfig {
  // Bronze
  if (tier === "Bronze") {
    if (level <= 3) {
      return {
        tier,
        level,
        hitMode: "wedge_any",
        requiredHits: 3,
        baseSectionDarts: 12
      };
    }
    return {
      tier,
      level,
      hitMode: "fat_single",
      requiredHits: 3,
      baseSectionDarts: 12
    };
  }

  // Silver
  if (tier === "Silver") {
    return {
      tier,
      level,
      hitMode: "double_only",
      requiredHits: 1,
      baseSectionDarts: level <= 3 ? 12 : 9
    };
  }

  // Gold
  if (tier === "Gold") {
    return {
      tier,
      level,
      hitMode: "double_only",
      requiredHits: 2,
      baseSectionDarts: level <= 3 ? 12 : 9
    };
  }

  // Platinum
  if (tier === "Platinum") {
    return {
      tier,
      level,
      hitMode: "double_only",
      requiredHits: 3,
      baseSectionDarts: level <= 3 ? 12 : 9
    };
  }

  // Diamond
  if (tier === "Diamond") {
    return {
      tier,
      level,
      hitMode: "double_only",
      requiredHits: level <= 2 ? 3 : 4,
      baseSectionDarts: 9
    };
  }

  // Fallback
  return {
    tier,
    level,
    hitMode: "double_only",
    requiredHits: 1,
    baseSectionDarts: 12
  };
}

// ---- COMPONENT -------------------------------------------------------------

export default function DoublesWorld({ onFinish, disabled, tier, level }: Props) {
  const rankConfig = useMemo(
    () => getRankConfig(CURRENT_TIER, CURRENT_LEVEL),
    []
  );

  const TOTAL_SECTIONS = 20;
  const INITIAL_TOTAL_DARTS =
    rankConfig.baseSectionDarts * TOTAL_SECTIONS;

  const [phase, setPhase] = useState<1 | 2>(1);
  const [currentIndex, setCurrentIndex] = useState(0); // 0..19

  const [totalDartsLeft, setTotalDartsLeft] =
    useState(INITIAL_TOTAL_DARTS);
  const [sectionDartsLeft, setSectionDartsLeft] = useState(
    rankConfig.baseSectionDarts
  );

  const [hitsThisSection, setHitsThisSection] = useState(0);
  const [totalHits, setTotalHits] = useState(0);

  const [sections, setSections] = useState<SectionResult[]>(
    Array.from({ length: TOTAL_SECTIONS }, (_, idx) => ({
      number: idx + 1,
      phase: null,
      dartsUsed: 0,
      hits: 0,
      requiredHits: rankConfig.requiredHits,
      success: null
    }))
  );

  const [cleanupQueue, setCleanupQueue] = useState<number[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [finished, setFinished] = useState(false);

  const currentSection = sections[currentIndex];
  const dartsUsed = INITIAL_TOTAL_DARTS - totalDartsLeft;
  const accuracy =
    dartsUsed === 0 ? 0 : Math.round((totalHits / dartsUsed) * 100);

  const sectionsCompleted = sections.filter((s) => s.success === true).length;
  const sectionsFailed = sections.filter((s) => s.success === false).length;
  const cleanupUsed = cleanupQueue.length > 0 || phase === 2;
  const currentNumber = currentSection.number;

  function allSectionsSucceeded(updatedSections?: SectionResult[]): boolean {
    const list = updatedSections || sections;
    return list.every((s) => s.success === true);
  }

  // --- GAME FINISH ----------------------------------------------------------

  function finishGame(win: boolean, updatedSections?: SectionResult[]) {
    if (finished) return;

    const finalSections = updatedSections || sections;
    const finalDartsUsed = INITIAL_TOTAL_DARTS - totalDartsLeft;
    const finalHits = finalSections.reduce((sum, s) => sum + s.hits, 0);
    const finalAccuracy =
      finalDartsUsed === 0
        ? 0
        : Math.round((finalHits / finalDartsUsed) * 100);

    const payload = {
      game_key: "doubles_world",
      tier: rankConfig.tier,
      level: rankConfig.level,

win,
max_throws: INITIAL_TOTAL_DARTS,
throws_used: finalDartsUsed,
objective: {
  label: "Complete sections",
  target: TOTAL_SECTIONS,
  progress: finalSections.filter((s) => s.success === true).length
},
stats: {
  accuracy: finalAccuracy,
  total_hits: finalHits,
  avg_hits_per_dart:
    finalDartsUsed === 0 ? 0 : Number((finalHits / finalDartsUsed).toFixed(2)),
  sections_completed: finalSections.filter((s) => s.success === true).length,
  sections_failed: finalSections.filter((s) => s.success === false).length,
  cleanup_used: cleanupUsed
},
      total_darts_used: finalDartsUsed,
      total_hits: finalHits,
      sections_completed: finalSections.filter((s) => s.success === true)
        .length,
      sections_failed: finalSections.filter((s) => s.success === false).length,
      accuracy: finalAccuracy,
      cleanup_used: cleanupUsed,
      sections: finalSections.map((s) => ({
        number: s.number,
        phase: s.phase ?? 1,
        darts_used: s.dartsUsed,
        hits: s.hits,
        required_hits: s.requiredHits,
        success: !!s.success
      }))
    };

    setFinished(true);
    onFinish({ payload, win });
  }

  // --- PHASE TRANSITION HELPERS --------------------------------------------

  function startCleanup(updatedSections: SectionResult[], dartsLeft: number) {
    const missedIndices = updatedSections
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => s.success === false)
      .map(({ idx }) => idx);

    if (missedIndices.length === 0) {
      finishGame(true, updatedSections);
      return;
    }

    if (dartsLeft <= 0) {
      finishGame(false, updatedSections);
      return;
    }

    setPhase(2);
    setCleanupQueue(missedIndices);
    setCurrentIndex(missedIndices[0]);
    const first = updatedSections[missedIndices[0]];
    setHitsThisSection(first.hits);
    setSectionDartsLeft(0); // unused in phase 2
  }

  function advanceFromSection(
    updatedSections: SectionResult[],
    newTotalDartsLeft: number,
    sectionWasSuccess: boolean
  ) {
    if (phase === 1) {
      if (currentIndex < TOTAL_SECTIONS - 1) {
        const carry = sectionWasSuccess ? sectionDartsLeft : 0;
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setHitsThisSection(updatedSections[nextIndex].hits);
        setSectionDartsLeft(rankConfig.baseSectionDarts + carry);
      } else {
        const missedExists = updatedSections.some(
          (s) => s.success === false
        );

        if (!missedExists) {
          finishGame(true, updatedSections);
        } else {
          if (newTotalDartsLeft <= 0) {
            finishGame(false, updatedSections);
          } else {
            startCleanup(updatedSections, newTotalDartsLeft);
          }
        }
      }
    } else {
      const remaining = cleanupQueue.filter((idx) => idx !== currentIndex);
      if (remaining.length === 0) {
        finishGame(true, updatedSections);
      } else if (newTotalDartsLeft <= 0) {
        finishGame(false, updatedSections);
      } else {
        setCleanupQueue(remaining);
        setCurrentIndex(remaining[0]);
        const nextSec = updatedSections[remaining[0]];
        setHitsThisSection(nextSec.hits);
      }
    }
  }

  // --- HIT / MISS HANDLERS --------------------------------------------------

  function applyMisses(count: number, kind: "miss" | "miss3") {
    if (disabled || finished) return;
    if (totalDartsLeft <= 0) return;

    const actualCount = Math.min(count, totalDartsLeft);
    if (actualCount <= 0) return;

    const newTotal = totalDartsLeft - actualCount;
    let newSectionDarts = sectionDartsLeft;
    if (phase === 1) {
      newSectionDarts = Math.max(0, sectionDartsLeft - actualCount);
    }

    const sectionsCopy = sections.slice();
    const sec = sectionsCopy[currentIndex];

    sec.dartsUsed += actualCount;
    if (sec.phase == null) {
      sec.phase = phase;
    }

    setSections(sectionsCopy);
    setTotalDartsLeft(newTotal);
    if (phase === 1) setSectionDartsLeft(newSectionDarts);

    setHistory((hist) => [
      ...hist,
      { sectionIndex: currentIndex, phase, kind }
    ]);

    const meetsRequirement = sec.hits >= sec.requiredHits;

    if (meetsRequirement) {
      // Requirement was already met before these misses;
      // treat as success and advance.
      sec.success = true;
      sec.phase = sec.phase ?? phase;
      advanceFromSection(sectionsCopy, newTotal, true);
    } else if (phase === 1 && newSectionDarts === 0) {
      // section fail in phase 1
      sec.success = false;
      sec.phase = sec.phase ?? 1;
      if (!cleanupQueue.includes(currentIndex)) {
        setCleanupQueue((q) => [...q, currentIndex]);
      }
      advanceFromSection(sectionsCopy, newTotal, false);
    }

    if (newTotal <= 0 && !finished) {
      const allDone = allSectionsSucceeded(sectionsCopy);
      finishGame(allDone, sectionsCopy);
    }
  }

  function recordHit() {
    if (disabled || finished) return;
    if (totalDartsLeft <= 0) return;

    const newTotal = totalDartsLeft - 1;
    let newSectionDarts = sectionDartsLeft;
    if (phase === 1) {
      newSectionDarts = Math.max(0, sectionDartsLeft - 1);
    }

    const sectionsCopy = sections.slice();
    const sec = sectionsCopy[currentIndex];

    const newHits = sec.hits + 1;
    sec.hits = newHits;
    sec.dartsUsed += 1;
    if (sec.phase == null) {
      sec.phase = phase;
    }

    setSections(sectionsCopy);
    setTotalDartsLeft(newTotal);
    setTotalHits((h) => h + 1);
    setHitsThisSection((h) => h + 1);
    if (phase === 1) setSectionDartsLeft(newSectionDarts);

    setHistory((hist) => [
      ...hist,
      { sectionIndex: currentIndex, phase, kind: "hit" }
    ]);

    const meetsRequirement = newHits >= sec.requiredHits;

    if (meetsRequirement) {
      sec.success = true;
      sec.phase = sec.phase ?? phase;
      advanceFromSection(sectionsCopy, newTotal, true);
    } else if (phase === 1 && newSectionDarts === 0) {
      sec.success = false;
      sec.phase = sec.phase ?? 1;
      if (!cleanupQueue.includes(currentIndex)) {
        setCleanupQueue((q) => [...q, currentIndex]);
      }
      advanceFromSection(sectionsCopy, newTotal, false);
    }

    if (newTotal <= 0 && !finished) {
      const allDone = allSectionsSucceeded(sectionsCopy);
      finishGame(allDone, sectionsCopy);
    }
  }

  function recordMiss() {
    applyMisses(1, "miss");
  }

  function recordMissThree() {
    applyMisses(3, "miss3");
  }

  // Basic undo: only allowed while still on the same section & phase,
  // and only while the section is not yet marked success/fail.
  function handleUndo() {
    if (disabled || finished) return;
    const last = history[history.length - 1];
    if (!last) return;
    if (last.sectionIndex !== currentIndex || last.phase !== phase) {
      return;
    }

    const sectionsCopy = sections.slice();
    const sec = sectionsCopy[currentIndex];

    if (sec.success !== null) {
      // Already resolved; don’t allow undo
      return;
    }

    setHistory((hist) => hist.slice(0, -1));

    let dartsToRestore = 0;

    if (last.kind === "hit") {
      dartsToRestore = 1;
      sec.dartsUsed = Math.max(0, sec.dartsUsed - 1);
      sec.hits = Math.max(0, sec.hits - 1);
      setTotalHits((h) => Math.max(0, h - 1));
      setHitsThisSection((h) => Math.max(0, h - 1));
    } else if (last.kind === "miss") {
      dartsToRestore = 1;
      sec.dartsUsed = Math.max(0, sec.dartsUsed - 1);
    } else if (last.kind === "miss3") {
      dartsToRestore = 3;
      sec.dartsUsed = Math.max(0, sec.dartsUsed - 3);
    }

    setTotalDartsLeft((t) => t + dartsToRestore);
    if (phase === 1) {
      setSectionDartsLeft((d) => d + dartsToRestore);
    }

    setSections(sectionsCopy);
  }

  // --- LABELS / UI MAPPINGS -------------------------------------------------

  const phaseLabel = phase === 1 ? "Phase 1" : "Cleanup phase";

  let requirementLabel = "";
  if (rankConfig.hitMode === "wedge_any") {
    requirementLabel = `${rankConfig.requiredHits} hits anywhere on the ${currentNumber}`;
  } else if (rankConfig.hitMode === "fat_single") {
    requirementLabel = `${rankConfig.requiredHits} hits in the fat single ${currentNumber}`;
  } else {
    requirementLabel = `${rankConfig.requiredHits} hits on Double ${currentNumber}`;
  }

  const hitButtonLabel =
    rankConfig.hitMode === "wedge_any"
      ? "Hit"
      : rankConfig.hitMode === "fat_single"
      ? "Fat single hit"
      : "Double hit";

  // --- RENDER ----------------------------------------------------------------

  return (
    <div className="bullout">
      {/* Header */}
      <div className="bullout-header">
        <div>
          <div className="title-lg">Doubles Around the Board</div>
          <div className="muted">
            {phaseLabel} · Section {currentNumber} of {TOTAL_SECTIONS}
          </div>
          <div className="muted">{requirementLabel}</div>
        </div>

        <div className="objective-pill">
          <div className="objective-label">Darts left (global)</div>
          <div className="objective-value">{totalDartsLeft}</div>
        </div>
      </div>

      {/* Main layout */}
      <div className="bullout-main">
        {/* Board */}
        <DoublesBoard
          number={currentNumber}
          hitMode={rankConfig.hitMode}
          hits={hitsThisSection}
        />

        {/* Stats card */}
        <div className="bullout-stats card">
          {phase === 1 && (
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div className="title-lg">{sectionDartsLeft}</div>
                <div className="muted">Section darts</div>
              </div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div className="title-lg">
                  {hitsThisSection} / {rankConfig.requiredHits}
                </div>
                <div className="muted">Hits this section</div>
              </div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div className="title-lg">{sectionsCompleted}</div>
                <div className="muted">Sections done</div>
              </div>
            </div>
          )}

          {phase === 2 && (
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div className="title-lg">{cleanupQueue.length + 1}</div>
                <div className="muted">Sections left</div>
              </div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div className="title-lg">
                  {hitsThisSection} / {rankConfig.requiredHits}
                </div>
                <div className="muted">Hits on this number</div>
              </div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div className="title-lg">{totalDartsLeft}</div>
                <div className="muted">Darts left</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">Total hits</div>
                <div className="pill-value">{totalHits}</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Accuracy</div>
                <div className="pill-value">{accuracy}%</div>
              </div>
              <div className="pill pill-stat">
                <div className="pill-label">Current section</div>
                <div className="pill-value">
                  {currentNumber} / {TOTAL_SECTIONS}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bullout-controls">
        <button
          className="btn success"
          onClick={recordHit}
          disabled={disabled || finished || totalDartsLeft <= 0}
        >
          {hitButtonLabel}
        </button>
        <button
          className="btn outline"
          onClick={recordMiss}
          disabled={disabled || finished || totalDartsLeft <= 0}
        >
          Miss
        </button>
        <button
          className="btn outline"
          onClick={recordMissThree}
          disabled={disabled || finished || totalDartsLeft <= 0}
        >
          Miss 3 darts
        </button>
        <button
          className="btn outline"
          onClick={handleUndo}
          disabled={
            disabled || finished || history.length === 0
          }
        >
          Undo last
        </button>
      </div>
    </div>
  );
}

// --- Dartboard visual -------------------------------------------------------
function DoublesBoard({
    number,
    hitMode,
    hits
  }: {
    number: number;
    hitMode: HitMode;
    hits: number;
  }) {
    // Real dartboard numbering, clockwise from top (20)
    const BOARD_ORDER = [
      20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
      3, 19, 7, 16, 8, 11, 14, 9, 12, 5
    ];
  
    const idx = BOARD_ORDER.indexOf(number);
    const segmentIndex = idx === -1 ? 0 : idx;
  
    const rDouble = 52;
    const rOuterSingle = 46;
    const rInnerSingle = 32;
  
    const circDouble = 2 * Math.PI * rDouble;
    const segDouble = circDouble / 20;
    const dashDouble = `${segDouble} ${circDouble - segDouble}`;
  
    const circOuter = 2 * Math.PI * rOuterSingle;
    const segOuter = circOuter / 20;
    const dashOuter = `${segOuter} ${circOuter - segOuter}`;
  
    const circInner = 2 * Math.PI * rInnerSingle;
    const segInner = circInner / 20;
    const dashInner = `${segInner} ${circInner - segInner}`;
  
    // SVG 0° is at the RIGHT.
    // We want the *center* of the 20 segment at the TOP.
    const segmentAngle = 360 / 20;      // 18°
    const baseOffset = -90 - segmentAngle / 2; // -90° - 9° = -99°
    const rotationDeg = segmentIndex * segmentAngle + baseOffset;
  
    const highlightColor =
      hitMode === "double_only"
        ? "#00c46a"
        : hitMode === "fat_single"
        ? "#fbbf24"
        : "#3b82f6";
  
    const modeLabel =
      hitMode === "wedge_any"
        ? "Any part"
        : hitMode === "fat_single"
        ? "Fat single"
        : "Double ring";
  
    return (
      <div className="bull-board-wrapper card">
        <svg
          viewBox="0 0 120 120"
          className="bull-board"
          aria-hidden="true"
        >
          {/* Board background */}
          <circle cx="60" cy="60" r="58" fill="#020617" />
          <circle cx="60" cy="60" r="50" fill="#020617" />
          <circle cx="60" cy="60" r="40" fill="#020617" />
  
          {/* Neutral rings */}
          <circle
            cx="60"
            cy="60"
            r={rOuterSingle}
            fill="none"
            stroke="#0f172a"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={rInnerSingle}
            fill="none"
            stroke="#020617"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={rDouble}
            fill="none"
            stroke="#0b1120"
            strokeWidth="8"
          />
  
          {/* Highlighted segment */}
          <g key={hits} className="bull-group">
            {hitMode === "double_only" && (
              <g transform={`rotate(${rotationDeg} 60 60)`}>
                <circle
                  cx="60"
                  cy="60"
                  r={rDouble}
                  fill="none"
                  stroke={highlightColor}
                  strokeWidth="8"
                  strokeDasharray={dashDouble}
                />
              </g>
            )}
  
            {hitMode === "fat_single" && (
              <g transform={`rotate(${rotationDeg} 60 60)`}>
                <circle
                  cx="60"
                  cy="60"
                  r={rOuterSingle}
                  fill="none"
                  stroke={highlightColor}
                  strokeWidth="8"
                  strokeDasharray={dashOuter}
                />
              </g>
            )}
  
            {hitMode === "wedge_any" && (
              <g transform={`rotate(${rotationDeg} 60 60)`}>
                <circle
                  cx="60"
                  cy="60"
                  r={rOuterSingle}
                  fill="none"
                  stroke={highlightColor}
                  strokeWidth="8"
                  strokeDasharray={dashOuter}
                />
                <circle
                  cx="60"
                  cy="60"
                  r={rInnerSingle}
                  fill="none"
                  stroke={highlightColor}
                  strokeWidth="10"
                  strokeDasharray={dashInner}
                />
              </g>
            )}
  
            {/* Center label */}
            <circle cx="60" cy="60" r="22" fill="#020617" />
            <text
              x="60"
              y="57"
              textAnchor="middle"
              fontSize="18"
              fill="#f9fafb"
              fontWeight="700"
            >
              D{number}
            </text>
            <text
              x="60"
              y="75"
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
            >
              {modeLabel}
            </text>
          </g>
        </svg>
      </div>
    );
  }
  
  
  
