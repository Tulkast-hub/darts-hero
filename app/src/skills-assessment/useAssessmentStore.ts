import { create } from "zustand";

export type DoublesAssessmentResult = {
  dartsThrown: number;
  doublesHit: number;
  percentage: number;
};

export type AssessmentResults = {
  doubles?: DoublesAssessmentResult;
  checkout101?: unknown;
  finish170?: unknown;
  scoring?: unknown;
  game501?: unknown;
};

type AssessmentStore = {
  results: AssessmentResults;

  setDoublesResult: (result: DoublesAssessmentResult) => void;

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

  resetAssessment: () => {
    set({
      results: {},
    });
  },
}));