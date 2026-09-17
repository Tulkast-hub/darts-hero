import type { AssessmentResults } from "./useAssessmentStore";

export type AssessmentRawMetrics = {
  doublesPercentage: number;
  scoringAverage: number;
  overallAverage: number;
  consistencyScore: number;
  setupEfficiency: number;
  finishingEfficiency: number;
};

export type AssessmentSkillScores = {
  doubles: number;
  scoring: number;
  setup: number;
  finishing: number;
  overallAverage: number;
  consistency: number;
};

export type AssessmentLevelBand =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond";

export type AssessmentEquivalentLevel = {
  band: AssessmentLevelBand;
  level: number;
};

type CalibrationPoint = {
  raw: number;
  score: number;
};

/*
 * --------------------------------------------------
 * CALIBRATION CURVES
 * --------------------------------------------------
 */

const OVERALL_AVERAGE_CURVE: CalibrationPoint[] = [
  { raw: 20, score: 0 },
  { raw: 30, score: 5 },
  { raw: 35, score: 10 },
  { raw: 40, score: 20 },
  { raw: 45, score: 27 },
  { raw: 50, score: 33 },
  { raw: 55, score: 40 },
  { raw: 60, score: 47 },
  { raw: 65, score: 53 },
  { raw: 70, score: 60 },
  { raw: 75, score: 66 },
  { raw: 80, score: 72 },
  { raw: 85, score: 80 },
  { raw: 90, score: 90 },
  { raw: 95, score: 100 },
];

const SCORING_CURVE: CalibrationPoint[] = [
  { raw: 25, score: 0 },
  { raw: 35, score: 10 },
  { raw: 40, score: 20 },
  { raw: 50, score: 32 },
  { raw: 55, score: 40 },
  { raw: 65, score: 52 },
  { raw: 70, score: 60 },
  { raw: 75, score: 66 },
  { raw: 80, score: 72 },
  { raw: 85, score: 78 },
  { raw: 90, score: 84 },
  { raw: 100, score: 92 },
  { raw: 110, score: 97 },
  { raw: 120, score: 100 },
];

const DOUBLES_CURVE: CalibrationPoint[] = [
  { raw: 5, score: 0 },
  { raw: 10, score: 10 },
  { raw: 15, score: 20 },
  { raw: 20, score: 35 },
  { raw: 25, score: 47 },
  { raw: 30, score: 58 },
  { raw: 35, score: 68 },
  { raw: 40, score: 78 },
  { raw: 45, score: 88 },
  { raw: 50, score: 95 },
  { raw: 60, score: 100 },
];

const SETUP_CURVE: CalibrationPoint[] = [
  { raw: 20, score: 0 },
  { raw: 35, score: 10 },
  { raw: 45, score: 20 },
  { raw: 55, score: 32 },
  { raw: 65, score: 45 },
  { raw: 75, score: 58 },
  { raw: 82, score: 68 },
  { raw: 88, score: 76 },
  { raw: 92, score: 84 },
  { raw: 96, score: 92 },
  { raw: 100, score: 100 },
];

/*
 * Finishing efficiency is already produced as
 * a normalized 0–100 skill-like value from:
 *
 * 65% finishing opportunity performance
 * 35% double efficiency
 *
 * So we do not apply a second harsh curve.
 */
const FINISHING_CURVE: CalibrationPoint[] = [
  { raw: 0, score: 0 },
  { raw: 20, score: 20 },
  { raw: 40, score: 40 },
  { raw: 60, score: 60 },
  { raw: 80, score: 80 },
  { raw: 100, score: 100 },
];

/*
 * Checkout opportunity average.
 *
 * Successful higher checkouts help, but they
 * aren't required to achieve a strong score.
 *
 * Because failed opportunities contribute 0,
 * even an average of 30–40 is already strong.
 */
const FINISHING_OPPORTUNITY_CURVE: CalibrationPoint[] = [
  { raw: 0, score: 0 },
  { raw: 10, score: 20 },
  { raw: 15, score: 30 },
  { raw: 20, score: 40 },
  { raw: 25, score: 50 },
  { raw: 30, score: 60 },
  { raw: 35, score: 68 },
  { raw: 40, score: 75 },
  { raw: 50, score: 84 },
  { raw: 60, score: 90 },
  { raw: 70, score: 95 },
  { raw: 80, score: 98 },
  { raw: 100, score: 100 },
];

/*
 * Consistency:
 *
 * Very high consistency should genuinely require
 * very strong repeatability.
 *
 * Around 90 raw is required to enter Diamond.
 */
const CONSISTENCY_CURVE: CalibrationPoint[] = [
  { raw: 0, score: 0 },
  { raw: 40, score: 5 },
  { raw: 50, score: 12 },
  { raw: 60, score: 25 },
  { raw: 70, score: 40 },
  { raw: 75, score: 50 },
  { raw: 80, score: 60 },
  { raw: 85, score: 70 },
  { raw: 90, score: 80 },
  { raw: 95, score: 90 },
  { raw: 100, score: 100 },
];

/*
 * Score one visit relative to the player's
 * own scoring baseline.
 *
 * Scores above baseline never hurt consistency.
 */
const CONSISTENCY_VISIT_CURVE: CalibrationPoint[] = [
  { raw: 0, score: 0 },
  { raw: 30, score: 5 },
  { raw: 40, score: 25 },
  { raw: 50, score: 45 },
  { raw: 60, score: 70 },
  { raw: 70, score: 88 },
  { raw: 75, score: 94 },
  { raw: 85, score: 98 },
  { raw: 100, score: 100 },
];

/*
 * Extra penalty for repeated genuinely poor visits.
 *
 * Poor = below 60% of the player's baseline.
 */
const CONSISTENCY_LOW_VISIT_MULTIPLIER_CURVE: CalibrationPoint[] = [
  { raw: 0, score: 100 },
  { raw: 10, score: 98 },
  { raw: 20, score: 94 },
  { raw: 30, score: 88 },
  { raw: 40, score: 80 },
  { raw: 50, score: 70 },
  { raw: 60, score: 58 },
  { raw: 70, score: 45 },
  { raw: 100, score: 30 },
];

export function calculateAssessmentMetrics(
  results: AssessmentResults
): AssessmentRawMetrics {
  const doublesPercentage =
    calculateDoublesPercentage(results);

  const dedicatedScoringVisits =
    results.scoring?.visits ?? [];

  const game501ScoringVisits =
    get501ScoringVisits(results);

  const scoringAverage =
    calculateCombinedScoringAverage(
      dedicatedScoringVisits,
      game501ScoringVisits
    );

  const overallAverage =
    results.game501?.threeDartAverage ?? 0;

  const consistencyVisits = [
    ...dedicatedScoringVisits,
    ...game501ScoringVisits,
  ];

  /*
   * Consistency baseline should represent
   * the player's actual average scoring visit.
   *
   * This is deliberately separate from the
   * 50/50 weighting used by the Scoring metric.
   */
  const consistencyBaseline =
    calculateAverage(
      consistencyVisits
    );

  const consistencyScore =
    calculateConsistency(
      consistencyVisits,
      consistencyBaseline
    );

  const setupEfficiency =
    calculateSetupEfficiency(results);

  const finishingEfficiency =
    calculateFinishingEfficiency(results);

  return {
    doublesPercentage,
    scoringAverage,
    overallAverage,
    consistencyScore,
    setupEfficiency,
    finishingEfficiency,
  };
}

/*
 * --------------------------------------------------
 * NORMALIZED SKILL SCORES
 * --------------------------------------------------
 */

export function calculateAssessmentSkillScores(
  metrics: AssessmentRawMetrics
): AssessmentSkillScores {
  return {
    doubles: normalizeFromCurve(
      metrics.doublesPercentage,
      DOUBLES_CURVE
    ),

    scoring: normalizeFromCurve(
      metrics.scoringAverage,
      SCORING_CURVE
    ),

    setup: normalizeFromCurve(
      metrics.setupEfficiency,
      SETUP_CURVE
    ),

    finishing: normalizeFromCurve(
      metrics.finishingEfficiency,
      FINISHING_CURVE
    ),

    overallAverage: normalizeFromCurve(
      metrics.overallAverage,
      OVERALL_AVERAGE_CURVE
    ),

    consistency: normalizeFromCurve(
      metrics.consistencyScore,
      CONSISTENCY_CURVE
    ),
  };
}

/*
 * All six categories remain equally weighted.
 */
export function calculateOverallSkillScore(
  scores: AssessmentSkillScores
): number {
  const values = [
    scores.doubles,
    scores.scoring,
    scores.setup,
    scores.finishing,
    scores.overallAverage,
    scores.consistency,
  ];

  return round1(
    calculateAverage(values)
  );
}

/*
 * --------------------------------------------------
 * RANK MAPPING
 * --------------------------------------------------
 */

export function getEquivalentLevel(
  score: number
): AssessmentEquivalentLevel {
  const value = clamp(
    score,
    0,
    100
  );

  const bands: AssessmentLevelBand[] = [
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
  ];

  if (value >= 100) {
    return {
      band: "Diamond",
      level: 5,
    };
  }

  const bandIndex =
    Math.floor(value / 20);

  const safeBandIndex =
    Math.min(
      bandIndex,
      bands.length - 1
    );

  const band =
    bands[safeBandIndex];

  const positionInBand =
    value -
    safeBandIndex * 20;

  const level =
    Math.min(
      5,
      Math.floor(
        positionInBand / 4
      ) + 1
    );

  return {
    band,
    level,
  };
}

/*
 * --------------------------------------------------
 * DOUBLES
 * --------------------------------------------------
 */

function calculateDoublesPercentage(
  results: AssessmentResults
): number {
  let attempts = 0;
  let hits = 0;

  if (results.doubles) {
    attempts +=
      results.doubles.dartsThrown;

    hits +=
      results.doubles.doublesHit;
  }

  if (results.checkout101) {
    for (
      const leg of
      results.checkout101.legs
    ) {
      attempts +=
        leg.doubleDarts;

      hits += 1;
    }
  }

  if (results.finish170) {
    for (
      const attempt of
      results.finish170.attempts
    ) {
      attempts +=
        attempt.doubleDarts;

      hits += 1;
    }
  }

  if (results.game501) {
    for (
      const leg of
      results.game501.legs
    ) {
      attempts +=
        leg.doubleDarts;

      hits += 1;
    }
  }

  if (attempts <= 0) {
    return 0;
  }

  return round1(
    (hits / attempts) * 100
  );
}

/*
 * --------------------------------------------------
 * SCORING
 * --------------------------------------------------
 */

function get501ScoringVisits(
  results: AssessmentResults
): number[] {
  if (!results.game501) {
    return [];
  }

  const scoringVisits: number[] = [];

  for (
    const leg of
    results.game501.legs
  ) {
    let remainder = 501;

    for (
      const score of
      leg.visitScores
    ) {
      const remainderBefore =
        remainder;

      if (
        remainderBefore > 200
      ) {
        scoringVisits.push(
          score
        );
      }

      remainder -= score;
    }
  }

  return scoringVisits;
}

function calculateCombinedScoringAverage(
  dedicatedVisits: number[],
  game501Visits: number[]
): number {
  const dedicatedAverage =
    calculateAverage(
      dedicatedVisits
    );

  const game501Average =
    calculateAverage(
      game501Visits
    );

  if (
    dedicatedVisits.length > 0 &&
    game501Visits.length > 0
  ) {
    return round2(
      (
        dedicatedAverage +
        game501Average
      ) / 2
    );
  }

  if (
    dedicatedVisits.length > 0
  ) {
    return round2(
      dedicatedAverage
    );
  }

  if (
    game501Visits.length > 0
  ) {
    return round2(
      game501Average
    );
  }

  return 0;
}

/*
 * --------------------------------------------------
 * CONSISTENCY
 * --------------------------------------------------
 */

function calculateConsistency(
  values: number[],
  scoringBaseline: number
): number {
  if (
    values.length < 2 ||
    scoringBaseline <= 0
  ) {
    return 0;
  }

  const visitConsistencyScores =
    values.map((value) => {
      const ratioPercentage =
        (
          value /
          scoringBaseline
        ) * 100;

      /*
       * Scores above the player's expected
       * scoring level never hurt consistency.
       */
      if (
        ratioPercentage >= 100
      ) {
        return 100;
      }

      return normalizeFromCurve(
        ratioPercentage,
        CONSISTENCY_VISIT_CURVE
      );
    });

  const baseConsistency =
    calculateAverage(
      visitConsistencyScores
    );

  /*
   * Visits under 60% of baseline are considered
   * genuinely poor visits.
   */
  const lowVisitThreshold =
    scoringBaseline * 0.6;

  const lowVisitCount =
    values.filter(
      (value) =>
        value <
        lowVisitThreshold
    ).length;

  const lowVisitPercentage =
    (
      lowVisitCount /
      values.length
    ) * 100;

  const multiplierPercentage =
    normalizeFromCurve(
      lowVisitPercentage,
      CONSISTENCY_LOW_VISIT_MULTIPLIER_CURVE
    );

  const lowVisitMultiplier =
    multiplierPercentage /
    100;

  return round1(
    clamp(
      baseConsistency *
        lowVisitMultiplier,
      0,
      100
    )
  );
}

/*
 * --------------------------------------------------
 * SETUP PLAY
 * --------------------------------------------------
 */

function calculateSetupEfficiency(
  results: AssessmentResults
): number {
  const setupScores: number[] =
    [];

  if (results.finish170) {
    for (
      const attempt of
      results.finish170.attempts
    ) {
      let remainder = 170;

      for (
        const score of
        attempt.visitScores
      ) {
        const remainderBefore =
          remainder;

        const remainderAfter =
          remainderBefore -
          score;

        if (
          remainderBefore > 50 &&
          remainderBefore <= 170
        ) {
          setupScores.push(
            scoreSetupVisit(
              remainderBefore,
              remainderAfter
            )
          );
        }

        remainder =
          remainderAfter;
      }
    }
  }

  if (results.game501) {
    for (
      const leg of
      results.game501.legs
    ) {
      let remainder = 501;

      for (
        const score of
        leg.visitScores
      ) {
        const remainderBefore =
          remainder;

        const remainderAfter =
          remainderBefore -
          score;

        if (
          remainderBefore < 200 &&
          remainderBefore > 50
        ) {
          setupScores.push(
            scoreSetupVisit(
              remainderBefore,
              remainderAfter
            )
          );
        }

        remainder =
          remainderAfter;
      }
    }
  }

  if (!setupScores.length) {
    return 0;
  }

  return round1(
    calculateAverage(
      setupScores
    )
  );
}

function scoreSetupVisit(
  remainderBefore: number,
  remainderAfter: number
): number {
  if (
    remainderAfter <= 0
  ) {
    return 100;
  }

  if (
    remainderAfter <= 50
  ) {
    return 100;
  }

  if (
    isLegalCheckout(
      remainderAfter
    )
  ) {
    const progress =
      remainderBefore -
      remainderAfter;

    const availableProgress =
      Math.max(
        1,
        remainderBefore - 50
      );

    const progressRatio =
      progress /
      availableProgress;

    return clamp(
      65 +
        progressRatio * 35,
      65,
      100
    );
  }

  if (
    remainderAfter <= 170
  ) {
    const progress =
      remainderBefore -
      remainderAfter;

    const availableProgress =
      Math.max(
        1,
        remainderBefore - 50
      );

    const progressRatio =
      progress /
      availableProgress;

    return clamp(
      45 +
        progressRatio * 30,
      45,
      75
    );
  }

  const progress =
    remainderBefore -
    remainderAfter;

  const progressRatio =
    progress /
    Math.max(
      1,
      remainderBefore
    );

  return clamp(
    progressRatio * 60,
    0,
    60
  );
}

function isLegalCheckout(
  score: number
): boolean {
  if (
    score <= 1 ||
    score > 170
  ) {
    return false;
  }

  const bogeyNumbers =
    new Set([
      169,
      168,
      166,
      165,
      163,
      162,
      159,
    ]);

  return !bogeyNumbers.has(
    score
  );
}

/*
 * --------------------------------------------------
 * FINISHING
 * --------------------------------------------------
 *
 * Finishing now measures two distinct things:
 *
 * 65% - how well the player converts genuine
 *       finishing opportunities
 *
 * 35% - how efficiently the player throws at
 *       doubles
 *
 * Setup speed and whole-leg speed are deliberately
 * excluded. Those belong to Setup / Scoring /
 * Overall Average instead.
 */

function calculateFinishingEfficiency(
  results: AssessmentResults
): number {
  /*
   * -----------------------------------------------
   * 1. DOUBLE EFFICIENCY
   * -----------------------------------------------
   *
   * This uses 101, 170 and 501.
   */

  let totalDoubleAttempts = 0;
  let successfulDoubles = 0;

  if (results.checkout101) {
    for (
      const leg of
      results.checkout101.legs
    ) {
      totalDoubleAttempts +=
        leg.doubleDarts;

      successfulDoubles += 1;
    }
  }

  if (results.finish170) {
    for (
      const attempt of
      results.finish170.attempts
    ) {
      totalDoubleAttempts +=
        attempt.doubleDarts;

      successfulDoubles += 1;
    }
  }

  if (results.game501) {
    for (
      const leg of
      results.game501.legs
    ) {
      totalDoubleAttempts +=
        leg.doubleDarts;

      successfulDoubles += 1;
    }
  }

  const rawDoublePercentage =
    totalDoubleAttempts > 0
      ? (
          successfulDoubles /
          totalDoubleAttempts
        ) * 100
      : 0;

  /*
   * Use the same real-world doubles calibration
   * as the Doubles category.
   *
   * It is only 35% of Finishing, so Finishing
   * does not simply duplicate the Doubles metric.
   */
  const doubleEfficiencyScore =
    normalizeFromCurve(
      rawDoublePercentage,
      DOUBLES_CURVE
    );

  /*
   * -----------------------------------------------
   * 2. FINISHING OPPORTUNITIES
   * -----------------------------------------------
   *
   * Each qualifying opportunity contributes:
   *
   * successful checkout -> adjusted checkout value
   * failed opportunity  -> 0
   *
   * Mandatory opportunity:
   * remainder before visit is 2–40.
   *
   * Successful higher checkout:
   * always counts.
   *
   * Current storage limitation:
   * failed higher checkouts cannot yet be identified
   * reliably because per-visit double attempts are
   * not stored.
   */

  const opportunityValues: number[] =
    [];

  /*
   * 170 Finish has visit-by-visit scoring data.
   */
  if (results.finish170) {
    for (
      const attempt of
      results.finish170.attempts
    ) {
      collectFinishingOpportunities(
        START_170_SCORE,
        attempt.visitScores,
        opportunityValues
      );
    }
  }

  /*
   * 501 also has visit-by-visit scoring data.
   */
  if (results.game501) {
    for (
      const leg of
      results.game501.legs
    ) {
      collectFinishingOpportunities(
        START_501_SCORE,
        leg.visitScores,
        opportunityValues
      );
    }
  }

  const opportunityAverage =
    calculateAverage(
      opportunityValues
    );

  const opportunityScore =
    normalizeFromCurve(
      opportunityAverage,
      FINISHING_OPPORTUNITY_CURVE
    );

  /*
   * If for some reason there are no reconstructable
   * finishing opportunities, use only double
   * efficiency rather than artificially assigning
   * a zero to 65% of the metric.
   */
  if (
    opportunityValues.length === 0
  ) {
    return round1(
      doubleEfficiencyScore
    );
  }

  return round1(
    clamp(
      opportunityScore * 0.65 +
        doubleEfficiencyScore * 0.35,
      0,
      100
    )
  );
}

const START_170_SCORE = 170;
const START_501_SCORE = 501;

function collectFinishingOpportunities(
  startScore: number,
  visitScores: number[],
  opportunities: number[]
) {
  let remainder =
    startScore;

  for (
    const score of
    visitScores
  ) {
    const remainderBefore =
      remainder;

    const remainderAfter =
      remainderBefore -
      score;

    const checkoutCompleted =
      remainderAfter <= 0;

    /*
     * Successful checkout from any value counts.
     */
    if (
      checkoutCompleted
    ) {
      opportunities.push(
        adjustedCheckoutValue(
          remainderBefore
        )
      );

      remainder =
        remainderAfter;

      continue;
    }

    /*
     * Once the player begins a visit with
     * 2–40 remaining, they should be expected
     * to create a dart at double.
     *
     * Failure to finish therefore counts as 0,
     * even if no actual double dart was recorded.
     *
     * Example:
     *
     * 39 left
     * visit scores 39 without finishing correctly,
     * or produces another non-checkout visit
     *
     * -> finishing opportunity = 0
     */
    if (
      remainderBefore >= 2 &&
      remainderBefore <= 40
    ) {
      opportunities.push(0);
    }

    /*
     * Busts are currently stored as score 0,
     * which correctly leaves the remainder
     * unchanged here.
     */
    remainder =
      remainderAfter;
  }
}

/*
 * High checkouts receive extra credit,
 * but with diminishing returns.
 *
 * 20  -> 20
 * 40  -> 40
 * 60  -> 50
 * 80  -> 60
 * 100 -> 70
 * 120 -> 80
 * 160 -> 100
 */
function adjustedCheckoutValue(
  checkout: number
): number {
  if (
    checkout <= 0
  ) {
    return 0;
  }

  if (
    checkout <= 40
  ) {
    return checkout;
  }

  return clamp(
    40 +
      (
        checkout - 40
      ) * 0.5,
    0,
    100
  );
}

/*
 * --------------------------------------------------
 * CALIBRATION
 * --------------------------------------------------
 */

function normalizeFromCurve(
  value: number,
  points: CalibrationPoint[]
): number {
  if (!points.length) {
    return 0;
  }

  const first =
    points[0];

  const last =
    points[
      points.length - 1
    ];

  if (
    value <= first.raw
  ) {
    return round1(
      first.score
    );
  }

  if (
    value >= last.raw
  ) {
    return round1(
      last.score
    );
  }

  for (
    let index = 0;
    index <
    points.length - 1;
    index++
  ) {
    const start =
      points[index];

    const end =
      points[index + 1];

    if (
      value >= start.raw &&
      value <= end.raw
    ) {
      const progress =
        (
          value -
          start.raw
        ) /
        (
          end.raw -
          start.raw
        );

      const normalized =
        start.score +
        progress *
          (
            end.score -
            start.score
          );

      return round1(
        clamp(
          normalized,
          0,
          100
        )
      );
    }
  }

  return 0;
}

/*
 * --------------------------------------------------
 * GENERIC HELPERS
 * --------------------------------------------------
 */

function calculateAverage(
  values: number[]
): number {
  if (!values.length) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}

function round1(
  value: number
): number {
  return Number(
    value.toFixed(1)
  );
}

function round2(
  value: number
): number {
  return Number(
    value.toFixed(2)
  );
}