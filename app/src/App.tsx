import React, { useEffect } from "react";
import AppRouter from "./router";
import "./theme/global.css";
import { useAuthStore } from "./auth/useAuthStore";
import { useI18n } from "./i18n/I18nProvider";


function applyInitialTheme() {
  try {
    const saved = localStorage.getItem("dh_theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.dataset.theme = saved;
      return;
    }
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = prefersDark ? "dark" : "light";
  } catch {
    // ignore
  }
}

function I18nLoading(){
  const { t } = useI18n();
  return <div className="muted">{t("Loading…")}</div>;
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    applyInitialTheme();
    // Initialize auth session from API cookie.
    void init();
  }, [init]);

  if (status === "unknown") {
    return (
      <div className="app-root">
        <div className="app-frame">
          <main className="app-main" style={{ display: "grid", placeItems: "center" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div className="loader" style={{ margin: "0 auto 12px" }} />
              <I18nLoading />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <AppRouter />
  );
}

