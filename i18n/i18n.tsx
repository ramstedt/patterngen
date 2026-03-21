import React, { createContext, useContext, useMemo, useState } from "react";
import { translations } from "./translations";
import type { Lang, TranslationKey } from "./translations";

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLang(): Lang {
  const saved = localStorage.getItem("lang");
  if (saved === "sv" || saved === "en") return saved as Lang;

  const browser = navigator.language.toLowerCase();
  return browser.startsWith("sv") ? "sv" : "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getInitialLang());

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  const value = useMemo<I18nContextValue>(() => {
    return {
      lang,
      setLang,
      t: (key) => translations[lang][key],
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
