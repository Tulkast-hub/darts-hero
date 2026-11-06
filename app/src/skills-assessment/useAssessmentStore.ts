// src/skills-assessment/useAssessmentStore.ts

import {
  create,
} from "zustand";

import {
  persist,
} from "zustand/middleware";


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
  doubles?:
    DoublesAssessmentResult;

  checkout101?:
    Checkout101AssessmentResult;

  finish170?:
    Finish170AssessmentResult;

  scoring?:
    ScoringAssessmentResult;

  game501?:
    Game501AssessmentResult;
};


/*
 * Current assessment position.
 *
 * This lets us restore the correct
 * page after the browser/app closes.
 */
export type AssessmentStep =
  | "doubles"
  | "101"
  | "170"
  | "scoring"
  | "501"
  | "results";


/*
 * Generate a unique identifier
 * for each assessment attempt.
 */
function createAssessmentUuid():
  string {
  return crypto.randomUUID();
}


type AssessmentStore = {
  /*
   * Identifier for the current
   * assessment attempt.
   */
  assessmentUuid:
    string | null;


  /*
   * Last completed assessment
   * results.
   */
  results:
    AssessmentResults;


  /*
   * Current assessment position.
   *
   * null means there is currently
   * no assessment in progress.
   */
  currentStep:
    AssessmentStep | null;


  /*
   * Return the existing UUID or
   * create one if missing.
   */
  ensureAssessmentUuid:
    () => string;


  /*
   * Explicitly set which assessment
   * game should be resumed.
   */
  setCurrentStep:
    (
      step:
        AssessmentStep | null
    ) => void;


  setDoublesResult:
    (
      result:
        DoublesAssessmentResult
    ) => void;


  setCheckout101Result:
    (
      result:
        Checkout101AssessmentResult
    ) => void;


  setFinish170Result:
    (
      result:
        Finish170AssessmentResult
    ) => void;


  setScoringResult:
    (
      result:
        ScoringAssessmentResult
    ) => void;


  setGame501Result:
    (
      result:
        Game501AssessmentResult
    ) => void;


  /*
   * Start/restart an assessment.
   */
  resetAssessment:
    () => void;


  /*
   * Assessment successfully saved
   * and completely finished.
   *
   * Remove the browser draft.
   */
  completeAssessment:
    () => void;
};


export const useAssessmentStore =
  create<AssessmentStore>()(
    persist(
      (
        set,
        get
      ) => ({
        assessmentUuid:
          null,


        results:
          {},


        currentStep:
          null,


        /* ------------------------------------------
           UUID
        ------------------------------------------- */

        ensureAssessmentUuid:
          () => {
            const existingUuid =
              get()
                .assessmentUuid;


            if (
              existingUuid
            ) {
              return existingUuid;
            }


            const newUuid =
              createAssessmentUuid();


            set({
              assessmentUuid:
                newUuid,
            });


            return newUuid;
          },


        /* ------------------------------------------
           CURRENT STEP
        ------------------------------------------- */

        setCurrentStep:
          (
            step
          ) =>
            set({
              currentStep:
                step,
            }),


        /* ------------------------------------------
           RESULTS
        ------------------------------------------- */

        setDoublesResult:
          (
            result
          ) =>
            set(
              (
                state
              ) => ({
                results: {
                  ...state.results,

                  doubles:
                    result,
                },
              })
            ),


        setCheckout101Result:
          (
            result
          ) =>
            set(
              (
                state
              ) => ({
                results: {
                  ...state.results,

                  checkout101:
                    result,
                },
              })
            ),


        setFinish170Result:
          (
            result
          ) =>
            set(
              (
                state
              ) => ({
                results: {
                  ...state.results,

                  finish170:
                    result,
                },
              })
            ),


        setScoringResult:
          (
            result
          ) =>
            set(
              (
                state
              ) => ({
                results: {
                  ...state.results,

                  scoring:
                    result,
                },
              })
            ),


        setGame501Result:
          (
            result
          ) =>
            set(
              (
                state
              ) => ({
                results: {
                  ...state.results,

                  game501:
                    result,
                },
              })
            ),


        /* ------------------------------------------
           RESET / START OVER
        ------------------------------------------- */

        resetAssessment:
          () => {
            set({
              assessmentUuid:
                createAssessmentUuid(),

              results:
                {},

              currentStep:
                "doubles",
            });
          },


        /* ------------------------------------------
           COMPLETE
        ------------------------------------------- */

        completeAssessment:
          () => {
            set({
              assessmentUuid:
                null,

              results:
                {},

              currentStep:
                null,
            });
          },
      }),

      {
        name:
          "darts-hero-skills-assessment",

        /*
         * Version the persisted shape
         * because we're adding
         * currentStep now.
         */
        version:
          2,

        /*
         * Existing users may already
         * have saved results from the
         * previous store shape.
         *
         * Work out the most sensible
         * next step from those results.
         */
        migrate:
          (
            persistedState:
              any
          ) => {
            const state =
              persistedState ??
              {};


            const results:
              AssessmentResults =
              state.results ??
              {};


            let currentStep:
              AssessmentStep | null =
              state.currentStep ??
              null;


            if (
              !currentStep
            ) {
              if (
                results.game501
              ) {
                currentStep =
                  "results";
              } else if (
                results.scoring
              ) {
                currentStep =
                  "501";
              } else if (
                results.finish170
              ) {
                currentStep =
                  "scoring";
              } else if (
                results.checkout101
              ) {
                currentStep =
                  "170";
              } else if (
                results.doubles
              ) {
                currentStep =
                  "101";
              }
            }


            return {
              ...state,

              results,

              currentStep,
            };
          },
      }
    )
  );