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
        <div className="game-surface assessment-surface">
          <div className="bullout-header">
            <div>
              <div className="muted">
                {t("Double")} {target} · {t("Target")} {target} {t("of")} 20
              </div>
  
              <div className="muted">
                {t("Hit the current double to move to the next number.")}
              </div>
            </div>
  
            <div className="objective-pill">
              <div className="objective-label">{t("Accuracy")}</div>
              <div className="objective-value">{percentage}%</div>
            </div>
          </div>
  
          <AssessmentDoublesBoard number={target} />
  
          <div className="bullout-main aw-main">
            <div className="bullout-controls" data-hotkeys="drill">
              <button
                type="button"
                className="btn success"
                data-hotkey="1"
                onClick={() => recordDart(true)}
              >
                {t("Double hit")}
              </button>
  
              <button
                type="button"
                className="btn outline"
                data-hotkey="2"
                onClick={() => recordDart(false)}
              >
                {t("Miss")}
              </button>
  
              <button
                type="button"
                className="btn outline"
                data-hotkey="0"
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
  
            <div className="bullout-stats card">
              <div
                className="row"
                style={{ justifyContent: "space-between" }}
              >
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div className="title-lg">{dartsThrown}</div>
                  <div className="muted">{t("Darts thrown")}</div>
                </div>
  
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div className="title-lg">{doublesHit}</div>
                  <div className="muted">{t("Doubles hit")}</div>
                </div>
  
                <div style={{ textAlign: "center", flex: 1 }}>
                    <div className="title-lg">D{target}</div>
                    <div className="muted">{t("Current target")}</div>
                </div>
              </div>
  
              <div style={{ marginTop: 12 }}>
                <div className="row bullout-stat-row">
                  <div className="pill pill-stat">
                    <div className="pill-label">{t("Accuracy")}</div>
                    <div className="pill-value">{percentage}%</div>
                  </div>
  
                  <div className="pill pill-stat">
                    <div className="pill-label">{t("Completed")}</div>
                    <div className="pill-value">
                        {doublesHit} / 20
                    </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card result-card">
          <div className="result-main">
            <h2 className="result-status">
              {t("Doubles test complete")}
            </h2>
  
            <div className="result-stats">
              <div className="row bullout-stat-row">
                <div className="pill pill-stat">
                  <div className="pill-label">{t("Darts thrown")}</div>
                  <div className="pill-value">{dartsThrown}</div>
                </div>
  
                <div className="pill pill-stat">
                  <div className="pill-label">{t("Doubles hit")}</div>
                  <div className="pill-value">{doublesHit}</div>
                </div>
  
                <div className="pill pill-stat">
                  <div className="pill-label">{t("Accuracy")}</div>
                  <div className="pill-value">{percentage}%</div>
                </div>
              </div>
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
        </div>
      )}
    </div>
  );

  function AssessmentDoublesBoard({ number }: { number: number }) {
    const BOARD_ORDER = [
      20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
      3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
    ];
  
    const index = BOARD_ORDER.indexOf(number);
    const segmentIndex = index === -1 ? 0 : index;
  
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const segmentLength = circumference / 20;
  
    const segmentAngle = 360 / 20;
    const baseOffset = -90 - segmentAngle / 2;
    const rotation = segmentIndex * segmentAngle + baseOffset;
  
    return (
      <div className="bull-board-wrapper assessment-board">
        <svg
          viewBox="0 0 120 120"
          className="bull-board"
          aria-hidden="true"
        >
          <circle cx="60" cy="60" r="58" fill="#020617" />
          <circle cx="60" cy="60" r="50" fill="#020617" />
          <circle cx="60" cy="60" r="40" fill="#020617" />
  
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="#0f172a"
            strokeWidth="8"
          />
  
          <circle
            cx="60"
            cy="60"
            r="32"
            fill="none"
            stroke="#020617"
            strokeWidth="10"
          />
  
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#0b1120"
            strokeWidth="8"
          />
  
          <g transform={`rotate(${rotation} 60 60)`}>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#00c46a"
              strokeWidth="8"
              strokeDasharray={`${segmentLength} ${
                circumference - segmentLength
              }`}
            />
          </g>
  
          <circle cx="60" cy="60" r="22" fill="#020617" />
  
          <text
            x="60"
            y="59"
            textAnchor="middle"
            fontSize="20"
            fill="#f9fafb"
            fontWeight="700"
          >
            D{number}
          </text>
  
          <text
            x="60"
            y="75"
            textAnchor="middle"
            fontSize="9"
            fill="#9ca3af"
          >
            Double ring
          </text>
        </svg>
      </div>
    );
  }