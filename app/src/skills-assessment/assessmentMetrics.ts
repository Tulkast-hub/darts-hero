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

export function calculateAssessmentSkillScores(
  metrics: AssessmentRawMetrics
): AssessmentSkillScores {
  return {
    /*
     * Doubles:
     * 10% = beginner level
     * 50%+ = very strong
     */
    doubles: normalizeMetric(
      metrics.doublesPercentage,
      10,
      50
    ),

    /*
     * Scoring:
     * 30 average = beginner
     * 100 average = very strong
     */
    scoring: normalizeMetric(
      metrics.scoringAverage,
      30,
      100
    ),

    /*
     * Setup Play is already 0–100.
     */
    setup: round1(
      clamp(
        metrics.setupEfficiency,
        0,
        100
      )
    ),

    /*
     * Finishing is already 0–100.
     */
    finishing: round1(
      clamp(
        metrics.finishingEfficiency,
        0,
        100
      )
    ),

    /*
     * Overall 501 average:
     * 35 = beginner
     * 90 = very strong amateur
     */
    overallAverage: normalizeMetric(
      metrics.overallAverage,
      35,
      90
    ),

    /*
     * Consistency is already 0–100.
     */
    consistency: round1(
      clamp(
        metrics.consistencyScore,
        0,
        100
      )
    ),
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
   * Every completed leg contains one
   * successful finishing double.
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
       * Pure scoring phase.
       *
       * Once the player reaches 200 or less,
       * we treat the visits more as setup /
       * finishing rather than pure scoring.
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
   * If both sources exist,
   * weight them equally.
   *
   * This prevents the larger number
   * of 501 visits from dominating
   * the dedicated scoring drill.
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
   * Measure how far individual visits
   * move away from the player's own average.
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
   * Additional penalty for large low-score
   * collapses.
   *
   * Example:
   * 100, 85, 60, 81
   * should remain fairly consistent.
   *
   * 134, 41, 140, 26
   * should score poorly.
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

  /*
   * Stability matters most,
   * but low collapses also matter.
   */
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

        /*
         * Evaluate setup visits while
         * above a simple finishing score.
         */
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
   * 501.
   *
   * Setup phase begins once the player
   * starts a visit below 200.
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
   * Checkout completed.
   */
  if (remainderAfter <= 0) {
    return 100;
  }

  /*
   * Leaving 50 or less means the player
   * has successfully reached a simple
   * finishing position.
   *
   * We deliberately do NOT care whether
   * this is D16, D7, D20, etc.
   */
  if (
    remainderAfter <= 50
  ) {
    return 100;
  }

  /*
   * Legal three-dart checkout.
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
   * Under 170 but on a bogey number.
   *
   * This is still useful progress,
   * but should score less than leaving
   * a genuine checkout.
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

/*
 * Bogey numbers that cannot be
 * completed in three darts.
 */
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

      /*
       * 101 is already a finishing exercise,
       * so the entire leg is relevant here.
       */
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

      /*
       * 170 is deliberately a finishing /
       * setup exercise.
       */
      finishingDarts.push(
        attempt.darts
      );
    }
  }

  /*
   * 501 contributes doubles efficiency,
   * but we do not currently use the entire
   * 501 leg's dart count for finishing speed.
   *
   * Doing so would incorrectly include the
   * scoring phase.
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
   * Initial calibration:
   *
   * 3 darts  -> ~96
   * 6 darts  -> ~72
   * 9 darts  -> ~48
   * 12 darts -> ~24
   * 15 darts -> 0
   *
   * This is intentionally provisional
   * and can be calibrated once we have
   * real assessment data.
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

  /*
   * Main emphasis is on actual
   * double conversion.
   */
  return round1(
    doubleEfficiency * 0.6 +
      finishingSpeed * 0.25 +
      checkoutDoubleEfficiency *
        0.15
  );
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

function normalizeMetric(
  value: number,
  minimum: number,
  maximum: number
): number {
  if (
    maximum <= minimum
  ) {
    return 0;
  }

  const normalized =
    (
      (value - minimum) /
      (maximum - minimum)
    ) * 100;

  return round1(
    clamp(
      normalized,
      0,
      100
    )
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