import { create } from "zustand";
import type { XpState } from "./store";
import { loadXpState, saveXpState } from "./store";

type XpStore = {
  state: XpState;
  setState: (next: XpState) => void;
  reload: () => void;
};

export const useXpStore = create<XpStore>((set) => ({
  state: loadXpState(),
  setState: (next) => {
    saveXpState(next);
    set({ state: next });
  },
  reload: () => set({ state: loadXpState() }),
}));
