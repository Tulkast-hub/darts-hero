import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../theme/useTheme";
import RankBadge from "./RankBadge";
import { useXpStore } from "../xp/useXpStore";
import { getRankStateFromXp, XP_CAPS } from "../xp/rank";
import { useAuthStore } from "../auth/useAuthStore";
import { useAbortStore } from "../session/useAbortStore";
import HeroLogo from "../assets/img/hero.png";
import { useI18n } from "../i18n/I18nProvider";

export default function NavBar({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [theme, setTheme] = useTheme();
  const totalXp = useXpStore((s) => s.state.totalXp);
  const me = useAuthStore((s) => s.me);
  const { t, isDesktop } = useI18n();
  const name = me?.display_name || me?.login || t("Player");

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
          <button className="icon-btn" onClick={onMenu} aria-label={t("Open menu")}>
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
            aria-label={t("Back")}
          >
            ←
          </button>
        )}
      </div>

      <div className="nav-center">
                  <img
                    src={HeroLogo}
                    alt={t("Darts Hero logo")}
                    className="logo-large"
                  />
      </div>

      <div className="nav-right">
        <div>
        <button className="icon-btn" onClick={toggleTheme} aria-label={t("Theme")}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        <button className="icon-btn" onClick={() => nav("/profile")} aria-label={t("Profile")}>
          👤
        </button>
        </div>
        <div className="profile">
        <div className="nav-title">{name}</div>
        <div className="nav-subtitle">
          <RankBadge tier={overallRank.tier} level={overallRank.level} />
        </div>
        </div>
      </div>
    </header>
  );
}
