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
 *
 * These curves deliberately become harder
 * at the upper end.
 *
 * The goal is that the normalized 0–100 score
 * roughly represents equivalent real-world
 * 501 ability:
 *
 * 0–19   Bronze
 * 20–39  Silver
 * 40–59  Gold
 * 60–79  Platinum
 * 80–100 Diamond
 */

/*
 * 501 three-dart average.
 *
 * Approximate reference:
 *
 * 40 avg -> Silver 1
 * 55 avg -> Gold 1
 * 70 avg -> Platinum 1
 * 79 avg -> around Platinum 3
 * 85 avg -> Diamond 1
 * 95 avg -> Diamond 5
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

/*
 * Combined scoring average.
 *
 * Scoring drill + pure scoring phase from 501.
 *
 * This is intentionally a little more demanding
 * than a simple linear mapping because sustained
 * 80+ scoring is already strong club-level darts.
 */
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

/*
 * Doubles percentage.
 *
 * 20% is respectable lower-level conversion.
 * 30% is strong.
 * 40%+ is very strong.
 * 50% is intentionally close to the top.
 */
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

/*
 * Setup Play is already produced as a 0–100
 * raw efficiency metric, but we don't want a
 * raw 80 to automatically mean Diamond.
 *
 * High setup scores should become progressively
 * harder to convert into the top ranks.
 */
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
 * Finishing is also already 0–100 raw.
 *
 * It is calibrated separately so average finishing
 * performance does not become a high rank too easily.
 */
const FINISHING_CURVE: CalibrationPoint[] = [
  { raw: 15, score: 0 },
  { raw: 25, score: 10 },
  { raw: 35, score: 20 },
  { raw: 45, score: 32 },
  { raw: 55, score: 44 },
  { raw: 65, score: 57 },
  { raw: 75, score: 68 },
  { raw: 82, score: 76 },
  { raw: 88, score: 84 },
  { raw: 94, score: 92 },
  { raw: 100, score: 100 },
];

/*
 * Consistency is already a 0–100 raw score.
 *
 * Very high consistency should be difficult,
 * especially because perfect stability is not
 * realistic over many real scoring visits.
 */
const CONSISTENCY_CURVE: CalibrationPoint[] = [
  { raw: 20, score: 0 },
  { raw: 35, score: 10 },
  { raw: 45, score: 20 },
  { raw: 55, score: 32 },
  { raw: 65, score: 44 },
  { raw: 72, score: 55 },
  { raw: 78, score: 64 },
  { raw: 84, score: 72 },
  { raw: 89, score: 80 },
  { raw: 94, score: 90 },
  { raw: 100, score: 100 },
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

  const consistencyScore =
    calculateConsistency(
      consistencyVisits
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

  /*
   * Each inner level spans 4 points.
   *
   * Example:
   *
   * 20–23.99 -> Silver 1
   * 24–27.99 -> Silver 2
   * 40–43.99 -> Gold 1
   */
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

  /*
   * Around the World Doubles.
   */
  if (results.doubles) {
    attempts +=
      results.doubles.dartsThrown;

    hits +=
      results.doubles.doublesHit;
  }

  /*
   * 101 Double Out.
   *
   * Each completed leg contains one
   * successful final double.
   */
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

  /*
   * 170 Finish.
   */
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

  /*
   * 501.
   */
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

      /*
       * Treat >200 as the pure scoring phase.
       */
      if (
        remainderBefore > 200
      ) {
        scoringVisits.push(score);
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

  /*
   * Equal weighting between:
   *
   * - dedicated scoring test
   * - 501 scoring phase
   */
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
  values: number[]
): number {
  if (values.length < 2) {
    return 0;
  }

  const mean =
    calculateAverage(values);

  if (mean <= 0) {
    return 0;
  }

  /*
   * Stability around the player's own average.
   */
  const averageDeviation =
    values.reduce(
      (sum, value) =>
        sum +
        Math.abs(
          value - mean
        ),
      0
    ) / values.length;

  const relativeDeviation =
    averageDeviation / mean;

  const stabilityScore =
    clamp(
      100 -
        relativeDeviation *
          200,
      0,
      100
    );

  /*
   * Additional penalty for very low
   * visits relative to the player's average.
   */
  const lowOutlierThreshold =
    mean * 0.55;

  let lowOutlierSeverity = 0;

  for (
    const value of values
  ) {
    if (
      value >=
      lowOutlierThreshold
    ) {
      continue;
    }

    const severity =
      (
        lowOutlierThreshold -
        value
      ) /
      lowOutlierThreshold;

    lowOutlierSeverity +=
      clamp(
        severity,
        0,
        1
      );
  }

  const averageOutlierSeverity =
    lowOutlierSeverity /
    values.length;

  const outlierScore =
    clamp(
      100 -
        averageOutlierSeverity *
          250,
      0,
      100
    );

  return round1(
    stabilityScore * 0.7 +
      outlierScore * 0.3
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

  /*
   * 170 Finish.
   */
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

  /*
   * 501 setup phase.
   */
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
  /*
   * Completed checkout.
   */
  if (
    remainderAfter <= 0
  ) {
    return 100;
  }

  /*
   * Reached a simple finishing position.
   *
   * We deliberately don't care which
   * double the player leaves.
   */
  if (
    remainderAfter <= 50
  ) {
    return 100;
  }

  /*
   * Reached a legal three-dart checkout.
   */
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

  /*
   * Reached <=170 but left a bogey number.
   */
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

  /*
   * Still outside checkout range.
   */
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
 */

function calculateFinishingEfficiency(
  results: AssessmentResults
): number {
  let totalDoubleAttempts = 0;
  let successfulDoubles = 0;

  let checkoutDoubleAttempts = 0;
  let checkoutSuccesses = 0;

  const finishingDarts: number[] =
    [];

  /*
   * 101 Double Out.
   */
  if (results.checkout101) {
    for (
      const leg of
      results.checkout101.legs
    ) {
      totalDoubleAttempts +=
        leg.doubleDarts;

      successfulDoubles += 1;

      checkoutDoubleAttempts +=
        leg.checkoutDoubleDarts;

      checkoutSuccesses += 1;

      finishingDarts.push(
        leg.darts
      );
    }
  }

  /*
   * 170 Finish.
   */
  if (results.finish170) {
    for (
      const attempt of
      results.finish170.attempts
    ) {
      totalDoubleAttempts +=
        attempt.doubleDarts;

      successfulDoubles += 1;

      checkoutDoubleAttempts +=
        attempt.checkoutDoubleDarts;

      checkoutSuccesses += 1;

      finishingDarts.push(
        attempt.darts
      );
    }
  }

  /*
   * 501 contributes its double efficiency,
   * but not its whole-leg dart count because
   * that would include the scoring phase.
   */
  if (results.game501) {
    for (
      const leg of
      results.game501.legs
    ) {
      totalDoubleAttempts +=
        leg.doubleDarts;

      successfulDoubles += 1;

      checkoutDoubleAttempts +=
        leg.checkoutDoubleDarts;

      checkoutSuccesses += 1;
    }
  }

  const doubleEfficiency =
    totalDoubleAttempts > 0
      ? clamp(
          (
            successfulDoubles /
            totalDoubleAttempts
          ) * 100,
          0,
          100
        )
      : 0;

  const checkoutDoubleEfficiency =
    checkoutDoubleAttempts > 0
      ? clamp(
          (
            checkoutSuccesses /
            checkoutDoubleAttempts
          ) * 100,
          0,
          100
        )
      : 0;

  const averageFinishingDarts =
    calculateAverage(
      finishingDarts
    );

  /*
   * Initial finishing-speed model.
   */
  const finishingSpeed =
    averageFinishingDarts > 0
      ? clamp(
          120 -
            averageFinishingDarts *
              8,
          0,
          100
        )
      : 0;

  return round1(
    doubleEfficiency * 0.6 +
      finishingSpeed * 0.25 +
      checkoutDoubleEfficiency *
        0.15
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