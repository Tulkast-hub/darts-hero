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
  onDartsUsed?: (count: number) => void;
  externalUndo?: { token: number; steps: number };
};

type HitMode =
  | "wedge_any"
  | "fat_single"
  | "double_only";

type RankConfig = {
  tier: Tier;
  level: number;
  hitMode: HitMode;
  requiredHits: number;
  baseSectionDarts: number;
};

type SectionResult = {
  number: number;
  phase: 1 | 2 | null;
  dartsUsed: number;
  hits: number;
  requiredHits: number;
  success: boolean | null;
};

type GameSnapshot = {
  phase: 1 | 2;
  currentIndex: number;
  totalDartsLeft: number;
  sectionDartsLeft: number;
  hitsThisSection: number;
  totalHits: number;
  sections: SectionResult[];
  cleanupQueue: number[];
  finished: boolean;
};

// --------------------------------------------------
// RANK CONFIG
// --------------------------------------------------

function getRankConfig(
  tier: Tier,
  level: number
): RankConfig {
  if (tier === "Bronze") {
    if (level <= 3) {
      return {
        tier,
        level,
        hitMode: "wedge_any",
        requiredHits: 3,
        baseSectionDarts: 12,
      };
    }

    return {
      tier,
      level,
      hitMode: "fat_single",
      requiredHits: 3,
      baseSectionDarts: 12,
    };
  }

  if (tier === "Silver") {
    return {
      tier,
      level,
      hitMode: "double_only",
      requiredHits: 1,
      baseSectionDarts:
        level <= 3 ? 12 : 9,
    };
  }

  if (tier === "Gold") {
    return {
      tier,
      level,
      hitMode: "double_only",
      requiredHits: 2,
      baseSectionDarts:
        level <= 3 ? 12 : 9,
    };
  }

  if (tier === "Platinum") {
    return {
      tier,
      level,
      hitMode: "double_only",
      requiredHits: 3,
      baseSectionDarts:
        level <= 3 ? 12 : 9,
    };
  }

  if (tier === "Diamond") {
    return {
      tier,
      level,
      hitMode: "double_only",
      requiredHits:
        level <= 2 ? 3 : 4,
      baseSectionDarts: 9,
    };
  }

  return {
    tier,
    level,
    hitMode: "double_only",
    requiredHits: 1,
    baseSectionDarts: 12,
  };
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

export default function DoublesWorld({
  onFinish,
  disabled,
  tier,
  level,
  onDartsUsed,
  externalUndo,
}: Props) {
  const rankConfig = useMemo(
    () => getRankConfig(tier, level),
    [tier, level]
  );

  const TOTAL_SECTIONS = 20;

  const INITIAL_TOTAL_DARTS =
    rankConfig.baseSectionDarts *
    TOTAL_SECTIONS;

  const [phase, setPhase] =
    useState<1 | 2>(1);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    totalDartsLeft,
    setTotalDartsLeft,
  ] = useState(
    INITIAL_TOTAL_DARTS
  );

  const [
    sectionDartsLeft,
    setSectionDartsLeft,
  ] = useState(
    rankConfig.baseSectionDarts
  );

  const [
    hitsThisSection,
    setHitsThisSection,
  ] = useState(0);

  const [
    totalHits,
    setTotalHits,
  ] = useState(0);

  const [
    sections,
    setSections,
  ] = useState<SectionResult[]>(
    Array.from(
      {
        length: TOTAL_SECTIONS,
      },
      (_, idx) => ({
        number: idx + 1,
        phase: null,
        dartsUsed: 0,
        hits: 0,
        requiredHits:
          rankConfig.requiredHits,
        success: null,
      })
    )
  );

  const [
    cleanupQueue,
    setCleanupQueue,
  ] = useState<number[]>([]);

  const [
    history,
    setHistory,
  ] = useState<GameSnapshot[]>(
    []
  );

  const [
    finished,
    setFinished,
  ] = useState(false);

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  React.useEffect(() => {
    const initialTotal =
      rankConfig.baseSectionDarts *
      TOTAL_SECTIONS;

    setPhase(1);
    setCurrentIndex(0);
    setTotalDartsLeft(initialTotal);

    setSectionDartsLeft(
      rankConfig.baseSectionDarts
    );

    setHitsThisSection(0);
    setTotalHits(0);

    setCleanupQueue([]);
    setHistory([]);
    setFinished(false);

    setSections(
      Array.from(
        {
          length: TOTAL_SECTIONS,
        },
        (_, idx) => ({
          number: idx + 1,
          phase: null,
          dartsUsed: 0,
          hits: 0,
          requiredHits:
            rankConfig.requiredHits,
          success: null,
        })
      )
    );
  }, [
    rankConfig.tier,
    rankConfig.level,
    rankConfig.baseSectionDarts,
    rankConfig.requiredHits,
    rankConfig.hitMode,
  ]);

  const currentSection =
    sections[currentIndex];

  const currentNumber =
    currentSection.number;

  /*
   * We derive darts used directly from
   * section history instead of:
   *
   * initial - remaining
   *
   * because the cleanup phase can receive
   * extra unused section darts.
   */
  const dartsUsed =
    sections.reduce(
      (sum, section) =>
        sum + section.dartsUsed,
      0
    );

  const accuracy =
    dartsUsed === 0
      ? 0
      : Math.round(
          (totalHits / dartsUsed) *
            100
        );

  const sectionsCompleted =
    sections.filter(
      (section) =>
        section.success === true
    ).length;

  const sectionsFailed =
    sections.filter(
      (section) =>
        section.success === false
    ).length;

  const cleanupUsed =
    cleanupQueue.length > 0 ||
    phase === 2;

  // --------------------------------------------------
  // SNAPSHOT HELPERS
  // --------------------------------------------------

  function cloneSections(
    source:
      | SectionResult[]
      | undefined = sections
  ): SectionResult[] {
    return source.map(
      (section) => ({
        ...section,
      })
    );
  }

  function createSnapshot():
    GameSnapshot {
    return {
      phase,
      currentIndex,
      totalDartsLeft,
      sectionDartsLeft,
      hitsThisSection,
      totalHits,
      sections:
        cloneSections(),
      cleanupQueue: [
        ...cleanupQueue,
      ],
      finished,
    };
  }

  function restoreSnapshot(
    snapshot: GameSnapshot
  ) {
    setPhase(snapshot.phase);

    setCurrentIndex(
      snapshot.currentIndex
    );

    setTotalDartsLeft(
      snapshot.totalDartsLeft
    );

    setSectionDartsLeft(
      snapshot.sectionDartsLeft
    );

    setHitsThisSection(
      snapshot.hitsThisSection
    );

    setTotalHits(
      snapshot.totalHits
    );

    setSections(
      cloneSections(
        snapshot.sections
      )
    );

    setCleanupQueue([
      ...snapshot.cleanupQueue,
    ]);

    setFinished(
      snapshot.finished
    );
  }

  // --------------------------------------------------
  // FINISH
  // --------------------------------------------------

  function finishGame(
    win: boolean,
    updatedSections?:
      SectionResult[]
  ) {
    if (finished) {
      return;
    }

    const finalSections =
      updatedSections ||
      sections;

    const finalDartsUsed =
      finalSections.reduce(
        (sum, section) =>
          sum +
          section.dartsUsed,
        0
      );

    const finalHits =
      finalSections.reduce(
        (sum, section) =>
          sum + section.hits,
        0
      );

    const finalAccuracy =
      finalDartsUsed === 0
        ? 0
        : Math.round(
            (finalHits /
              finalDartsUsed) *
              100
          );

    const completedCount =
      finalSections.filter(
        (section) =>
          section.success ===
          true
      ).length;

    const failedCount =
      finalSections.filter(
        (section) =>
          section.success ===
          false
      ).length;

    const payload = {
      game_key:
        "doubles_world",

      tier:
        rankConfig.tier,

      level:
        rankConfig.level,

      win,

      max_throws:
        INITIAL_TOTAL_DARTS,

      throws_used:
        finalDartsUsed,

      objective: {
        label:
          "Complete sections",

        target:
          TOTAL_SECTIONS,

        progress:
          completedCount,
      },

      stats: {
        accuracy:
          finalAccuracy,

        total_hits:
          finalHits,

        avg_hits_per_dart:
          finalDartsUsed === 0
            ? 0
            : Number(
                (
                  finalHits /
                  finalDartsUsed
                ).toFixed(2)
              ),

        sections_completed:
          completedCount,

        sections_failed:
          failedCount,

        cleanup_used:
          cleanupUsed,
      },

      total_darts_used:
        finalDartsUsed,

      total_hits:
        finalHits,

      sections_completed:
        completedCount,

      sections_failed:
        failedCount,

      accuracy:
        finalAccuracy,

      cleanup_used:
        cleanupUsed,

      sections:
        finalSections.map(
          (section) => ({
            number:
              section.number,

            phase:
              section.phase ??
              1,

            darts_used:
              section.dartsUsed,

            hits:
              section.hits,

            required_hits:
              section.requiredHits,

            success:
              !!section.success,
          })
        ),
    };

    setFinished(true);

    onFinish({
      payload,
      win,
    });
  }

  // --------------------------------------------------
  // PHASE TRANSITIONS
  // --------------------------------------------------

  function startCleanup(
    updatedSections:
      SectionResult[],
    globalDartsLeft:
      number,
    remainingSectionDarts:
      number
  ) {
    const missedIndices =
      updatedSections
        .map(
          (
            section,
            index
          ) => ({
            section,
            index,
          })
        )
        .filter(
          ({
            section,
          }) =>
            section.success ===
            false
        )
        .map(
          ({ index }) =>
            index
        );

    if (
      missedIndices.length ===
      0
    ) {
      finishGame(
        true,
        updatedSections
      );

      return;
    }

    /*
     * Cleanup pool:
     *
     * global darts left
     * +
     * unused darts from the
     * final section.
     */
    const cleanupDartsLeft =
      Math.max(
        0,
        globalDartsLeft
      ) +
      Math.max(
        0,
        remainingSectionDarts
      );

    if (
      cleanupDartsLeft <= 0
    ) {
      finishGame(
        false,
        updatedSections
      );

      return;
    }

    setPhase(2);

    setTotalDartsLeft(
      cleanupDartsLeft
    );

    setCleanupQueue(
      missedIndices
    );

    setCurrentIndex(
      missedIndices[0]
    );

    const first =
      updatedSections[
        missedIndices[0]
      ];

    setHitsThisSection(
      first.hits
    );

    /*
     * Cleanup has one shared
     * dart pool, so there is
     * no individual section
     * allowance here.
     */
    setSectionDartsLeft(0);
  }

  function advanceFromSection(
    updatedSections:
      SectionResult[],
    newTotalDartsLeft:
      number,
    sectionWasSuccess:
      boolean,
    remainingSectionDarts:
      number
  ) {
    if (phase === 1) {
      if (
        currentIndex <
        TOTAL_SECTIONS - 1
      ) {
        if (
          newTotalDartsLeft <=
          0
        ) {
          finishGame(
            false,
            updatedSections
          );

          return;
        }

        const carry =
          sectionWasSuccess
            ? remainingSectionDarts
            : 0;

        const nextIndex =
          currentIndex + 1;

        setCurrentIndex(
          nextIndex
        );

        setHitsThisSection(
          updatedSections[
            nextIndex
          ].hits
        );

        setSectionDartsLeft(
          rankConfig.baseSectionDarts +
            carry
        );

        return;
      }

      const missedExists =
        updatedSections.some(
          (section) =>
            section.success ===
            false
        );

      if (!missedExists) {
        finishGame(
          true,
          updatedSections
        );

        return;
      }

      startCleanup(
        updatedSections,
        newTotalDartsLeft,
        sectionWasSuccess
          ? remainingSectionDarts
          : 0
      );

      return;
    }

    const remaining =
      cleanupQueue.filter(
        (index) =>
          index !==
          currentIndex
      );

    if (
      remaining.length === 0
    ) {
      finishGame(
        true,
        updatedSections
      );

      return;
    }

    if (
      newTotalDartsLeft <= 0
    ) {
      finishGame(
        false,
        updatedSections
      );

      return;
    }

    setCleanupQueue(
      remaining
    );

    setCurrentIndex(
      remaining[0]
    );

    const nextSection =
      updatedSections[
        remaining[0]
      ];

    setHitsThisSection(
      nextSection.hits
    );
  }

  // --------------------------------------------------
  // ACTIONS
  // --------------------------------------------------

  function applyMisses(
    count: number
  ) {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      totalDartsLeft <= 0
    ) {
      return;
    }

    const availableDarts =
      phase === 1
        ? Math.min(
            totalDartsLeft,
            sectionDartsLeft
          )
        : totalDartsLeft;

    const actualCount =
      Math.min(
        count,
        availableDarts
      );

    if (
      actualCount <= 0
    ) {
      return;
    }

    const snapshot =
      createSnapshot();

    setHistory(
      (currentHistory) => [
        ...currentHistory,
        snapshot,
      ]
    );

    onDartsUsed?.(
      actualCount
    );

    const newTotal =
      totalDartsLeft -
      actualCount;

    let newSectionDarts =
      sectionDartsLeft;

    if (phase === 1) {
      newSectionDarts =
        Math.max(
          0,
          sectionDartsLeft -
            actualCount
        );
    }

    const sectionsCopy =
      cloneSections();

    const section =
      sectionsCopy[
        currentIndex
      ];

    section.dartsUsed +=
      actualCount;

    if (
      section.phase == null
    ) {
      section.phase =
        phase;
    }

    setSections(
      sectionsCopy
    );

    setTotalDartsLeft(
      newTotal
    );

    if (phase === 1) {
      setSectionDartsLeft(
        newSectionDarts
      );
    }

    const meetsRequirement =
      section.hits >=
      section.requiredHits;

    if (
      meetsRequirement
    ) {
      section.success =
        true;

      section.phase =
        section.phase ??
        phase;

      advanceFromSection(
        sectionsCopy,
        newTotal,
        true,
        newSectionDarts
      );

      return;
    }

    if (
      phase === 1 &&
      newSectionDarts === 0
    ) {
      section.success =
        false;

      section.phase =
        section.phase ??
        1;

      advanceFromSection(
        sectionsCopy,
        newTotal,
        false,
        0
      );

      return;
    }

    if (
      phase === 2 &&
      newTotal <= 0
    ) {
      finishGame(
        false,
        sectionsCopy
      );
    }
  }

  function recordHit() {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      totalDartsLeft <= 0
    ) {
      return;
    }

    if (
      phase === 1 &&
      sectionDartsLeft <= 0
    ) {
      return;
    }

    const snapshot =
      createSnapshot();

    setHistory(
      (currentHistory) => [
        ...currentHistory,
        snapshot,
      ]
    );

    onDartsUsed?.(1);

    const newTotal =
      totalDartsLeft - 1;

    let newSectionDarts =
      sectionDartsLeft;

    if (phase === 1) {
      newSectionDarts =
        Math.max(
          0,
          sectionDartsLeft - 1
        );
    }

    const sectionsCopy =
      cloneSections();

    const section =
      sectionsCopy[
        currentIndex
      ];

    const newHits =
      section.hits + 1;

    section.hits =
      newHits;

    section.dartsUsed += 1;

    if (
      section.phase == null
    ) {
      section.phase =
        phase;
    }

    setSections(
      sectionsCopy
    );

    setTotalDartsLeft(
      newTotal
    );

    setTotalHits(
      totalHits + 1
    );

    setHitsThisSection(
      newHits
    );

    if (phase === 1) {
      setSectionDartsLeft(
        newSectionDarts
      );
    }

    const meetsRequirement =
      newHits >=
      section.requiredHits;

    if (
      meetsRequirement
    ) {
      section.success =
        true;

      section.phase =
        section.phase ??
        phase;

      advanceFromSection(
        sectionsCopy,
        newTotal,
        true,
        newSectionDarts
      );

      return;
    }

    if (
      phase === 1 &&
      newSectionDarts === 0
    ) {
      section.success =
        false;

      section.phase =
        section.phase ??
        1;

      advanceFromSection(
        sectionsCopy,
        newTotal,
        false,
        0
      );

      return;
    }

    if (
      phase === 2 &&
      newTotal <= 0
    ) {
      finishGame(
        false,
        sectionsCopy
      );
    }
  }

  function recordMiss() {
    applyMisses(1);
  }

  function recordMissTwo() {
    applyMisses(2);
  }

  function recordMissThree() {
    applyMisses(3);
  }

  // --------------------------------------------------
  // UNDO
  // --------------------------------------------------

  /*
   * Snapshot-based undo.
   *
   * If a hit completes D4 and moves
   * the player to D5, Undo restores
   * the entire state from before
   * that hit, including D4.
   */
  function handleUndo(
    steps = 1
  ) {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      history.length === 0
    ) {
      return;
    }

    const safeSteps =
      Math.max(
        1,
        Math.min(
          steps,
          history.length
        )
      );

    const snapshotIndex =
      history.length -
      safeSteps;

    const snapshot =
      history[
        snapshotIndex
      ];

    restoreSnapshot(
      snapshot
    );

    setHistory(
      history.slice(
        0,
        snapshotIndex
      )
    );
  }

  React.useEffect(() => {
    if (!externalUndo) {
      return;
    }

    if (
      externalUndo.steps <= 0
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          handleUndo(
            externalUndo.steps
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

  // --------------------------------------------------
  // LABELS
  // --------------------------------------------------

  const phaseLabel =
    phase === 1
      ? "Phase 1"
      : "Cleanup phase";

  let requirementLabel =
    "";

  if (
    rankConfig.hitMode ===
    "wedge_any"
  ) {
    requirementLabel =
      `${rankConfig.requiredHits} hits anywhere on the ${currentNumber}`;
  } else if (
    rankConfig.hitMode ===
    "fat_single"
  ) {
    requirementLabel =
      `${rankConfig.requiredHits} hits in the fat single ${currentNumber}`;
  } else {
    requirementLabel =
      `${rankConfig.requiredHits} hits on Double ${currentNumber}`;
  }

  const hitButtonLabel =
    rankConfig.hitMode ===
    "wedge_any"
      ? "Hit"
      : rankConfig.hitMode ===
          "fat_single"
      ? "Fat single hit"
      : "Double hit";

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="bullout">
      {/*
        Header + board are grouped so
        the objective follows the user
        while scrolling the board and
        naturally stops before the controls.
      */}
      <div>
        <div
          className="bullout-header game-objective-sticky"
        >
          <div>
            <div className="muted">
              {phaseLabel} ·
              Section{" "}
              {currentNumber} of{" "}
              {TOTAL_SECTIONS}
            </div>

            <div className="muted">
              {
                requirementLabel
              }
            </div>
          </div>

          <div className="objective-pill">
            <div className="objective-label">
              {phase === 1
                ? "Darts left (global)"
                : "Cleanup darts left"}
            </div>

            <div className="objective-value">
              {
                totalDartsLeft
              }
            </div>
          </div>
        </div>

        <DoublesBoard
          number={
            currentNumber
          }
          hitMode={
            rankConfig.hitMode
          }
          hits={
            hitsThisSection
          }
        />
      </div>

      <div className="bullout-main aw-main">
        <div
          className="bullout-controls"
          data-hotkeys="drill"
        >
          <button
            className="btn success"
            data-hotkey="1"
            onClick={recordHit}
            disabled={
              disabled ||
              finished ||
              totalDartsLeft <=
                0
            }
          >
            {
              hitButtonLabel
            }
          </button>

          <button
            className="btn outline"
            data-hotkey="2"
            onClick={
              recordMiss
            }
            disabled={
              disabled ||
              finished ||
              totalDartsLeft <=
                0
            }
          >
            Miss
          </button>

          <button
            className="btn outline"
            data-hotkey="3"
            onClick={
              recordMissTwo
            }
            disabled={
              disabled ||
              finished ||
              totalDartsLeft <=
                0
            }
          >
            Miss 2 darts
          </button>

          <button
            className="btn outline"
            data-hotkey="4"
            onClick={
              recordMissThree
            }
            disabled={
              disabled ||
              finished ||
              totalDartsLeft <=
                0
            }
          >
            Miss 3 darts
          </button>

          <button
            className="btn outline"
            data-hotkey="0"
            onClick={() =>
              handleUndo()
            }
            disabled={
              disabled ||
              finished ||
              history.length ===
                0
            }
          >
            Undo
          </button>
        </div>

        <div className="bullout-stats card">
          {phase === 1 && (
            <div
              className="row"
              style={{
                justifyContent:
                  "space-between",
              }}
            >
              <div
                style={{
                  textAlign:
                    "center",
                  flex: 1,
                }}
              >
                <div className="title-lg">
                  {
                    sectionDartsLeft
                  }
                </div>

                <div className="muted">
                  Section darts
                </div>
              </div>

              <div
                style={{
                  textAlign:
                    "center",
                  flex: 1,
                }}
              >
                <div className="title-lg">
                  {
                    hitsThisSection
                  }{" "}
                  /{" "}
                  {
                    rankConfig.requiredHits
                  }
                </div>

                <div className="muted">
                  Hits this section
                </div>
              </div>

              <div
                style={{
                  textAlign:
                    "center",
                  flex: 1,
                }}
              >
                <div className="title-lg">
                  {
                    currentNumber
                  }{" "}
                  /{" "}
                  {
                    TOTAL_SECTIONS
                  }
                </div>

                <div className="muted">
                  Current section
                </div>
              </div>
            </div>
          )}

          {phase === 2 && (
            <div
              className="row"
              style={{
                justifyContent:
                  "space-between",
              }}
            >
              <div
                style={{
                  textAlign:
                    "center",
                  flex: 1,
                }}
              >
                <div className="title-lg">
                  {
                    cleanupQueue.length
                  }
                </div>

                <div className="muted">
                  Sections left
                </div>
              </div>

              <div
                style={{
                  textAlign:
                    "center",
                  flex: 1,
                }}
              >
                <div className="title-lg">
                  {
                    hitsThisSection
                  }{" "}
                  /{" "}
                  {
                    rankConfig.requiredHits
                  }
                </div>

                <div className="muted">
                  Hits on this
                  number
                </div>
              </div>

              <div
                style={{
                  textAlign:
                    "center",
                  flex: 1,
                }}
              >
                <div className="title-lg">
                  {
                    totalDartsLeft
                  }
                </div>

                <div className="muted">
                  Darts left
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 12,
            }}
          >
            <div className="row bullout-stat-row">
              <div className="pill pill-stat">
                <div className="pill-label">
                  Total hits
                </div>

                <div className="pill-value">
                  {
                    totalHits
                  }
                </div>
              </div>

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
                  Sections done
                </div>

                <div className="pill-value">
                  {
                    sectionsCompleted
                  }
                </div>
              </div>

              <div className="pill pill-stat">
                <div className="pill-label">
                  Sections failed
                </div>

                <div className="pill-value">
                  {
                    sectionsFailed
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

// --------------------------------------------------
// DARTBOARD
// --------------------------------------------------

function DoublesBoard({
  number,
  hitMode,
  hits,
}: {
  number: number;
  hitMode: HitMode;
  hits: number;
}) {
  const BOARD_ORDER = [
    20,
    1,
    18,
    4,
    13,
    6,
    10,
    15,
    2,
    17,
    3,
    19,
    7,
    16,
    8,
    11,
    14,
    9,
    12,
    5,
  ];

  const idx =
    BOARD_ORDER.indexOf(
      number
    );

  const segmentIndex =
    idx === -1 ? 0 : idx;

  const rDouble = 52;
  const rOuterSingle = 46;
  const rInnerSingle = 32;

  const circDouble =
    2 *
    Math.PI *
    rDouble;

  const segDouble =
    circDouble / 20;

  const dashDouble =
    `${segDouble} ${
      circDouble -
      segDouble
    }`;

  const circOuter =
    2 *
    Math.PI *
    rOuterSingle;

  const segOuter =
    circOuter / 20;

  const dashOuter =
    `${segOuter} ${
      circOuter -
      segOuter
    }`;

  const circInner =
    2 *
    Math.PI *
    rInnerSingle;

  const segInner =
    circInner / 20;

  const dashInner =
    `${segInner} ${
      circInner -
      segInner
    }`;

  /*
   * SVG starts at 0° on the
   * right side.
   *
   * Center the 20 segment
   * at the top.
   */
  const segmentAngle =
    360 / 20;

  const baseOffset =
    -90 -
    segmentAngle / 2;

  const rotationDeg =
    segmentIndex *
      segmentAngle +
    baseOffset;

  const highlightColor =
    hitMode ===
    "double_only"
      ? "#00c46a"
      : hitMode ===
          "fat_single"
      ? "#fbbf24"
      : "#3b82f6";

  const modeLabel =
    hitMode ===
    "wedge_any"
      ? "Any part"
      : hitMode ===
          "fat_single"
      ? "Fat single"
      : "Double ring";

  return (
    <div className="bull-board-wrapper">
      <svg
        viewBox="0 0 120 120"
        className="bull-board"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r="58"
          fill="#020617"
        />

        <circle
          cx="60"
          cy="60"
          r="50"
          fill="#020617"
        />

        <circle
          cx="60"
          cy="60"
          r="40"
          fill="#020617"
        />

        <circle
          cx="60"
          cy="60"
          r={
            rOuterSingle
          }
          fill="none"
          stroke="#0f172a"
          strokeWidth="8"
        />

        <circle
          cx="60"
          cy="60"
          r={
            rInnerSingle
          }
          fill="none"
          stroke="#020617"
          strokeWidth="10"
        />

        <circle
          cx="60"
          cy="60"
          r={
            rDouble
          }
          fill="none"
          stroke="#0b1120"
          strokeWidth="8"
        />

        <g
          key={hits}
          className="bull-group"
        >
          {hitMode ===
            "double_only" && (
            <g
              transform={`rotate(${rotationDeg} 60 60)`}
            >
              <circle
                cx="60"
                cy="60"
                r={
                  rDouble
                }
                fill="none"
                stroke={
                  highlightColor
                }
                strokeWidth="8"
                strokeDasharray={
                  dashDouble
                }
              />
            </g>
          )}

          {hitMode ===
            "fat_single" && (
            <g
              transform={`rotate(${rotationDeg} 60 60)`}
            >
              <circle
                cx="60"
                cy="60"
                r={
                  rOuterSingle
                }
                fill="none"
                stroke={
                  highlightColor
                }
                strokeWidth="8"
                strokeDasharray={
                  dashOuter
                }
              />
            </g>
          )}

          {hitMode ===
            "wedge_any" && (
            <g
              transform={`rotate(${rotationDeg} 60 60)`}
            >
              <circle
                cx="60"
                cy="60"
                r={
                  rOuterSingle
                }
                fill="none"
                stroke={
                  highlightColor
                }
                strokeWidth="8"
                strokeDasharray={
                  dashOuter
                }
              />

              <circle
                cx="60"
                cy="60"
                r={
                  rInnerSingle
                }
                fill="none"
                stroke={
                  highlightColor
                }
                strokeWidth="10"
                strokeDasharray={
                  dashInner
                }
              />
            </g>
          )}

          <circle
            cx="60"
            cy="60"
            r="22"
            fill="#020617"
          />

          {hitMode ===
            "double_only" && (
            <g>
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
                {
                  modeLabel
                }
              </text>
            </g>
          )}

          {hitMode ===
            "fat_single" && (
            <g>
              <text
                x="60"
                y="57"
                textAnchor="middle"
                fontSize="18"
                fill="#f9fafb"
                fontWeight="700"
              >
                F{number}
              </text>

              <text
                x="60"
                y="75"
                textAnchor="middle"
                fontSize="10"
                fill="#9ca3af"
              >
                {
                  modeLabel
                }
              </text>
            </g>
          )}

          {hitMode ===
            "wedge_any" && (
            <g>
              <text
                x="60"
                y="57"
                textAnchor="middle"
                fontSize="18"
                fill="#f9fafb"
                fontWeight="700"
              >
                S{number}
              </text>

              <text
                x="60"
                y="75"
                textAnchor="middle"
                fontSize="10"
                fill="#9ca3af"
              >
                {
                  modeLabel
                }
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}