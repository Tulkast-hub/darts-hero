import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../api";
import { useAuthStore } from "../auth/useAuthStore";
import { useXpStore } from "../xp/useXpStore";
import { useI18n } from "../i18n/I18nProvider";

export default function MenuOverlay({open,onClose}:{open:boolean; onClose:()=>void}){
  const status = useAuthStore((s) => s.status);
  const { t, lang, setLang, isDesktop } = useI18n();
  const setGuest = useAuthStore((s) => s.setGuest);
  const navigate = useNavigate();

  async function onLogout() {
    try {
      await logout();
    } finally {
      // Clear local XP cache on logout so another user on the same device doesn't see it.
      useXpStore.getState().setState({
        totalXp: 0,
        categoryXp: { scoring: 0, finishing: 0, doubles: 0, bull: 0, other: 0 },
        drillXp: {},
      } as any);
      setGuest();
      onClose();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className={"overlay " + (open ? "open":"")} onClick={onClose}>
      <div className="overlay-panel" onClick={e=>e.stopPropagation()}>
        <h3>{t("Menu")}</h3>
        <nav className="menu-links">
          <Link to="/stats" onClick={onClose}>{t("Stats")}</Link>
          <Link to="/leaderboard" onClick={onClose}>{t("Leaderboard")}</Link>
          <Link to="/profile" onClick={onClose}>{t("Profile")}</Link>
          {/* <Link to="/rewards" onClick={onClose}>Rewards</Link> */}
        </nav>
        <div className="menu-lang">
          <div className="muted" style={{ marginTop: 10, marginBottom: 6 }}>
            {t("Language")}
          </div>

          <div className="lang-flags" role="group" aria-label={t("Language")}>
            <button
              type="button"
              className={"lang-flag" + (lang === "en" ? " active" : "")}
              onClick={() => setLang("en")}
              aria-label={t("English")}
              title={t("English")}
            >
              <span className="flag">🇬🇧</span>
            </button>

            <button
              type="button"
              className={"lang-flag" + (lang === "ro" ? " active" : "")}
              onClick={() => setLang("ro")}
              aria-label={t("Romanian")}
              title={t("Romanian")}
            >
              <span className="flag">🇷🇴</span>
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {status === "authed" && (
            <button className="btn outline" onClick={onLogout}>{t("Log out")}</button>
          )}
          <button className="btn outline" onClick={onClose}>{t("Close")}</button>
        </div>
      </div>
    </div>
  );
}
