// src/components/InstallAppButton.tsx
import React, { useState } from "react";
import { usePwaInstallPrompt } from "../pwa/usePwaInstallPrompt";

function AndroidIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path
        fill="currentColor"
        d="M17.6 9.48l1.43-2.48a.5.5 0 0 0-.18-.68.5.5 0 0 0-.68.18l-1.48 2.56a8.2 8.2 0 0 0-9.38 0L5.83 6.5a.5.5 0 1 0-.86.5L6.4 9.48A7.43 7.43 0 0 0 4 15v4a2 2 0 0 0 2 2h1v-3a1 1 0 1 1 2 0v3h6v-3a1 1 0 1 1 2 0v3h1a2 2 0 0 0 2-2v-4a7.43 7.43 0 0 0-2.4-5.52ZM8 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm8 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
      />
    </svg>
  );
}

export default function InstallAppButton() {
  const { showButton, canPrompt, promptInstall } = usePwaInstallPrompt();
  const [hint, setHint] = useState<string | null>(null);

  if (!showButton) return null;

  async function onClick() {
    setHint(null);

    if (canPrompt) {
      await promptInstall();
      return;
    }

    // Fallback: Chrome didn't give us the event (common after refresh).
    // We can't trigger the prompt programmatically, so show instructions.
    setHint("To install: open your browser menu (⋮) and tap “Install app” / “Add to Home screen”.");
  }

  return (
    <div style={{ position: "sticky", bottom: 0, paddingTop: 12, display: "flex", flexDirection: "column", alignItems: "center", }}>
      <button
        className="btn"
        style={{
          width: "100%",
          maxWidth: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderRadius: 1,
        }}
        onClick={() => void onClick()}
        type="button"
      >
        <AndroidIcon />
        Install the app
      </button>
      <div className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 8 }}>
        Available on Android Chrome (and desktop Chrome).
      </div>
    </div>
  );
}
