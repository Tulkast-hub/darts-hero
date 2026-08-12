// src/pages/LeaderboardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getLeaderboard } from "../api";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
import type { Tier, XpCategory } from "../xp/types";
import { useAuthStore } from "../auth/useAuthStore";
import { useI18n } from "../i18n/I18nProvider";

type ApiRow = {
  user_id: number;
  username?: string;
  display_name?: string;
  total_xp: number;
  category_xp?: Partial<Record<XpCategory, number>>;
};

type SortKey = "overall" | "scoring" | "doubles" | "finishing";

function Cup({ place }: { place: 1 | 2 | 3 }) {
  const color =
    place === 1 ? "#D4AF37" : place === 2 ? "#C0C0C0" : "#CD7F32"; // gold/silver/bronze

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flex: "0 0 auto", color }}
    >
      <path
        fill="currentColor"
        d="M18 2H6v3H3v3c0 3.31 2.69 6 6 6h.1c.55.78 1.35 1.39 2.3 1.74V19H8v3h8v-3h-3.4v-3.26c.95-.35 1.75-.96 2.3-1.74H15c3.31 0 6-2.69 6-6V5h-3V2zm-9 10C6.79 12 5 10.21 5 8V7h1v3c0 .74.26 1.42.7 1.95c.67.09 1.39.05 2.3.05zm10-4c0 2.21-1.79 4-4 4h-.01c.92 0 1.64.04 2.31-.05c.44-.53.7-1.21.7-1.95V7h1v1z"
      />
    </svg>
  );
}

function rankLabel(tier: Tier, level: number) {
  const roman = ["I", "II", "III", "IV", "V"][Math.max(0, Math.min(4, level - 1))];
  return `${tier} ${roman}`;
}

/**
 * Accept multiple possible API shapes:
 * - ApiRow[]
 * - { rows: ApiRow[] }
 * - { leaderboard: ApiRow[] }
 * - { data: ApiRow[] }
 */
function normalizeLeaderboardResponse(res: any): ApiRow[] {
  if (Array.isArray(res)) return res as ApiRow[];

  const candidate =
    res?.rows ??
    res?.leaderboard ??
    res?.data ??
    res?.items ??
    null;

  if (Array.isArray(candidate)) return candidate as ApiRow[];

  return [];
}

export default function LeaderboardPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const status = useAuthStore((s) => s.status);

  const [rows, setRows] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (status !== "authed") {
      nav("/login", { replace: true });
      return;
    }

    let alive = true;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const res = await getLeaderboard();
        const normalized = normalizeLeaderboardResponse(res);

        // If API returned something unexpected, show a helpful error instead of crashing the route.
        if (!Array.isArray(normalized)) {
          throw new Error("Leaderboard response is not an array.");
        }

        if (alive) setRows(normalized);
      } catch (e: any) {
        const msg = String(e?.message || e || "Failed to load leaderboard");
        if (alive) setErr(msg);
        if (alive) setRows([]); // keep render safe
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [status, nav]);

  const decorated = useMemo(() => {
    // Defensive: always map an array, never assume shape.
    return (Array.isArray(rows) ? rows : []).map((r) => {
      const cat = (r.category_xp ?? {}) as Partial<Record<XpCategory, number>>;

      const totalXp = Number(r.total_xp ?? 0);
      const scoringXp = Number(cat.scoring ?? 0);
      const doublesXp = Number(cat.doubles ?? 0);
      const finishingXp = Number(cat.finishing ?? 0);

      const overallRank = getRankStateFromXp(totalXp, XP_CAPS.overallTierMax, "Bronze");
      const scoringRank = getRankStateFromXp(scoringXp, XP_CAPS.categoryTierMax, "Bronze");
      const doublesRank = getRankStateFromXp(doublesXp, XP_CAPS.categoryTierMax, "Bronze");
      const finishingRank = getRankStateFromXp(finishingXp, XP_CAPS.categoryTierMax, "Bronze");

      return {
        ...r,
        name: (r.display_name || r.username || `User ${r.user_id}`).trim(),
        xp: { overall: totalXp, scoring: scoringXp, doubles: doublesXp, finishing: finishingXp },
        ranks: { overall: overallRank, scoring: scoringRank, doubles: doublesRank, finishing: finishingRank },
      };
    });
  }, [rows]);

  const sorted = useMemo(() => {
    const copy = [...decorated];
    copy.sort((a, b) => {
      const va = a.xp[sortKey];
      const vb = b.xp[sortKey];
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return copy;
  }, [decorated, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  function th(label: string, k: SortKey) {
    const active = k === sortKey;
    return (
      <button
        type="button"
        className="btn outline"
        onClick={() => toggleSort(k)}
        style={{
          padding: "8px 10px",
          fontWeight: 700,
          opacity: active ? 1 : 0.75,
          whiteSpace: "nowrap",
        }}
      >
        {label}
        {active ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
      </button>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="page-title" style={{ margin: 0 }}>
              Leaderboard
            </div>
            <div className="muted">{t("Sorted by XP. Tap a column header to reorder.")}</div>
          </div>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {th("Overall XP", "overall")}
          {th("Scoring XP", "scoring")}
          {th("Doubling XP", "doubles")}
          {th("Finishing XP", "finishing")}
        </div>

        {loading && <div style={{ marginTop: 14 }} className="muted">{t("Loading…")}</div>}

        {err && (
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontWeight: 800 }}>{t("Couldn’t load leaderboard")}</div>
            <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{err}</div>
          </div>
        )}

        {!loading && !err && (
          <div style={{ marginTop: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 10px" }}>
              <thead>
                <tr className="muted" style={{ textAlign: "left" }}>
                  <th style={{ padding: "0 10px" }}>#</th>
                  <th style={{ padding: "0 10px" }}>{t("Player")}</th>
                  <th style={{ padding: "0 10px" }}>{t("Overall")}</th>
                  <th style={{ padding: "0 10px" }}>{t("Scoring")}</th>
                  <th style={{ padding: "0 10px" }}>{t("Doubling")}</th>
                  <th style={{ padding: "0 10px" }}>{t("Finishing")}</th>
                </tr>
              </thead>

              <tbody>
                {sorted.map((r, idx) => {
                  const place = idx + 1;
                  const showRankFor = sortKey;

                  const cell = (k: SortKey) => {
                    const xp = r.xp[k];
                    const rk = r.ranks[k];
                    const showRank = showRankFor === k;

                    return (
                      <td style={{ padding: "14px 10px", fontWeight: 800 }}>
                        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                          <div>{xp}</div>
                          {showRank && (
                            <div className="muted" style={{ fontWeight: 700, fontSize: 12, marginTop: 6 }}>
                              {rankLabel(rk.tier, rk.level)}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  };

                  return (
                    <tr
                      key={r.user_id}
                      className="card"
                      style={{
                        borderRadius: 14,
                        boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <td style={{ padding: "14px 10px", fontWeight: 800, width: 42 }}>{place}</td>

                      <td style={{ padding: "14px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {place <= 3 ? <Cup place={place as 1 | 2 | 3} /> : null}
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontWeight: 900 }}>{r.name}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              Overall: {rankLabel(r.ranks.overall.tier, r.ranks.overall.level)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {cell("overall")}
                      {cell("scoring")}
                      {cell("doubles")}
                      {cell("finishing")}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sorted.length === 0 && (
              <div className="muted" style={{ marginTop: 10 }}>
                No leaderboard data yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}