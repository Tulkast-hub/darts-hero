export type ThemeMode = "light" | "dark";

const KEY = "dh_theme";

export function getTheme(): ThemeMode {
  const v = (localStorage.getItem(KEY) as ThemeMode | null) ?? null;
  if (v === "light" || v === "dark") return v;
  // Default: follow system on first load, but store a concrete value.
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode; // <html data-theme="dark">
  localStorage.setItem(KEY, mode);
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
