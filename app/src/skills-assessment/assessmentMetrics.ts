import type { AssessmentResults } from "./useAssessmentStore";

export type AssessmentRawMetrics = {
  doublesPercentage: number;
  scoringAverage: number;
  overallAverage: number;

  /*
   * 0-100.
   * Higher = more consistent.
   */
  consistencyScore: number;

  /*
   * We'll add these next.
   */
  setupEfficiency?: number;
  finishingEfficiency?: number;
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

  /*
   * For consistency we use the actual individual
   * visits rather than averaged test results.
   */
  const consistencyVisits = [
    ...dedicatedScoringVisits,
    ...game501ScoringVisits,
  ];

  const consistencyScore =
    calculateConsistency(consistencyVisits);

  return {
    doublesPercentage,
    scoringAverage,
    overallAverage,
    consistencyScore,
  };
}

/*
 * -------------------------------------------------------
 * DOUBLES
 * -------------------------------------------------------
 *
 * Around the World:
 * every dart is a known double attempt.
 *
 * 101 / 170 / 501:
 * doubleDarts contains the reported double attempts
 * across the full leg / attempt.
 *
 * Each completed leg or attempt contributes exactly
 * one successful finishing double.
 */
function calculateDoublesPercentage(
  results: AssessmentResults
): number {
  let hits = 0;
  let attempts = 0;

  if (results.doubles) {
    hits += results.doubles.doublesHit;
    attempts += results.doubles.dartsThrown;
  }

  if (results.checkout101) {
    for (const leg of results.checkout101.legs) {
      hits += 1;
      attempts += leg.doubleDarts;
    }
  }

  if (results.finish170) {
    for (const attempt of results.finish170.attempts) {
      hits += 1;
      attempts += attempt.doubleDarts;
    }
  }

  if (results.game501) {
    for (const leg of results.game501.legs) {
      hits += 1;
      attempts += leg.doubleDarts;
    }
  }

  if (attempts === 0) {
    return 0;
  }

  return Number(
    ((hits / attempts) * 100).toFixed(1)
  );
}

/*
 * -------------------------------------------------------
 * SCORING
 * -------------------------------------------------------
 *
 * Scoring uses:
 *
 * 1. Dedicated 10 scoring visits.
 * 2. 501 scoring visits while the player starts
 *    the visit above 200.
 *
 * The two tests are weighted equally so the larger
 * number of visits in 501 does not automatically
 * dominate the dedicated scoring test.
 */
function calculateCombinedScoringAverage(
  dedicatedScoringVisits: number[],
  game501ScoringVisits: number[]
): number {
  const hasDedicated =
    dedicatedScoringVisits.length > 0;

  const has501 =
    game501ScoringVisits.length > 0;

  if (hasDedicated && has501) {
    const dedicatedAverage =
      calculateAverage(
        dedicatedScoringVisits
      );

    const game501Average =
      calculateAverage(
        game501ScoringVisits
      );

    return Number(
      (
        (dedicatedAverage +
          game501Average) /
        2
      ).toFixed(2)
    );
  }

  if (hasDedicated) {
    return calculateAverage(
      dedicatedScoringVisits
    );
  }

  if (has501) {
    return calculateAverage(
      game501ScoringVisits
    );
  }

  return 0;
}

/*
 * Collect 501 visits which start above 200.
 *
 * Once the player starts a visit at 200 or below,
 * we stop treating it as pure scoring because
 * setup / finishing becomes increasingly relevant.
 */
function get501ScoringVisits(
  results: AssessmentResults
): number[] {
  if (!results.game501) {
    return [];
  }

  const scoringVisits: number[] = [];

  for (const leg of results.game501.legs) {
    let remainder = 501;

    for (const score of leg.visitScores) {
      const remainderBefore =
        remainder;

      if (remainderBefore > 200) {
        scoringVisits.push(score);
      }

      /*
       * Bust visits are stored as 0,
       * so the remainder correctly stays unchanged.
       */
      remainder -= score;
    }
  }

  return scoringVisits;
}

/*
 * -------------------------------------------------------
 * CONSISTENCY
 * -------------------------------------------------------
 *
 * Consistency is not simply "how close every score is
 * to the average".
 *
 * We want:
 *
 * 100, 85, 60, 81
 *
 * to be considered reasonably consistent.
 *
 * But:
 *
 * 134, 41, 140, 26
 *
 * should score poorly because the player is repeatedly
 * moving between very strong and very weak visits.
 *
 * The metric therefore combines:
 *
 * 70% - stability around the player's own average
 * 30% - protection against very low outlier visits
 *
 * Higher score = better consistency.
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
   * -----------------------------------------------------
   * PART 1: STABILITY
   * -----------------------------------------------------
   *
   * Mean absolute deviation is easier to reason about
   * here than standard deviation.
   *
   * We care about how far a normal visit tends to move
   * away from the player's own scoring level.
   */
  const averageDeviation =
    values.reduce(
      (sum, value) =>
        sum +
        Math.abs(value - mean),
      0
    ) / values.length;

  const relativeDeviation =
    averageDeviation / mean;

  /*
   * Rough mapping:
   *
   * 0% deviation  -> 100
   * 10%           -> 80
   * 20%           -> 60
   * 30%           -> 40
   * 40%           -> 20
   * 50%+          -> 0
   *
   * This still allows normal variation caused by
   * missing a treble without immediately crushing
   * the consistency score.
   */
  const stabilityScore =
    clamp(
      100 -
        relativeDeviation * 200,
      0,
      100
    );

  /*
   * -----------------------------------------------------
   * PART 2: LOW OUTLIERS
   * -----------------------------------------------------
   *
   * We specifically want to detect visits that collapse
   * dramatically below the player's usual level.
   *
   * Example:
   *
   * player average around 85
   *
   * 60 = not necessarily bad;
   *      could simply be three singles.
   *
   * 26 = much more likely to indicate major misses.
   */
  const lowOutlierThreshold =
    mean * 0.55;

  let lowOutlierSeverity = 0;

  for (const value of values) {
    if (
      value >=
      lowOutlierThreshold
    ) {
      continue;
    }

    /*
     * Work out how far below the outlier threshold
     * the visit fell.
     *
     * A visit just below the threshold gets a small
     * penalty; a very low visit gets a much larger one.
     */
    const severity =
      (
        lowOutlierThreshold -
        value
      ) /
      lowOutlierThreshold;

    lowOutlierSeverity +=
      clamp(severity, 0, 1);
  }

  const averageOutlierSeverity =
    lowOutlierSeverity /
    values.length;

  /*
   * If very low visits are frequent and severe,
   * this falls rapidly.
   */
  const outlierScore =
    clamp(
      100 -
        averageOutlierSeverity *
          250,
      0,
      100
    );

  /*
   * Stability matters more overall,
   * while low collapses add an extra penalty.
   */
  const consistency =
    stabilityScore * 0.7 +
    outlierScore * 0.3;

  return Number(
    consistency.toFixed(1)
  );
}

/*
 * -------------------------------------------------------
 * GENERIC HELPERS
 * -------------------------------------------------------
 */

function calculateAverage(
  values: number[]
): number {
  if (!values.length) {
    return 0;
  }

  const total =
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  return Number(
    (
      total /
      values.length
    ).toFixed(2)
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