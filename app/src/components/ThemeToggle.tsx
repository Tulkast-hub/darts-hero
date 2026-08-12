import React, { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";
const KEY = "dh_theme";

function getTheme(): ThemeMode {
  const saved = localStorage.getItem(KEY) as ThemeMode | null;
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode; // <html data-theme="dark">
  localStorage.setItem(KEY, mode);
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const t = getTheme();
    setMode(t);
    applyTheme(t);
  }, []);

  function toggle() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      className="btn outline"
      onClick={toggle}
      title="Toggle theme"
      aria-label="Toggle theme"
      style={{ paddingInline: 10 }}
    >
      {mode === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
