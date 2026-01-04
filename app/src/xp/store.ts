import type { XpAward, XpCategory } from "./types";

export type XpState = {
  totalXp: number;
  categoryXp: Record<XpCategory, number>;
  drillXp: Record<string, number>;
};

const STORAGE_KEY = "dt_xp_state_v1";

export function loadXpState(): XpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as XpState;
  } catch {
    // ignore
  }
  return {
    totalXp: 0,
    categoryXp: {
      scoring: 0,
      finishing: 0,
      doubles: 0,
      bull: 0,
      other: 0,
    },
    drillXp: {},
  };
}

export function saveXpState(state: XpState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function applyXpAward(
  prev: XpState,
  award: Pick<XpAward, "total" | "byCategory">,
  drillKey: string
): XpState {
  const next: XpState = {
    totalXp: Math.max(0, (prev.totalXp ?? 0) + (award.total ?? 0)),
    categoryXp: { ...prev.categoryXp },
    drillXp: { ...prev.drillXp },
  };

  (Object.keys(award.byCategory) as XpCategory[]).forEach((cat) => {
    const delta = award.byCategory[cat] ?? 0;
    next.categoryXp[cat] = Math.max(0, (next.categoryXp[cat] ?? 0) + delta);
  });

  // This award is for a single drill session, so byCategory sum should equal total.
  // Still compute defensively.
  const drillDelta =
    Object.values(award.byCategory).reduce((a, b) => a + (b ?? 0), 0) ||
    award.total ||
    0;

  next.drillXp[drillKey] = Math.max(0, (next.drillXp[drillKey] ?? 0) + drillDelta);

  return next;
}
