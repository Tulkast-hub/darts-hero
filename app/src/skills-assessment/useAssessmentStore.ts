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
  finish170?: unknown;
  scoring?: unknown;
  game501?: unknown;
};

type AssessmentStore = {
  results: AssessmentResults;

  setDoublesResult: (result: DoublesAssessmentResult) => void;

  setCheckout101Result: (
    result: Checkout101AssessmentResult
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

  resetAssessment: () => {
    set({
      results: {},
    });
  },
}));