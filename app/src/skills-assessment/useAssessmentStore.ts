
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AssessmentVisit = {
  score: number;
  doubleDarts: number;
};

export type DoublesAssessmentResult = {
  dartsThrown: number;
  doublesHit: number;
  percentage: number;
};

export type Checkout101LegResult = {
  darts: number;
  visits: number;
  visitScores: AssessmentVisit[];
  checkoutDarts: number;
  doubleDarts: number;
  checkoutDoubleDarts: number;
};

export type Checkout101AssessmentResult = {
  legs: Checkout101LegResult[];
  totalDarts: number;
  averageDarts: number;
};

export type Finish170AttemptResult = {
  darts: number;
  visits: number;
  visitScores: AssessmentVisit[];
  checkoutDarts: number;
  doubleDarts: number;
  checkoutDoubleDarts: number;
};

export type Finish170AssessmentResult = {
  attempts: Finish170AttemptResult[];
  totalDarts: number;
  averageDarts: number;
};

export type ScoringAssessmentResult = {
  visits: number[];
  totalScore: number;
  averageScore: number;
};

export type Game501LegResult = {
  darts: number;
  visits: number;
  visitScores: AssessmentVisit[];
  checkoutDarts: number;
  doubleDarts: number;
  checkoutDoubleDarts: number;
};

export type Game501AssessmentResult = {
  legs: Game501LegResult[];
  totalDarts: number;
  totalScore: number;
  threeDartAverage: number;
};

export type AssessmentResults = {
  doubles?: DoublesAssessmentResult;
  checkout101?: Checkout101AssessmentResult;
  finish170?: Finish170AssessmentResult;
  scoring?: ScoringAssessmentResult;
  game501?: Game501AssessmentResult;
};

/*
 * Generate a unique identifier for each
 * assessment attempt.
 *
 * Staging and production use HTTPS, so
 * crypto.randomUUID() is available.
 */
function createAssessmentUuid(): string {
  return crypto.randomUUID();
}

type AssessmentStore = {
  /*
   * Identifier for the current assessment.
   *
   * null is allowed for assessments saved
   * before this field was introduced.
   */
  assessmentUuid: string | null;

  results: AssessmentResults;

  /*
   * Return the existing assessment UUID
   * or create one when it is missing.
   *
   * This is useful for existing persisted
   * results and the test results loader.
   */
  ensureAssessmentUuid: () => string;

  setDoublesResult: (
    result: DoublesAssessmentResult
  ) => void;

  setCheckout101Result: (
    result: Checkout101AssessmentResult
  ) => void;

  setFinish170Result: (
    result: Finish170AssessmentResult
  ) => void;

  setScoringResult: (
    result: ScoringAssessmentResult
  ) => void;

  setGame501Result: (
    result: Game501AssessmentResult
  ) => void;

  resetAssessment: () => void;
};

export const useAssessmentStore =
  create<AssessmentStore>()(
    persist(
      (set, get) => ({
        assessmentUuid: null,

        results: {},

        /*
         * Keep the same UUID for the entire
         * current assessment.
         *
         * Only create one if missing.
         */
        ensureAssessmentUuid: () => {
          const existingUuid =
            get().assessmentUuid;

          if (existingUuid) {
            return existingUuid;
          }

          const newUuid =
            createAssessmentUuid();

          set({
            assessmentUuid: newUuid,
          });

          return newUuid;
        },

        setDoublesResult: (result) =>
          set((state) => ({
            results: {
              ...state.results,
              doubles: result,
            },
          })),

        setCheckout101Result: (result) =>
          set((state) => ({
            results: {
              ...state.results,
              checkout101: result,
            },
          })),

        setFinish170Result: (result) =>
          set((state) => ({
            results: {
              ...state.results,
              finish170: result,
            },
          })),

        setScoringResult: (result) =>
          set((state) => ({
            results: {
              ...state.results,
              scoring: result,
            },
          })),

        setGame501Result: (result) =>
          set((state) => ({
            results: {
              ...state.results,
              game501: result,
            },
          })),

        /*
         * Start a fresh assessment.
         *
         * This clears only the current
         * browser-stored assessment.
         *
         * Previously completed assessments
         * saved in MariaDB are unaffected.
         */
        resetAssessment: () => {
          set({
            assessmentUuid:
              createAssessmentUuid(),

            results: {},
          });
        },
      }),
      {
        name:
          "darts-hero-skills-assessment",
      }
    )
  );