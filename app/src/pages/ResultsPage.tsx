import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getDrillDef } from "../drills/registry";
import RankBadge from "../ui/RankBadge";

import type { DrillResult, XpAward, XpCategory, Tier } from "../xp/types";
import type { XpState } from "../xp/store";

import { GAME_XP, DEFAULT_GAME_XP } from "../xp/gameXp";

type ResultState = {
  win: boolean;
  xp: number; // legacy XP delta
  payload: any;
  drillKey: string;

  // New XP system
  xpAward?: XpAward;
  xpBeforeState?: XpState;
  xpAfterState?: XpState;
  drillResult?: DrillResult;
};

type XpBarConfig = {
  label: string;
  tier: Tier; // base tier for visuals
  xpBefore: number; // stored cumulative xp for that track (can exceed max)
  xpAfter: number;
  max: number; // XP needed to complete a full tier (i.e. ranks 1..5)
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function categoryLabel(cat: XpCategory) {
  switch (cat) {
    case "scoring":
      return "Scoring";
    case "finishing":
      return "Finishing";
    case "doubles":
      return "Doubling"; // keep internal key, show “Doubling”
    default:
      return "Other";
  }
}

/**
 * Caps represent XP for a FULL tier (ranks 1..5).
 * We render progress *within the current rank*, and allow overflow to promote tiers.
 *
 * Tune these to control how many games it takes to rank up.
 * With drillMax=2000 => 400 XP per rank (~3–4 wins per rank at 110–120 XP).
 */
function getXpBarsFromState(
  drillKey: string,
  drillTitle: string,
  tier: Tier,
  category: XpCategory,
  before: XpState,
  after: XpState
): XpBarConfig[] {
  const drillMax = 2000;
  const catMax = 10000;
  const overallMax = 40000;

  const drillBefore = before.drillXp?.[drillKey] ?? 0;
  const drillAfter = after.drillXp?.[drillKey] ?? 0;

  const catBefore = before.categoryXp?.[category] ?? 0;
  const catAfter = after.categoryXp?.[category] ?? 0;

  const overallBefore = before.totalXp ?? 0;
  const overallAfter = after.totalXp ?? 0;

  return [
    {
      label: `Drill XP · ${drillTitle}`,
      tier: "Bronze" as Tier,
      xpBefore: drillBefore,
      xpAfter: drillAfter,
      max: drillMax,
    },
    {
      label: `Category XP · ${categoryLabel(category)}`,
      tier: "Bronze" as Tier,
      xpBefore: Math.max(0, catBefore),
      xpAfter: Math.max(0, catAfter),
      max: catMax,
    },
    {
      label: "Overall XP",
      tier: "Bronze" as Tier,
      xpBefore: Math.max(0, overallBefore),
      xpAfter: Math.max(0, overallAfter),
      max: overallMax,
    },
  ];
}

function ObjectiveBar({ result }: { result?: DrillResult }) {
  if (!result) return null;

  const obj = result.objective;
  const label = obj?.label ?? "Objective";
  const current = obj?.current;
  const target = obj?.target;
  const unit = obj?.unit ? ` ${obj.unit}` : "";

  return (
    <div className="objective-pill" style={{ marginTop: 12 }}>
      <div className="objective-label">Objective</div>
      <div className="objective-value" style={{ lineHeight: 1.1 }}>
        {label}
      </div>
      {typeof current === "number" && typeof target === "number" ? (
        <div className="muted" style={{ marginTop: 4, fontWeight: 700 }}>
          {current}
          {unit} / {target}
          {unit}
        </div>
      ) : null}
    </div>
  );
}

function prettyLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/avg/g, "avg.")
    .replace(/gt/g, "≥")
    .replace(/h180/g, "180s")
    .replace(/pts/g, "pts")
    .replace(/(\w)/g, (m) => m.toUpperCase());
}

function pickStats(stats: Record<string, any> | undefined) {
  if (!stats) return [];

  const preferred = [
    "accuracy",
    "avg_points_per_throw",
    "points",
    "total_points",
    "target_points",
    "best_streak",
    "scoring_throws",
    "total_checkouts",
    "checkout_count",
    "conversion",
    "peak_checkout",
    "completed_count",
    "sections_completed",
    "total_hits",
    "misses",
  ];

  const out: Array<{ label: string; value: React.ReactNode }> = [];

  // First pass: preferred keys (most meaningful across drills)
  for (const k of preferred) {
    const v = (stats as any)[k];
    if (typeof v === "number") out.push({ label: prettyLabel(k), value: k.includes("accuracy") ? `${v}%` : v });
    else if (typeof v === "string") out.push({ label: prettyLabel(k), value: v });
  }

  // Common “used / max” patterns
  if (typeof (stats as any).throws_used === "number" && typeof (stats as any).max_throws === "number") {
    out.push({ label: "Throws", value: `${(stats as any).throws_used} / ${(stats as any).max_throws}` });
  }
  if (typeof (stats as any).darts_used === "number" && typeof (stats as any).max_darts === "number") {
    out.push({ label: "Darts", value: `${(stats as any).darts_used} / ${(stats as any).max_darts}` });
  }

  // Fallback: if we still have very few stats, include extra numeric/string fields
  if (out.length < 6) {
    const seen = new Set(out.map((s) => s.label));
    const keys = Object.keys(stats).filter((k) => !k.startsWith("_") && k !== "game_key" && k !== "tier" && k !== "level");
    for (const k of keys) {
      if (out.length >= 10) break;
      const v = (stats as any)[k];
      if (v == null) continue;
      if (typeof v === "number" || typeof v === "string") {
        const label = prettyLabel(k);
        if (seen.has(label)) continue;
        out.push({ label, value: k.includes("accuracy") ? `${v}%` : v });
        seen.add(label);
      }
    }
  }

  return out.slice(0, 10);
}

function deriveObjective(drillKey: string, payload: any): DrillResult["objective"] | undefined {
  // If drills pass a fully shaped objective, use it.
  if (payload?.objective && typeof payload.objective === "object") {
    const o = payload.objective;
    if (typeof o.label === "string") return o;
  }

  // Generic best-effort heuristics for new drills.
  const points = payload?.total_points ?? payload?.points ?? payload?.total;
  const targetPoints = payload?.target_points ?? payload?.target;
  if (typeof points === "number" && typeof targetPoints === "number") {
    return { label: "Target points", current: points, target: targetPoints, unit: "pts" };
  }

  const curCheckouts = payload?.total_checkouts ?? payload?.checkouts ?? payload?.checkout_count;
  const reqCheckouts = payload?.required_checkouts ?? payload?.required;
  if (typeof curCheckouts === "number" && typeof reqCheckouts === "number") {
    return { label: "Checkouts", current: curCheckouts, target: reqCheckouts, unit: "outs" };
  }

  const cur = payload?.current_step ?? payload?.completed_count ?? payload?.progress_current;
  const tgt = payload?.goal_steps ?? payload?.progress_target ?? payload?.target_count;
  if (typeof cur === "number" && typeof tgt === "number") {
    return { label: "Progress", current: cur, target: tgt };
  }

  // Some drills have only a goal threshold.
  const goal = payload?.goal_checkout ?? payload?.goal;
  if (typeof goal === "number") return { label: "Goal", target: goal };

  // No objective found.
  return undefined;
}

function buildAchievements(win: boolean, stats: Record<string, any> | undefined): string[] {
  const a: string[] = [];
  if (win) a.push("Objective complete");
  if (!stats) return a;

  const acc = stats.accuracy;
  if (typeof acc === "number") {
    if (acc >= 90) a.push("90%+ accuracy");
    else if (acc >= 80) a.push("80%+ accuracy");
  }

  const streak = stats.best_streak;
  if (typeof streak === "number" && streak >= 8) a.push("Hot streak (8+)");
  else if (typeof streak === "number" && streak >= 5) a.push("Hot streak (5+)");

  const peak = stats.peak_checkout;
  if (typeof peak === "number" && peak >= 100) a.push("100+ checkout");

  const pts = stats.total_points ?? stats.points;
  const tgt = stats.target_points;
  if (typeof pts === "number" && typeof tgt === "number" && pts >= tgt) a.push("Target reached");

  return a.slice(0, 5);
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="pill pill-stat" style={{ minWidth: 0 }}>
      <div className="pill-label">{label}</div>
      <div className="pill-value" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </div>
    </div>
  );
}

/**
 * Rank math:
 * - Each track has a "tierMax" (max in config): XP to fill ranks 1..5 of ONE tier.
 * - rankSize = tierMax / 5
 * - XP can overflow: Silver 5 + more => Gold 1, etc.
 */
const TIERS: Tier[] = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

function promoteTier(base: Tier, steps: number): Tier {
  const i = TIERS.indexOf(base);
  if (i === -1) return base;
  return TIERS[Math.min(TIERS.length - 1, i + Math.max(0, steps))];
}

function getRankStateFromXp(xp: number, tierMax: number, baseTier: Tier) {
  const rankSize = tierMax / 5;
  const safeXp = Math.max(0, xp);

  const rawRank = Math.floor(safeXp / rankSize) + 1; // 1..infinite
  const tierSteps = Math.floor((rawRank - 1) / 5);
  const level = ((rawRank - 1) % 5) + 1; // 1..5 within tier
  const tier = promoteTier(baseTier, tierSteps);

  const xpInRank = safeXp - Math.floor((rawRank - 1) * rankSize);

  return { tier, level, xpInRank, rankSize };
}

function XpBar({ config }: { config: XpBarConfig }) {
  const { label, tier: baseTier, xpBefore, xpAfter, max: tierMax } = config;

  const beforeState = getRankStateFromXp(xpBefore, tierMax, baseTier);
  const afterState = getRankStateFromXp(xpAfter, tierMax, baseTier);

  const changed = beforeState.tier !== afterState.tier || beforeState.level !== afterState.level;

  const [pct, setPct] = useState(() =>
    Math.round((beforeState.xpInRank / beforeState.rankSize) * 100)
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setPct(Math.round((afterState.xpInRank / afterState.rankSize) * 100));
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xpAfter, baseTier, tierMax]);

  const delta = xpAfter - xpBefore;

  return (
    <div className="result-xp-row">
      <div className="result-xp-header">
        <div>
          <div className="result-xp-title">{label}</div>
          <div className="result-xp-badges" style={{ marginTop: 4 }}>
            {changed ? (
              <>
                <RankBadge tier={beforeState.tier} level={beforeState.level} />
                <span className="result-xp-arrow">→</span>
                <RankBadge tier={afterState.tier} level={afterState.level} />
              </>
            ) : (
              <RankBadge tier={afterState.tier} level={afterState.level} />
            )}
          </div>
        </div>

        <div className="result-xp-rank-change" style={{ textAlign: "right" }}>
          <div className="muted small">
            {xpBefore} → {xpAfter}
            <span className={delta >= 0 ? "xp-delta-pos" : "xp-delta-neg"}>
              {formatXpDelta(delta)} XP
            </span>
          </div>
          <div className="muted small" style={{ marginTop: 4 }}>
            Rank XP: {afterState.xpInRank}/{afterState.rankSize}
          </div>
        </div>
      </div>

      <div className="xpbar-track">
        <div
          className="xpbar-fill xpbar-fill-anim"
          style={{ width: `${clamp(pct, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function formatXpDelta(xp: number) {
  if (xp === 0) return "0";
  return xp > 0 ? `+${xp}` : `-${Math.abs(xp)}`;
}

function readLastMeta(drillKey: string): { tier?: Tier; level?: number } {
  try {
    const raw = sessionStorage.getItem(`drill_meta:${drillKey}`);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return { tier: obj?.tier, level: obj?.level };
  } catch {
    return {};
  }
}

function writeLastMeta(drillKey: string, tier: Tier, level: number) {
  try {
    sessionStorage.setItem(`drill_meta:${drillKey}`, JSON.stringify({ tier, level }));
  } catch {
    // ignore
  }
}

export default function ResultsPage() {
  const nav = useNavigate();
  const { key } = useParams();
  const location = useLocation();

  const state = (location.state || {}) as ResultState;
  const drillKey = state.drillKey || key || "";
  const win = !!state.win;

  const xpAward = state.xpAward;
  const drillResult = state.drillResult;
  const before = state.xpBeforeState;
  const after = state.xpAfterState;

  const drillDef = useMemo(() => getDrillDef(drillKey), [drillKey]);

  // Always operate on the canonical key for XP/state, so legacy URLs don't create
  // separate drill tracks (and don't reclassify historical XP into a category).
  const canonicalKey = drillDef?.key ?? drillKey;

  const lastMeta = useMemo(() => readLastMeta(canonicalKey), [canonicalKey]);

  const effectiveResult: DrillResult | undefined = useMemo(() => {
    if (drillResult) return drillResult;
    if (!canonicalKey) return undefined;

    const payload = state.payload ?? {};
    const tier = (payload?.tier ?? lastMeta.tier ?? "Bronze") as Tier;
    const level = typeof payload?.level === "number" ? payload.level : typeof lastMeta.level === "number" ? lastMeta.level : 1;

    const throws_used =
      payload?.throws_used ?? payload?.throwsUsed ?? payload?.throws ?? payload?.darts_used ?? undefined;
    const max_throws =
      payload?.max_throws ?? payload?.maxThrows ?? payload?.max_throws_total ?? payload?.maxThrowsTotal ?? undefined;

    return {
      game_key: canonicalKey,
      category: drillDef?.category ?? "other",
      tier,
      level,
      win,
      aborted: Boolean(payload?.aborted),
      throws_used: typeof throws_used === "number" ? throws_used : undefined,
      max_throws: typeof max_throws === "number" ? max_throws : undefined,
      objective: deriveObjective(canonicalKey, payload),
      // Prefer a dedicated stats object if the drill provides it.
      stats: payload?.stats && typeof payload.stats === "object" ? payload.stats : payload,
    };
  }, [drillResult, canonicalKey, drillDef?.category, state.payload, lastMeta.tier, lastMeta.level, win]);

  const tier: Tier = (effectiveResult?.tier ?? lastMeta.tier ?? "Bronze") as Tier;
  const rawCategory: XpCategory = effectiveResult?.category ?? "other";

  const category: XpCategory =
  rawCategory === "bull" ? "doubles" : rawCategory;

  useEffect(() => {
    if (effectiveResult?.tier && typeof effectiveResult.level === "number") {
      writeLastMeta(canonicalKey, effectiveResult.tier, effectiveResult.level);
    }
  }, [canonicalKey, effectiveResult?.tier, effectiveResult?.level]);

  const bars = useMemo(() => {
    if (before && after) return getXpBarsFromState(canonicalKey, drillDef?.title ?? canonicalKey, tier, category, before, after);
    return [] as XpBarConfig[];
  }, [before, after, canonicalKey, tier, category, drillDef?.title]);

  const delta = xpAward?.total ?? state.xp ?? 0;

  const baseCfg = (GAME_XP[canonicalKey] ?? GAME_XP[drillKey] ?? DEFAULT_GAME_XP);
  const baseWin = baseCfg.win;
  const goodWinBonus = win && delta > 0 && delta > baseWin ? delta - baseWin : 0;

  const title = drillDef?.title ?? drillKey;
  const achievements = useMemo(() => buildAchievements(win, effectiveResult?.stats), [win, effectiveResult?.stats]);

  return (
    <div className="page">
      <div className="card result-card" style={{ paddingBottom: 18 }}>
        {win ? <div className="result-confetti-layer" aria-hidden="true" /> : null}
        <div className="result-main">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div className="muted small">{title}</div>
              <div
                className={
                  "result-status result-status-anim " + (win ? "result-status-win" : "result-status-loss")
                }
              >
                {win ? "Win" : "Loss"}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <RankBadge tier={tier} level={typeof effectiveResult?.level === "number" ? effectiveResult.level : 1} />
                <span className="muted small">•</span>
                <span className="muted small" style={{ textTransform: "capitalize" }}>{category}</span>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div className="muted small">XP GAINED</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{formatXpDelta(delta)}</div>
              {goodWinBonus > 0 ? (
                <div className="muted small" style={{ marginTop: 6, fontWeight: 800 }}>
                  Good win <span className="xp-delta-pos">+{goodWinBonus} XP</span>
                </div>
              ) : null}
            </div>
          </div>

          {achievements.length ? (
            <div className="result-achievements" style={{ marginTop: 12 }}>
              {achievements.map((t, i) => (
                <div key={t} className="achievement-pill" style={{ animationDelay: `${i * 60}ms` }}>
                  {t}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <ObjectiveBar result={effectiveResult} />

      {bars.length ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="muted small">XP</div>
          <div className="result-xp-section">
            {bars.map((b) => (
              <XpBar key={b.label} config={b} />
            ))}
          </div>
        </div>
      ) : null}

      {effectiveResult?.stats && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="muted small">DRILL STATS</div>
          <div className="result-stats-grid" style={{ marginTop: 10 }}>
            {pickStats(effectiveResult.stats).map((st) => (
              <Stat key={st.label} label={st.label} value={st.value} />
            ))}
          </div>
        </div>
      )}

      <div className="row" style={{ gap: 8, marginTop: 14 }}>
        <button className="btn outline" onClick={() => nav("/")}>Back to Home</button>
        <button className="btn" onClick={() => nav(`/drill/${drillKey}`)}>Replay</button>
      </div>
    </div>
  );
}
