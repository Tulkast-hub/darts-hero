import React, { useEffect } from "react";
import AppRouter from "./router";
import "./theme/global.css";
import { useAuthStore } from "./auth/useAuthStore";

export default function App(){
  const init = useAuthStore((s) => s.init);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    // Initialize auth session from WordPress cookies.
    void init();
  }, [init]);

  if (status === "unknown") {
    return (
      <div className="app-root">
        <div className="app-frame">
          <main className="app-main" style={{ display: "grid", placeItems: "center" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div className="loader" style={{ margin: "0 auto 12px" }} />
              <div className="muted">Loading…</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return <AppRouter />;
}
