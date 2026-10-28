return (
  <div className="bullout">
    {/* Header - NOT sticky */}
    <div className="bullout-header">
      <div>
        <div className="muted">
          Scoring ladder ·{" "}
          {MAX_THROWS} throws
        </div>
      </div>

      <div className="objective-pill objective-pill--desktop">
        <div className="objective-label">
          OBJECTIVE
        </div>

        <div className="objective-value">
          {rankConfig.goalSteps} steps
        </div>
      </div>
    </div>

    {/* Mobile objective goes into Shell */}
    {mobileObjectiveRoot &&
      createPortal(
        <div className="objective-pill objective-pill--mobile">
          <div className="objective-label">
            OBJECTIVE
          </div>

          <div className="objective-value">
            {rankConfig.goalSteps} steps
          </div>
        </div>,
        mobileObjectiveRoot
      )}

    {/* Main game area */}
    <div className="bullout-main">
      {/* Ladder visual */}
      <div
        className="card"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          className="ladder-viz hidden-sm"
          style={{
            width: "100%",
            maxWidth: 120,
            margin: "0 auto",
            height: 260,
            display: "flex",
            flexDirection: "column-reverse",
            gap: 4,
          }}
        >
          {Array.from({
            length: rankConfig.goalSteps,
          }).map((_, index) => {
            const reached =
              index <
              stats.currentStep;

            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  border:
                    "1px solid var(--text)",
                  borderRadius: 4,

                  backgroundColor:
                    reached
                      ? "var(--accent-green)"
                      : "transparent",

                  transition:
                    "background-color 0.15s",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div
        className="bullout-stats card"
        style={{
          flex: "0 0 280px",
          maxWidth: "100%",
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "column",
          justifyContent:
            "space-between",
        }}
      >
        <div
          className="row"
          style={{
            justifyContent:
              "space-between",
          }}
        >
          <div>
            <div className="small muted">
              Current step
            </div>

            <div className="title-lg">
              {stats.currentStep}
            </div>
          </div>

          <div>
            <div className="small muted">
              Throws left
            </div>

            <div className="title-lg">
              {throwsLeft}
            </div>
          </div>

          <div>
            <div className="small muted">
              Best step
            </div>

            <div className="title-lg">
              {stats.bestStep}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
          }}
        >
          <div className="row bullout-stat-row">
            <div className="pill pill-stat">
              <div className="pill-label">
                Accuracy
              </div>

              <div className="pill-value">
                {accuracy}%
              </div>
            </div>

            <div className="pill pill-stat">
              <div className="pill-label">
                Moves up
              </div>

              <div className="pill-value">
                {movesUp}
              </div>
            </div>

            <div className="pill pill-stat">
              <div className="pill-label">
                Moves down
              </div>

              <div className="pill-value">
                {stats.down}
              </div>
            </div>
          </div>

          <div
            className="row bullout-stat-row"
            style={{
              marginTop: 8,
            }}
          >
            <div className="pill pill-stat">
              <div className="pill-label">
                +1 steps
              </div>

              <div className="pill-value">
                {stats.up1}
              </div>
            </div>

            <div className="pill pill-stat">
              <div className="pill-label">
                +2 steps
              </div>

              <div className="pill-value">
                {stats.up2}
              </div>
            </div>

            <div className="pill pill-stat">
              <div className="pill-label">
                +3 steps
              </div>

              <div className="pill-value">
                {stats.up3}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Controls */}
    <div
      className="t20scoring-controls"
      data-hotkeys="drill"
      style={{
        marginTop: 16,
      }}
    >
      <div
        className="row"
        style={{
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="btn outline"
          disabled={!canPress}
          data-hotkey="1"
          style={{
            flex: 1,
            minWidth: 150,
          }}
          onClick={() =>
            recordBand("DOWN")
          }
        >
          {downLabel} (-1 step)
        </button>

        <button
          type="button"
          className="btn outline"
          disabled={!canPress}
          data-hotkey="2"
          style={{
            flex: 1,
            minWidth: 150,
          }}
          onClick={() =>
            recordBand("STAY")
          }
        >
          {stayLabel} (0 steps)
        </button>

        <button
          type="button"
          className="btn outline"
          disabled={!canPress}
          data-hotkey="3"
          style={{
            flex: 1,
            minWidth: 150,
          }}
          onClick={() =>
            recordBand("UP_1")
          }
        >
          {up1Label} (+1 step)
        </button>

        <button
          type="button"
          className="btn outline"
          disabled={!canPress}
          data-hotkey="4"
          style={{
            flex: 1,
            minWidth: 150,
          }}
          onClick={() =>
            recordBand("UP_2")
          }
        >
          {up2Label} (+2 steps)
        </button>

        <button
          type="button"
          className="btn outline"
          disabled={!canPress}
          data-hotkey="5"
          style={{
            flex: 1,
            minWidth: 150,
          }}
          onClick={() =>
            recordBand("UP_3")
          }
        >
          {up3Label} (+3 steps)
        </button>

        <button
          type="button"
          className="btn"
          disabled={!canUndo}
          data-hotkey="0"
          style={{
            flex: 1,
            minWidth: 150,
          }}
          onClick={handleUndo}
        >
          Undo
        </button>
      </div>
    </div>
  </div>
);