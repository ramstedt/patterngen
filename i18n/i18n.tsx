import React, { useMemo, useState } from 'react';
import { I18nContext, type I18nContextValue } from './context';
import { translations } from './translations';
import type { Lang, TranslationKey } from './translations';

function getInitialLang(): Lang {
  const saved = localStorage.getItem('lang');
  if (saved === 'sv' || saved === 'en') return saved as Lang;

  const browser = navigator.language.toLowerCase();
  return browser.startsWith('sv') ? 'sv' : 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getInitialLang());

  const setLang = (nextLang: Lang) => {
    setLangState(nextLang);
    localStorage.setItem('lang', nextLang);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: TranslationKey) => translations[lang][key],
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
