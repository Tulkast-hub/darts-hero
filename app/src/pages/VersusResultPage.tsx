import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";

type FinishResult = { payload: any; win: boolean };

type ResultState = {
  drillKey: string;
  drillTitle: string;
  tier: string;
  level: number;
  hero1: string;
  hero2: string;
  p1: FinishResult | null;
  p2: FinishResult | null;
  winnerIdx: 0 | 1 | null;
  winnerName: string | null;
};

type Pill = { label: string; value: string };

function pill(label: string, v: any, fmt?: (x: any) => string): Pill | null {
  if (v === undefined || v === null || v === "") return null;
  return { label, value: fmt ? fmt(v) : String(v) };
}

function fmtPercent(v: any) {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  // keep it clean if it's already an integer-like value
  const s = Math.round(n * 10) / 10;
  return `${s}%`;
}

function fmtObjective(obj: any) {
  if (!obj) return null;
  const label = obj.label || "Objective";
  if (typeof obj.target !== "undefined") {
    const prog = typeof obj.progress !== "undefined" ? obj.progress : "—";
    return { label, value: `${prog} / ${obj.target}` };
  }
  if (typeof obj.progress !== "undefined") return { label, value: String(obj.progress) };
  return null;
}

function buildPills(r: FinishResult | null): Pill[] {
  if (!r) return [];

  const p = r.payload || {};
  const obj = p.objective || {};
  const stats = p.stats || {};

  // Collect from both payload + stats so we get more parity with training results.
  const pills: Array<Pill | null> = [
    pill("Result", r.win ? "Completed" : "Not completed"),
    (() => {
      const o = fmtObjective(obj);
      return o ? { label: o.label, value: o.value } : null;
    })(),
    pill("Darts used", p.throws_used ?? p.darts_used ?? p.total_darts_used),
    pill("Darts left", p.darts_left ?? stats.darts_left),
    pill("Throws", stats.throws ?? stats.turns ?? stats.visits),
    pill("Accuracy", stats.accuracy, fmtPercent),
    pill("Score", stats.score ?? p.score),
    pill("Points", stats.points ?? p.points),
    pill("Checkouts", stats.checkout_count ?? stats.checkouts),
    pill("Sections", stats.sections_completed),
    pill("Hits", stats.hits),
    pill("Misses", stats.misses),
    pill("Best", stats.best),
    pill("Avg/visit", stats.avg_per_visit ?? stats.avg_visit),
  ];

  return pills.filter(Boolean) as Pill[];
}

function StatPills({ pills }: { pills: Pill[] }) {
  const { t } = useI18n();
  if (!pills.length) {
    return <p className="muted">{t("No final stats (game ended early).")}</p>;
  }

  return (
    <div
      className="versus-stat-pills"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 10,
      }}
    >
      {pills.map((p) => (
        <div
          key={p.label}
          className="stat-pill"
          style={{
            padding: "10px 12px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "rgba(255,255,255,0.92)",
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            maxWidth: "100%",
          }}
        >
          <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
            {p.label}
          </span>
          <span style={{ fontWeight: 800 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function VersusResultPage() {
  const { t } = useI18n();
  const location = useLocation();
  const s = (location.state || null) as ResultState | null;

  if (!s) {
    return (
      <div className="page">
        <div className="card">
          <div className="title">{t("Versus Results")}</div>
          <p className="muted">{t("No match data found.")}</p>
          <Link to="/" className="btn" style={{ width: "100%" }}>{t("Home")}</Link>
        </div>
      </div>
    );
  }

  const { drillTitle, tier, level, hero1, hero2, winnerIdx, winnerName, p1, p2 } = s;

  // ✅ IMPORTANT: build each side’s stats from its own payload (not the winner’s).
  const p1Pills = buildPills(p1);
  const p2Pills = buildPills(p2);

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="muted">
            {drillTitle} · {tier} {level}
          </div>
          <div className="title">
            {winnerName ? (
              <>
                {t("Winner")}: <strong>{winnerName}</strong>
              </>
            ) : (
              <>
                {t("It’s a")} <strong>{t("tie")}</strong>
              </>
            )}
          </div>
          <div className="subtitle">
            <p className="muted">{t("No XP is awarded in Versus Mode.")}</p>
          </div>
        </div>
      </section>

      <div
        className="versus-results"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <div
          className={`card versus-result-panel ${winnerIdx === 0 ? "winner" : ""} versus-hero-blue`}
          style={{ overflow: "hidden" }}
        >
          <div className="title" style={{ marginBottom: 2 }}>
            {hero1}
          </div>
          <StatPills pills={p1Pills} />
        </div>

        <div
          className={`card versus-result-panel ${winnerIdx === 1 ? "winner" : ""} versus-hero-red`}
          style={{ overflow: "hidden" }}
        >
          <div className="title" style={{ marginBottom: 2 }}>
            {hero2}
          </div>
          <StatPills pills={p2Pills} />
        </div>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <Link to="/versus" state={{ hero1, hero2 }} className="btn" style={{ flex: 1 }}>{t("Rematch")}</Link>
        <Link to="/" className="btn outline" style={{ flex: 1 }}>{t("Home")}</Link>
      </div>
    </div>
  );
}