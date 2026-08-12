import React, { useMemo, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { DRILLS, type DrillKey } from "../drills/registry";
import type { Tier } from "../xp/types";
import { useI18n } from "../i18n/I18nProvider";

const TIERS: Tier[] = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

export default function VersusSetupPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const location = useLocation();
  const prefill = (location.state || {}) as { hero1?: string; hero2?: string };

  const drillOptions = useMemo(() => DRILLS, []);
  const [drillKey, setDrillKey] = useState<DrillKey>(drillOptions[0].key);
  const [tier, setTier] = useState<Tier>("Bronze");
  const [hero1, setHero1] = useState<string>(prefill.hero1 ?? t("Hero 1"));
  const [hero2, setHero2] = useState<string>(prefill.hero2 ?? t("Hero 2"));

  function start() {
    nav(`/versus/play/${drillKey}`,
      {
        state: {
          tier,
          level: 1,
          hero1: hero1.trim() || t("Hero 1"),
          hero2: hero2.trim() || t("Hero 2"),
        },
      }
    );
  }

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="title">{t("Versus Mode")}</div>
          <div className="subtitle">
            <h2>{t("Set up a hotseat match")}</h2>
            <p>{t("Select a drill, pick a tier, and enter your heroes.")}</p>
          </div>
        </div>
      </section>

      <div className="card" style={{ marginTop: 12 }}>
        <label className="muted">{t("Game (Drill)")}</label>
        <select
          className="input"
          value={drillKey}
          onChange={(e) => setDrillKey(e.target.value as DrillKey)}
          style={{ width: "100%", marginTop: 6 }}
        >
          {drillOptions.map((d) => (
            <option key={d.key} value={d.key}>
              {d.title}
            </option>
          ))}
        </select>

        <div style={{ marginTop: 12 }}>
          <label className="muted">{t("Tier")}</label>
          <select
            className="input"
            value={tier}
            onChange={(e) => setTier(e.target.value as Tier)}
            style={{ width: "100%", marginTop: 6 }}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="muted">{t("Hero 1")}</label>
          <input
            className="input versus-setup-hero1"
            value={hero1}
            onChange={(e) => setHero1(e.target.value)}
            placeholder={t("Hero 1")}
            style={{ width: "100%", marginTop: 6 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="muted">{t("Hero 2")}</label>
          <input
            className="input versus-setup-hero2"
            value={hero2}
            onChange={(e) => setHero2(e.target.value)}
            placeholder={t("Hero 2")}
            style={{ width: "100%", marginTop: 6 }}
          />
        </div>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <Link to="/" className="btn outline" style={{ flex: 1 }}>
          Back
        </Link>
        <button className="btn" style={{ flex: 1 }} onClick={start}>
          Start
        </button>
      </div>
    </div>
  );
}