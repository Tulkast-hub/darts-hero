import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../theme/useTheme";
import RankBadge from "./RankBadge";
import { useXpStore } from "../xp/useXpStore";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
import { useAuthStore } from "../auth/useAuthStore";
import { useAbortStore } from "../session/useAbortStore";

export default function NavBar({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [theme, setTheme] = useTheme();
  const totalXp = useXpStore((s) => s.state.totalXp);
  const me = useAuthStore((s) => s.me);
  const name = me?.display_name || me?.login || "Player";

  const pathname = loc.pathname;
  const isHome = pathname === "/" || pathname === "";
  const abortHandler = useAbortStore((s) => s.handler);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const overallRank = useMemo(
    () => getRankStateFromXp(totalXp ?? 0, XP_CAPS.overallTierMax, "Bronze"),
    [totalXp]
  );

  return (
    <header className="nav">
      <div className="nav-left">
        {isHome ? (
          <button className="icon-btn" onClick={onMenu} aria-label="Open menu">
            ☰
          </button>
        ) : (
          <button
            className="icon-btn"
            onClick={() => {
              if (pathname.startsWith("/drill/") && abortHandler) {
                abortHandler();
              } else {
                nav(-1);
              }
            }}
            aria-label="Back"
          >
            ←
          </button>
        )}
      </div>

      <div className="nav-center">
        <div className="nav-title">{name}</div>
        <div className="nav-subtitle">
          <RankBadge tier={overallRank.tier} level={overallRank.level} />
        </div>
      </div>

      <div className="nav-right">
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        <button className="icon-btn" onClick={() => nav("/profile")} aria-label="Profile">
          👤
        </button>
      </div>
    </header>
  );
}
