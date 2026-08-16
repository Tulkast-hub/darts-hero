import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";

export default function AssessmentDoubles() {
  const { t } = useI18n();
  const nav = useNavigate();

  const [target, setTarget] = useState(1);
  const [dartsThrown, setDartsThrown] = useState(0);
  const [history, setHistory] = useState<
    { target: number; hit: boolean }[]
  >([]);

  const complete = target > 20;

  const doublesHit = useMemo(
    () => history.filter((dart) => dart.hit).length,
    [history]
  );

  const percentage = useMemo(() => {
    if (!dartsThrown) return 0;

    return Math.round((doublesHit / dartsThrown) * 1000) / 10;
  }, [doublesHit, dartsThrown]);

  function recordDart(hit: boolean) {
    if (complete) return;

    setHistory((current) => [
      ...current,
      {
        target,
        hit,
      },
    ]);

    setDartsThrown((current) => current + 1);

    if (hit) {
      setTarget((current) => current + 1);
    }
  }

  function undo() {
    if (!history.length) return;

    const last = history[history.length - 1];

    setHistory((current) => current.slice(0, -1));
    setDartsThrown((current) => Math.max(0, current - 1));

    if (last.hit) {
      setTarget(last.target);
    }
  }

  function restart() {
    setTarget(1);
    setDartsThrown(0);
    setHistory([]);
  }

  return (
    <div className="page">
      <section className="hero card">
        <div>
          <div className="title">
            {t("Skills Assessment")} · {t("Doubles")}
          </div>

          <div className="subtitle">
            <h2>{t("Around the World – Doubles")}</h2>

            <p>
              {t(
                "Hit each double from 1 to 20. Every dart counts toward your doubles accuracy."
              )}
            </p>
          </div>
        </div>
      </section>

      {!complete ? (
        <>
          <div className="card">
            <div className="muted">{t("Current target")}</div>

            <div
              style={{
                fontSize: "3rem",
                fontWeight: 700,
                textAlign: "center",
                margin: "16px 0",
              }}
            >
              D{target}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <button
                type="button"
                className="btn outline"
                onClick={() => recordDart(false)}
              >
                {t("Miss")}
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => recordDart(true)}
              >
                {t("Hit")}
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="row">
              <div>
                <div className="muted">{t("Darts thrown")}</div>
                <strong>{dartsThrown}</strong>
              </div>

              <div>
                <div className="muted">{t("Doubles hit")}</div>
                <strong>{doublesHit}</strong>
              </div>

              <div>
                <div className="muted">{t("Accuracy")}</div>
                <strong>{percentage}%</strong>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 12,
            }}
          >
            <button
              type="button"
              className="btn outline"
              onClick={undo}
              disabled={!history.length}
            >
              {t("Undo")}
            </button>

            <button
              type="button"
              className="btn outline"
              onClick={restart}
            >
              {t("Restart")}
            </button>
          </div>
        </>
      ) : (
        <div className="card">
          <h2>{t("Doubles test complete")}</h2>

          <div style={{ marginTop: 16 }}>
            <div className="muted">{t("Doubles hit")}</div>
            <strong>20 / {dartsThrown}</strong>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="muted">{t("Doubles accuracy")}</div>
            <strong>{percentage}%</strong>
          </div>

          <button
            type="button"
            className="btn"
            style={{ width: "100%", marginTop: 20 }}
            onClick={() => nav("/skills-assessment")}
          >
            {t("Continue")}
          </button>
        </div>
      )}
    </div>
  );
}