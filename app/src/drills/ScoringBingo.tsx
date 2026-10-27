// src/drills/ScoringBingo.tsx

import React, {
  useMemo,
  useState,
} from "react";

import type {
  Tier,
} from "../xp/types";

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

const MAX_VISITS = 50;

const LINE_XP = 10;

/* --------------------------------------------------
   SCORE POTS
-------------------------------------------------- */

const POT_1 = [
  54,
  56,
  57,
  58,
  59,
  60,
];

const POT_2 = [
  90,
  92,
  94,
  95,
  96,
  97,
  98,
  99,
  100,
];

const POT_3 = [
  126,
  131,
  133,
  134,
  137,
  138,
  140,
];

const POT_4 = [
  162,
  171,
  174,
  177,
  180,
];

/**
 * Used whenever 180 is forced
 * into the centre square.
 *
 * This prevents 180 appearing
 * somewhere else as well.
 */
const POT_4_NO_180 =
  POT_4.filter(
    (score) =>
      score !== 180
  );

/* --------------------------------------------------
   BOARD TYPES
-------------------------------------------------- */

type CellRole =
  | "corner"
  | "edge"
  | "center";

type BingoCell = {
  id: string;
  index: number;
  value: number;
  role: CellRole;
  requiredHits: number;
};

type HitAction = {
  type: "HIT";
  cellId: string;
};

type MissAction = {
  type: "MISS";
};

type Action =
  | HitAction
  | MissAction;

type BingoLine = {
  id: string;

  cells: [
    number,
    number,
    number
  ];

  className: string;
};

/* --------------------------------------------------
   BOARD POSITIONS
-------------------------------------------------- */

/**
 * Grid:
 *
 * 0 1 2
 * 3 4 5
 * 6 7 8
 */

const CORNER_INDEXES = [
  0,
  2,
  6,
  8,
];

const EDGE_INDEXES = [
  1,
  3,
  5,
  7,
];

const CENTER_INDEX = 4;

const ALL_INDEXES = [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
];

/* --------------------------------------------------
   BINGO LINES
-------------------------------------------------- */

const BINGO_LINES: BingoLine[] = [
  {
    id: "row-1",
    cells: [
      0,
      1,
      2,
    ],
    className:
      "bingo-line--row-1",
  },

  {
    id: "row-2",
    cells: [
      3,
      4,
      5,
    ],
    className:
      "bingo-line--row-2",
  },

  {
    id: "row-3",
    cells: [
      6,
      7,
      8,
    ],
    className:
      "bingo-line--row-3",
  },

  {
    id: "column-1",
    cells: [
      0,
      3,
      6,
    ],
    className:
      "bingo-line--column-1",
  },

  {
    id: "column-2",
    cells: [
      1,
      4,
      7,
    ],
    className:
      "bingo-line--column-2",
  },

  {
    id: "column-3",
    cells: [
      2,
      5,
      8,
    ],
    className:
      "bingo-line--column-3",
  },

  {
    id: "diagonal-1",
    cells: [
      0,
      4,
      8,
    ],
    className:
      "bingo-line--diagonal-1",
  },

  {
    id: "diagonal-2",
    cells: [
      2,
      4,
      6,
    ],
    className:
      "bingo-line--diagonal-2",
  },
];

/* --------------------------------------------------
   RANDOM HELPERS
-------------------------------------------------- */

function shuffle<T>(
  values: T[]
): T[] {
  const result = [
    ...values,
  ];

  for (
    let i =
      result.length - 1;
    i > 0;
    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      );

    [
      result[i],
      result[j],
    ] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

function sampleUnique(
  values: number[],
  count: number
): number[] {
  return shuffle(
    values
  ).slice(
    0,
    count
  );
}

/**
 * Uses every available number once
 * before allowing repeats.
 *
 * Bronze:
 * 9 cells from 6 values means exactly
 * three values will repeat.
 *
 * Silver:
 * 8 cells from 6 Pot 1 values means
 * two values will repeat.
 */
function sampleAllowRepeats(
  values: number[],
  count: number
): number[] {
  const result:
    number[] = [];

  while (
    result.length <
    count
  ) {
    const cycle =
      shuffle(
        values
      );

    for (
      const value
      of cycle
    ) {
      if (
        result.length >=
        count
      ) {
        break;
      }

      result.push(
        value
      );
    }
  }

  return result;
}

/* --------------------------------------------------
   CELL HELPERS
-------------------------------------------------- */

function getCellRole(
  index: number
): CellRole {
  if (
    index ===
    CENTER_INDEX
  ) {
    return "center";
  }

  if (
    CORNER_INDEXES.includes(
      index
    )
  ) {
    return "corner";
  }

  return "edge";
}

function createEmptyBoard():
  BingoCell[] {
  return ALL_INDEXES.map(
    (index) => ({
      id:
        `cell-${index}`,

      index,

      value:
        0,

      role:
        getCellRole(
          index
        ),

      requiredHits:
        1,
    })
  );
}

function assignValues(
  board: BingoCell[],
  indexes: number[],
  values: number[]
) {
  indexes.forEach(
    (
      index,
      position
    ) => {
      board[index] = {
        ...board[index],

        value:
          values[position],
      };
    }
  );
}

function requireTwoHits(
  board: BingoCell[],
  indexes: number[]
) {
  indexes.forEach(
    (index) => {
      board[index] = {
        ...board[index],

        requiredHits:
          2,
      };
    }
  );
}

/* --------------------------------------------------
   BOARD GENERATION
-------------------------------------------------- */

function buildBingoBoard(
  tier: Tier,
  level: number
): BingoCell[] {
  const board =
    createEmptyBoard();

  const highLevel =
    level >= 4;

  /* --------------------
     BRONZE
  -------------------- */

  if (
    tier === "Bronze"
  ) {
    const values =
      sampleAllowRepeats(
        POT_1,
        9
      );

    assignValues(
      board,
      ALL_INDEXES,
      values
    );

    /*
     * Bronze 4–5:
     * corners need two hits.
     */
    if (
      highLevel
    ) {
      requireTwoHits(
        board,
        CORNER_INDEXES
      );
    }

    return board;
  }

  /* --------------------
     SILVER
  -------------------- */

  if (
    tier === "Silver"
  ) {
    /*
     * Eight Pot 1 cells,
     * repeats allowed.
     */
    const surrounding =
      sampleAllowRepeats(
        POT_1,
        8
      );

    const surroundingIndexes =
      ALL_INDEXES.filter(
        (index) =>
          index !==
          CENTER_INDEX
      );

    assignValues(
      board,
      surroundingIndexes,
      surrounding
    );

    /*
     * Centre from Pot 2.
     */
    board[CENTER_INDEX] = {
      ...board[
        CENTER_INDEX
      ],

      value:
        sampleUnique(
          POT_2,
          1
        )[0],
    };

    /*
     * Silver 4–5:
     * corners + centre
     * require two hits.
     */
    if (
      highLevel
    ) {
      requireTwoHits(
        board,
        [
          ...CORNER_INDEXES,
          CENTER_INDEX,
        ]
      );
    }

    return board;
  }

  /* --------------------
     GOLD
  -------------------- */

  if (
    tier === "Gold"
  ) {
    /*
     * Corners = Pot 1
     */
    assignValues(
      board,
      CORNER_INDEXES,
      sampleUnique(
        POT_1,
        4
      )
    );

    /*
     * Edge-middle cells = Pot 2
     */
    assignValues(
      board,
      EDGE_INDEXES,
      sampleUnique(
        POT_2,
        4
      )
    );

    /*
     * Centre = Pot 3
     */
    board[CENTER_INDEX] = {
      ...board[
        CENTER_INDEX
      ],

      value:
        sampleUnique(
          POT_3,
          1
        )[0],
    };

    /*
     * Gold 4–5:
     * corners + centre
     * require two hits.
     */
    if (
      highLevel
    ) {
      requireTwoHits(
        board,
        [
          ...CORNER_INDEXES,
          CENTER_INDEX,
        ]
      );
    }

    return board;
  }

  /* --------------------
     PLATINUM
  -------------------- */

  if (
    tier ===
    "Platinum"
  ) {
    /*
     * Corners = Pot 2
     */
    assignValues(
      board,
      CORNER_INDEXES,
      sampleUnique(
        POT_2,
        4
      )
    );

    /*
     * Edge-middle cells = Pot 3
     */
    assignValues(
      board,
      EDGE_INDEXES,
      sampleUnique(
        POT_3,
        4
      )
    );

    /*
     * Platinum 1–3:
     * centre = random Pot 4.
     *
     * Platinum 4–5:
     * centre = fixed 180.
     */
    board[CENTER_INDEX] = {
      ...board[
        CENTER_INDEX
      ],

      value:
        highLevel
          ? 180
          : sampleUnique(
              POT_4,
              1
            )[0],
    };

    /*
     * Platinum 4–5:
     * corners need two hits.
     *
     * Centre stays one hit,
     * because it is already 180.
     */
    if (
      highLevel
    ) {
      requireTwoHits(
        board,
        CORNER_INDEXES
      );
    }

    return board;
  }

  /* --------------------
     DIAMOND 1–3
  -------------------- */

  if (
    !highLevel
  ) {
    /*
     * Corners = Pot 2
     */
    assignValues(
      board,
      CORNER_INDEXES,
      sampleUnique(
        POT_2,
        4
      )
    );

    /*
     * Edge-middle cells = Pot 3
     */
    assignValues(
      board,
      EDGE_INDEXES,
      sampleUnique(
        POT_3,
        4
      )
    );

    /*
     * Centre = Pot 4
     */
    board[CENTER_INDEX] = {
      ...board[
        CENTER_INDEX
      ],

      value:
        sampleUnique(
          POT_4,
          1
        )[0],
    };

    /*
     * Diamond 1–3:
     * corners require two hits.
     */
    requireTwoHits(
      board,
      CORNER_INDEXES
    );

    return board;
  }

  /* --------------------
     DIAMOND 4–5
  -------------------- */

  /*
   * Corners = Pot 3
   */
  assignValues(
    board,
    CORNER_INDEXES,
    sampleUnique(
      POT_3,
      4
    )
  );

  /*
   * Edge-middle cells = Pot 4,
   * but 180 is removed because
   * the centre is fixed to 180.
   */
  assignValues(
    board,
    EDGE_INDEXES,
    sampleUnique(
      POT_4_NO_180,
      4
    )
  );

  /*
   * Centre = fixed 180.
   */
  board[CENTER_INDEX] = {
    ...board[
      CENTER_INDEX
    ],

    value:
      180,
  };

  return board;
}

/* --------------------------------------------------
   COMPLETION HELPERS
-------------------------------------------------- */

function buildCounts(
  board: BingoCell[],
  actions: Action[]
): Map<string, number> {
  const counts =
    new Map<
      string,
      number
    >();

  board.forEach(
    (cell) => {
      counts.set(
        cell.id,
        0
      );
    }
  );

  actions.forEach(
    (action) => {
      if (
        action.type !==
        "HIT"
      ) {
        return;
      }

      counts.set(
        action.cellId,
        (
          counts.get(
            action.cellId
          ) ?? 0
        ) + 1
      );
    }
  );

  return counts;
}

function getCompletedCellIds(
  board: BingoCell[],
  counts: Map<
    string,
    number
  >
): Set<string> {
  const completed =
    new Set<string>();

  board.forEach(
    (cell) => {
      const have =
        counts.get(
          cell.id
        ) ?? 0;

      if (
        have >=
        cell.requiredHits
      ) {
        completed.add(
          cell.id
        );
      }
    }
  );

  return completed;
}

function getCompletedLines(
  board: BingoCell[],
  completedCellIds:
    Set<string>
): BingoLine[] {
  return BINGO_LINES.filter(
    (line) =>
      line.cells.every(
        (index) =>
          completedCellIds.has(
            board[index].id
          )
      )
  );
}

/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

export default function ScoringBingo({
  onFinish,
  disabled,
  tier,
  level,
  onDartsUsed,
  externalUndo,
}: Props) {
  const [
    actions,
    setActions,
  ] = useState<
    Action[]
  >([]);

  const [
    finished,
    setFinished,
  ] = useState(false);

  /*
   * Generated once for the current
   * tier + level.
   */
  const board =
    useMemo(
      () =>
        buildBingoBoard(
          tier,
          level
        ),
      [
        tier,
        level,
      ]
    );

  const countsByCell =
    useMemo(
      () =>
        buildCounts(
          board,
          actions
        ),
      [
        board,
        actions,
      ]
    );

  const completedCellIds =
    useMemo(
      () =>
        getCompletedCellIds(
          board,
          countsByCell
        ),
      [
        board,
        countsByCell,
      ]
    );

  const completedLines =
    useMemo(
      () =>
        getCompletedLines(
          board,
          completedCellIds
        ),
      [
        board,
        completedCellIds,
      ]
    );

  const completedLineIds =
    useMemo(
      () =>
        new Set(
          completedLines.map(
            (line) =>
              line.id
          )
        ),
      [
        completedLines,
      ]
    );

  const hitHistory =
    useMemo(
      () =>
        actions.filter(
          (action) =>
            action.type ===
            "HIT"
        ),
      [
        actions,
      ]
    );

  const visitsUsed =
    actions.length;

  const visitsLeft =
    MAX_VISITS -
    visitsUsed;

  const completedCount =
    completedCellIds.size;

  const missCount =
    useMemo(
      () =>
        actions.filter(
          (action) =>
            action.type ===
            "MISS"
        ).length,
      [
        actions,
      ]
    );

  const accuracy =
    useMemo(
      () => {
        if (
          visitsUsed === 0
        ) {
          return 0;
        }

        return Math.round(
          (
            hitHistory.length /
            visitsUsed
          ) * 100
        );
      },
      [
        visitsUsed,
        hitHistory.length,
      ]
    );

  const currentLineXp =
    completedLines.length *
      LINE_XP -
    (
      BINGO_LINES.length -
      completedLines.length
    ) *
      LINE_XP;

  /* --------------------------------------------------
     FINISH
  -------------------------------------------------- */

  function finishGame(
    win: boolean,
    finalActions: Action[]
  ) {
    if (
      finished
    ) {
      return;
    }

    setFinished(
      true
    );

    const finalCounts =
      buildCounts(
        board,
        finalActions
      );

    const finalCompletedCellIds =
      getCompletedCellIds(
        board,
        finalCounts
      );

    const finalCompletedLines =
      getCompletedLines(
        board,
        finalCompletedCellIds
      );

    const completedLineCount =
      finalCompletedLines.length;

    const incompleteLineCount =
      BINGO_LINES.length -
      completedLineCount;

    const lineXpRaw =
      completedLineCount *
        LINE_XP -
      incompleteLineCount *
        LINE_XP;

    const boardComplete =
      finalCompletedCellIds.size ===
      9;

    const boardEmpty =
      finalCompletedCellIds.size ===
      0;

    /*
     * Server should interpret this:
     *
     * full_win:
     *   use configured win XP.
     *
     * full_loss:
     *   use configured negative XP.
     *
     * bingo_lines:
     *   use line_xp_raw and cap the
     *   loss at the game's configured
     *   negative XP.
     */
    const xpMode =
      boardComplete
        ? "full_win"
        : boardEmpty
        ? "full_loss"
        : "bingo_lines";

    const finalHitCounts:
      Record<
        string,
        number
      > = {};

    board.forEach(
      (cell) => {
        finalHitCounts[
          cell.id
        ] =
          finalCounts.get(
            cell.id
          ) ?? 0;
      }
    );

    const finalMisses =
      finalActions.filter(
        (action) =>
          action.type ===
          "MISS"
      ).length;

    const payload = {
      game_key:
        "scoring_bingo",

      tier,
      level,

      win:
        boardComplete,

      visits_used:
        finalActions.length,

      max_visits:
        MAX_VISITS,

      /*
       * Compatibility with
       * generic result handling.
       *
       * One action = one visit.
       */
      throws_used:
        finalActions.length,

      max_throws:
        MAX_VISITS,

      darts_used:
        finalActions.length *
        3,

      board:
        board.map(
          (cell) => ({
            id:
              cell.id,

            index:
              cell.index,

            value:
              cell.value,

            role:
              cell.role,

            required_hits:
              cell.requiredHits,
          })
        ),

      targets:
        board.map(
          (cell) =>
            cell.value
        ),

      required_hits:
        Object.fromEntries(
          board.map(
            (cell) => [
              cell.id,
              cell.requiredHits,
            ]
          )
        ),

      hit_counts:
        finalHitCounts,

      misses:
        finalMisses,

      completed_cells:
        Array.from(
          finalCompletedCellIds
        ),

      completed_count:
        finalCompletedCellIds.size,

      completed_lines:
        finalCompletedLines.map(
          (line) =>
            line.id
        ),

      completed_line_count:
        completedLineCount,

      incomplete_line_count:
        incompleteLineCount,

      line_xp:
        LINE_XP,

      line_xp_raw:
        lineXpRaw,

      xp_mode:
        xpMode,

      board_complete:
        boardComplete,

      board_empty:
        boardEmpty,

      objective: {
        label:
          "Complete bingo",

        target:
          9,

        progress:
          Math.min(
            finalCompletedCellIds.size,
            9
          ),
      },

      stats: {
        completed_count:
          finalCompletedCellIds.size,

        completed_lines:
          completedLineCount,

        incomplete_lines:
          incompleteLineCount,

        line_xp_raw:
          lineXpRaw,

        misses:
          finalMisses,

        visits_used:
          finalActions.length,

        targets_total:
          9,

        accuracy:
          finalActions.length >
          0
            ? Math.round(
                (
                  finalActions.filter(
                    (action) =>
                      action.type ===
                      "HIT"
                  ).length /
                  finalActions.length
                ) * 100
              )
            : 0,
      },
    };

    onFinish({
      payload,
      win:
        boardComplete,
    });
  }

  /* --------------------------------------------------
     ACTIONS
  -------------------------------------------------- */

  function applyAction(
    action: Action
  ) {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      visitsUsed >=
      MAX_VISITS
    ) {
      return;
    }

    if (
      action.type ===
      "HIT"
    ) {
      const cell =
        board.find(
          (item) =>
            item.id ===
            action.cellId
        );

      if (
        !cell
      ) {
        return;
      }

      const have =
        countsByCell.get(
          cell.id
        ) ?? 0;

      if (
        have >=
        cell.requiredHits
      ) {
        return;
      }
    }

    /*
     * One action represents
     * one 3-dart visit.
     */
    onDartsUsed?.(
      3
    );

    const newActions = [
      ...actions,
      action,
    ];

    setActions(
      newActions
    );

    const nextCounts =
      buildCounts(
        board,
        newActions
      );

    const nextCompleted =
      getCompletedCellIds(
        board,
        nextCounts
      );

    const newVisitsUsed =
      newActions.length;

    if (
      nextCompleted.size ===
      9
    ) {
      finishGame(
        true,
        newActions
      );

      return;
    }

    if (
      newVisitsUsed >=
      MAX_VISITS
    ) {
      finishGame(
        false,
        newActions
      );
    }
  }

  function handleHit(
    cellId: string
  ) {
    applyAction({
      type:
        "HIT",

      cellId,
    });
  }

  function handleMiss() {
    applyAction({
      type:
        "MISS",
    });
  }

  /* --------------------------------------------------
     UNDO
  -------------------------------------------------- */

  function handleUndo() {
    if (
      disabled ||
      finished
    ) {
      return;
    }

    if (
      actions.length ===
      0
    ) {
      return;
    }

    setActions(
      (
        current
      ) =>
        current.slice(
          0,
          -1
        )
    );
  }

  React.useEffect(
    () => {
      if (
        !externalUndo ||
        externalUndo.steps <=
          0
      ) {
        return;
      }

      const timeout =
        window.setTimeout(
          () => {
            setActions(
              (
                current
              ) => {
                const steps =
                  Math.min(
                    externalUndo.steps,
                    current.length
                  );

                return current.slice(
                  0,
                  current.length -
                    steps
                );
              }
            );
          },
          0
        );

      return () =>
        window.clearTimeout(
          timeout
        );
    },
    [
      externalUndo?.token,
      externalUndo?.steps,
    ]
  );

  const canPress =
    !disabled &&
    !finished &&
    visitsUsed <
      MAX_VISITS;

  const canUndo =
    !disabled &&
    !finished &&
    actions.length >
      0;

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="bullout">
      {/* Header */}
      <div className="bullout-header game-objective-sticky">
        <div>
          <div className="muted">
            Scoring Bingo ·{" "}
            {MAX_VISITS} visits
          </div>

          <div
            className="small muted"
            style={{
              marginTop: 3,
            }}
          >
            Complete all 9 targets
          </div>
        </div>

        <div className="objective-pill">
          <div className="objective-label">
            OBJECTIVE
          </div>

          <div className="objective-value">
            Complete bingo
          </div>
        </div>
      </div>

      {/* XP info */}
      <div
        className="bingo-xp-info"
        title="Each completed row, column or diagonal earns 10 XP. Each incomplete row, column or diagonal loses 10 XP. Completing the full card awards the game's full configured XP."
        tabIndex={0}
        role="note"
      >
        <span>
          ±10 XP per row,
          column or diagonal
        </span>

        <span
          className="bingo-xp-info__icon"
          aria-hidden="true"
        >
          ⓘ
        </span>
      </div>

      {/* Bingo card */}
      <div
        className="card"
        style={{
          marginTop: 12,
        }}
      >
        <div className="bingo-board-wrap">
          <div className="bingo-card">
            {board.map(
              (cell) => {
                const have =
                  countsByCell.get(
                    cell.id
                  ) ?? 0;

                const done =
                  have >=
                  cell.requiredHits;

                const partial =
                  cell.requiredHits ===
                    2 &&
                  have === 1;

                return (
                  <button
                    key={
                      cell.id
                    }
                    type="button"
                    className={[
                      "bingo-cell",

                      done
                        ? "bingo-cell--done"
                        : "",

                      partial
                        ? "bingo-cell--partial"
                        : "",
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " "
                      )}
                    onClick={() =>
                      handleHit(
                        cell.id
                      )
                    }
                    disabled={
                      !canPress ||
                      done
                    }
                  >
                    <span className="bingo-cell__score">
                      {
                        cell.value
                      }
                    </span>

                    {cell.requiredHits ===
                      2 && (
                      <span className="bingo-cell__hits">
                        {have}/2
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>

          {/* Completed bingo lines */}
          <svg
            className="bingo-lines-svg"
            viewBox="0 0 300 300"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {completedLineIds.has(
              "row-1"
            ) && (
              <line
                x1="5"
                y1="50"
                x2="295"
                y2="50"
                className="bingo-svg-line"
              />
            )}

            {completedLineIds.has(
              "row-2"
            ) && (
              <line
                x1="5"
                y1="150"
                x2="295"
                y2="150"
                className="bingo-svg-line"
              />
            )}

            {completedLineIds.has(
              "row-3"
            ) && (
              <line
                x1="5"
                y1="250"
                x2="295"
                y2="250"
                className="bingo-svg-line"
              />
            )}

            {completedLineIds.has(
              "column-1"
            ) && (
              <line
                x1="50"
                y1="5"
                x2="50"
                y2="295"
                className="bingo-svg-line"
              />
            )}

            {completedLineIds.has(
              "column-2"
            ) && (
              <line
                x1="150"
                y1="5"
                x2="150"
                y2="295"
                className="bingo-svg-line"
              />
            )}

            {completedLineIds.has(
              "column-3"
            ) && (
              <line
                x1="250"
                y1="5"
                x2="250"
                y2="295"
                className="bingo-svg-line"
              />
            )}

            {completedLineIds.has(
              "diagonal-1"
            ) && (
              <line
                x1="50"
                y1="50"
                x2="250"
                y2="250"
                className="bingo-svg-line"
              />
            )}

            {completedLineIds.has(
              "diagonal-2"
            ) && (
              <line
                x1="250"
                y1="50"
                x2="50"
                y2="250"
                className="bingo-svg-line"
              />
            )}
          </svg>
        </div>

        <div className="bingo-card-footer">
          <span>
            Lines completed:{" "}
            <strong>
              {
                completedLines.length
              }
              /8
            </strong>
          </span>

          <span>
            Current line XP:{" "}
            <strong>
              {currentLineXp >
              0
                ? "+"
                : ""}
              {
                currentLineXp
              }
            </strong>
          </span>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          marginTop: 14,
        }}
        data-hotkeys="drill"
      >
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",

            gap: 10,
          }}
        >
          <button
            className="btn secondary"
            disabled={
              !canPress
            }
            onClick={
              handleMiss
            }
          >
            Miss
          </button>

          <button
            className="btn outline"
            disabled={
              !canUndo
            }
            onClick={
              handleUndo
            }
            data-hotkey="0"
          >
            Undo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        className="bullout-stats card"
        style={{
          marginTop: 14,
        }}
      >
        <div
          className="row"
          style={{
            justifyContent:
              "space-around",
          }}
        >
          <div>
            <div className="small muted">
              Visits left
            </div>

            <div className="title-lg">
              {
                visitsLeft
              }
            </div>
          </div>

          <div>
            <div className="small muted">
              Completed
            </div>

            <div className="title-lg">
              {
                completedCount
              }
              /9
            </div>
          </div>

          <div>
            <div className="small muted">
              Lines
            </div>

            <div className="title-lg">
              {
                completedLines.length
              }
              /8
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
                Hits
              </div>

              <div className="pill-value">
                {
                  hitHistory.length
                }
              </div>
            </div>

            <div className="pill pill-stat">
              <div className="pill-label">
                Misses
              </div>

              <div className="pill-value">
                {
                  missCount
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}