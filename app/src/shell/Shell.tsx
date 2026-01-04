// src/shell/Shell.tsx
import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigation } from "react-router-dom";
import NavBar from "../ui/NavBar";
import XPBar from "../ui/XPBar";
import MenuOverlay from "../ui/MenuOverlay";
import { useXpStore } from "../xp/useXpStore";
import type { Tier, XpCategory } from "../xp/types";
import { XP_CAPS } from "../xp/rank";

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

export default function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();
  const navigation = useNavigation();
  const xpState = useXpStore((s) => s.state);

  const isRouting =
    navigation.state === "loading" || navigation.state === "submitting";
  const path = loc.pathname;
  const isResultPage = path.startsWith("/result");

  const footer = useMemo(() => {
    // Default: overall
    let label = "Overall XP";
    let value = xpState.totalXp ?? 0;
    let max: number = XP_CAPS.overallTierMax;

    // Base tier for display in the footer bar.
    // Until you wire profile tier here, keep Bronze (tier promotion is derived by XPBar anyway).
    const baseTier: Tier = "Bronze";

    if (path.startsWith("/category/")) {
      const slug = path.split("/")[2] || "";
      const cat = slugToCategory(slug);

      label = `${prettyCategoryName(slug)} XP`;
      value = xpState.categoryXp?.[cat] ?? 0;
      max = XP_CAPS.categoryTierMax;
    } else if (path.startsWith("/drill/")) {
      const drillKey = path.split("/")[2] || "";
      label = `Drill XP · ${drillKey}`;
      value = xpState.drillXp?.[drillKey] ?? 0;
      max = XP_CAPS.drillTierMax;
    }

    return { label, value, max, baseTier };
  }, [path, xpState]);

  return (
    <div className="app-root">
      <div className="app-frame">
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
