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
    doubles: normalizeMetric(
      metrics.doublesPercentage,
      10,
      50
    ),

    scoring: normalizeMetric(
      metrics.scoringAverage,
      30,
      100
    ),

    setup: round1(
      clamp(
        metrics.setupEfficiency,
        0,
        100
      )
    ),

    finishing: round1(
      clamp(
        metrics.finishingEfficiency,
        0,
        100
      )
    ),

    overallAverage: normalizeMetric(
      metrics.overallAverage,
      35,
      90
    ),

    consistency: round1(
      clamp(
        metrics.consistencyScore,
        0,
        100
      )
    ),
  };
}

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

  /*
   * Absolute maximum.
   */
  if (value >= 100) {
    return {
      band: "Diamond",
      level: 5,
    };
  }

  /*
   * Each main tier spans 20 points.
   *
   * Bronze   0–19.99
   * Silver  20–39.99
   * Gold    40–59.99
   * Platinum 60–79.99
   * Diamond 80–100
   */
  const bandIndex =
    Math.floor(value / 20);

  const safeBandIndex =
    Math.min(
      bandIndex,
      bands.length - 1
    );

  const band =
    bands[safeBandIndex];

  /*
   * Each internal level spans 4 points.
   *
   * Example:
   * 20–23.99 => Silver 1
   * 24–27.99 => Silver 2
   * 40–43.99 => Gold 1
   */
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
  if (remainderAfter <= 0) {
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