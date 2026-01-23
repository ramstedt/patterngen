export type Lang = 'en' | 'sv';

export const translations = {
  en: {
    appName: 'PatternGen',
    measurements: 'Measurements',
    bust: 'Bust',
    waist: 'Waist',
    hip: 'Hip',
    generate: 'Generate pattern',
    language: 'Language',
  },
  sv: {
    appName: 'PatternGen',
    measurements: 'Mått',
    bust: 'Byst',
    waist: 'Midja',
    hip: 'Stuss',
    generate: 'Generera mönster',
    language: 'Språk',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
