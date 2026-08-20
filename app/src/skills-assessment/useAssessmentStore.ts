import { create } from "zustand";

export type DoublesAssessmentResult = {
  dartsThrown: number;
  doublesHit: number;
  percentage: number;
};

export type Checkout101LegResult = {
  darts: number;
  visits: number;
};

export type Checkout101AssessmentResult = {
  legs: Checkout101LegResult[];
  totalDarts: number;
  averageDarts: number;
};

export type AssessmentResults = {
  doubles?: DoublesAssessmentResult;
  checkout101?: Checkout101AssessmentResult;
  finish170?: Finish170AssessmentResult;
  scoring?: unknown;
  game501?: unknown;
};

export type Finish170AttemptResult = {
  darts: number;
  visits: number;
  visitScores: number[];
  checkoutDarts: number;
};

export type Finish170AssessmentResult = {
  attempts: Finish170AttemptResult[];
  totalDarts: number;
  averageDarts: number;
};

type AssessmentStore = {
  results: AssessmentResults;

  setDoublesResult: (result: DoublesAssessmentResult) => void;

  setCheckout101Result: (
    result: Checkout101AssessmentResult
  ) => void;

  setFinish170Result: (
    result: Finish170AssessmentResult
  ) => void;


  resetAssessment: () => void;
};

export const useAssessmentStore = create<AssessmentStore>((set) => ({
  results: {},

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

  resetAssessment: () => {
    set({
      results: {},
    });
  },
}));