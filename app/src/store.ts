import { create } from "zustand";

export type Game = {
  key: string;
  name: string;
  category: "Scoring" | "Checkout" | "Consistency" | "Pressure";
  description: string;
  difficulty: 1|2|3|4|5;
};

export type SessionMetrics = {
  accuracy: number;
  difficulty: number;
  volume: number;
};

type State = {
  games: Game[];
  current?: Game;
  loading: boolean;
  setCurrent: (g?: Game) => void;
  setLoading: (b: boolean) => void;
};

export const useStore = create<State>((set) => ({
  games: [
    { key:"doubles_world", name:"Doubles Around the World", category:"Consistency", description:"Hit every double 1-20 in order.", difficulty:2 },
    { key:"shanghai", name:"Shanghai 1–20", category:"Consistency", description:"Single, double, treble in the same number.", difficulty:3 },
    { key:"checkout_121", name:"121+ Ladder", category:"Checkout", description:"Try to checkout 121+ in 9 darts, step down on fail.", difficulty:4 },
    { key:"t20_drill", name:"Treble 20 Drill", category:"Scoring", description:"Hit as many T20s in N darts.", difficulty:3 },
    { key:"clutch_bull", name:"Clutch Bull", category:"Pressure", description:"Finish on bull under time pressure.", difficulty:3 }
  ],
  current: undefined,
  loading: false,
  setCurrent: (g) => set({ current: g }),
  setLoading: (b) => set({ loading: b })
}));
