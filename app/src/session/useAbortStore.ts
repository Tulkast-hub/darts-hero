// public/app/src/session/useAbortStore.ts
import { create } from "zustand";

type AbortHandler = (() => void) | null;

type AbortState = {
  handler: AbortHandler;
  setHandler: (h: AbortHandler) => void;
};

/**
 * Lets the global NavBar back button behave like "Abort" while a drill is in-session.
 * DrillPage registers a handler on mount and clears it on unmount.
 */
export const useAbortStore = create<AbortState>((set) => ({
  handler: null,
  setHandler: (h) => set({ handler: h }),
}));
