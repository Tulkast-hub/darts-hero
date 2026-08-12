// src/shell/Shell.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigation } from "react-router-dom";
import NavBar from "../ui/NavBar";
import XPBar from "../ui/XPBar";
import MenuOverlay from "../ui/MenuOverlay";
import { useXpStore } from "../xp/useXpStore";
import type { Tier, XpCategory } from "../xp/types";
import { XP_CAPS } from "../xp/rank";
import { useI18n } from "../i18n/I18nProvider";

function slugToCategory(slug: string): XpCategory {
  switch (slug) {
    case "scoring":
      return "scoring";
    case "doubling":
      return "doubles";
    case "finishing":
      return "finishing";
    case "bull":
      return "bull";
    default:
      return "other";
  }
}

function prettyCategoryName(slug: string) {
  switch (slug) {
    case "scoring":
      return "Scoring";
    case "doubling":
      return "Doubling";
    case "finishing":
      return "Finishing";
    case "bull":
      return "Bull";
    default:
      return "Other";
  }
}



function shouldIgnoreKeyTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as any).isContentEditable) return true;
  return false;
}

export default function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, isDesktop } = useI18n();
  const loc = useLocation();
  const navigation = useNavigation();
  const xpState = useXpStore((s) => s.state);

  const isRouting =
    navigation.state === "loading" || navigation.state === "submitting";
  const path = loc.pathname;
  const isResultPage = path.startsWith("/result");
  const isVersus = path.startsWith("/versus");

  const footer = useMemo(() => {
    // Default: overall
    let label = t("Overall XP");
    let value = xpState.totalXp ?? 0;
    let max: number = XP_CAPS.overallTierMax;

    // Base tier for display in the footer bar.
    // Until you wire profile tier here, keep Bronze (tier promotion is derived by XPBar anyway).
    const baseTier: Tier = "Bronze";

    if (path.startsWith("/category/")) {
      const slug = path.split("/")[2] || "";
      const cat = slugToCategory(slug);

      label = `${t(prettyCategoryName(slug))} XP`;
      value = xpState.categoryXp?.[cat] ?? 0;
      max = XP_CAPS.categoryTierMax;
    } else if (path.startsWith("/drill/")) {
      const drillKey = path.split("/")[2] || "";
      label = `${t("Drill XP")} · ${drillKey}`;
      value = xpState.drillXp?.[drillKey] ?? 0;
      max = XP_CAPS.drillTierMax;
    }

    return { label, value, max, baseTier };
  }, [path, xpState, t]);


  React.useEffect(() => {
  if (!isDesktop) return;

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isDesktop) return;
    if (e.defaultPrevented) return;
    if (shouldIgnoreKeyTarget(e.target)) return;

    // Only handle numeric hotkeys when a drill hotkey root exists.
    const activeRoot = document.querySelector<HTMLElement>("[data-hotkeys='drill']");
    if (!activeRoot) return;

    const k = e.key;
    if (!/^[0-9]$/.test(k)) return;

    const el = activeRoot.querySelector<HTMLElement>(`[data-hotkey="${k}"]`);
    if (!el) return;

    e.preventDefault();
    el.click();
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [isDesktop, menuOpen, loc.pathname]);


  return (
    <div className="app-root">
      <div className={`app-frame ${isVersus ? "app-frame--versus" : ""}`.trim()}>
        <NavBar onMenu={() => setMenuOpen(true)} />

        <main className="app-main" style={{ position: "relative" }}>
          {isRouting && (
            <div className="page-loading-overlay">
              <div className="loader" />
            </div>
          )}

          <Outlet />
        </main>

        {!isResultPage && (
          <footer className="app-footer">
            <XPBar
              label={footer.label}
              value={footer.value}
              max={footer.max}
              baseTier={footer.baseTier}
            />
          </footer>
        )}
      </div>

      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
