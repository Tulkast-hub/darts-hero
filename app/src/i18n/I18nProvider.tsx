import React from "react";
import { translations, type Lang } from "./translations";

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  isDesktop: boolean;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

function detectDesktop(): boolean {
  try {
    return !!window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    return false;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(() => {
    const saved = (localStorage.getItem("dh_lang") || "").toLowerCase();
    return saved === "ro" ? "ro" : "en";
  });
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => detectDesktop());

  React.useEffect(() => {
    try { localStorage.setItem("dh_lang", lang); } catch {}
  }, [lang]);

  React.useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
    if (!mq) return;
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    // safari uses addListener
    // @ts-ignore
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    // @ts-ignore
    else mq.addListener(onChange);
    return () => {
      // @ts-ignore
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      // @ts-ignore
      else mq.removeListener(onChange);
    };
  }, []);

  const setLang = React.useCallback((l: Lang) => setLangState(l), []);

  const t = React.useCallback(
    (key: string) => {
      if (lang === "en") return key;
      return translations[lang][key] || key;
    },
    [lang]
  );

  const value = React.useMemo(() => ({ lang, setLang, t, isDesktop }), [lang, setLang, t, isDesktop]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
