import React from "react";
import { useI18n } from "../../i18n/I18nProvider";
import ThemeToggle from "../ThemeToggle";
import dhLogo from "../../assets/img/DH.png";


export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="app-root">
      <div className="app-frame">
        <main className="app-main" style={{ display: "grid", placeItems: "center" }}>
          <div style={{ width: "min(520px, 92vw)" }}>
            <div className="auth-topbar" style={{ marginBottom: 12 }}>
              <div className="auth-brand">
                  <img
                    src={dhLogo}
                    alt={t("Darts Hero icon")}
                    className="logo-small"
                  />
                <div>
                  <div style={{ fontWeight: 800, lineHeight: 1 }}>Darts Hero</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {subtitle || t("Sign in to continue")}
                  </div>
                </div>
              </div>
              <ThemeToggle />
            </div>

            <div className="card">
              <h2 className="page-title" style={{ marginBottom: 6 }}>{title}</h2>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
