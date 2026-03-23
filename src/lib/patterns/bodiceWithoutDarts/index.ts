import type { PatternDefinition } from '../types';

export const bodiceWithoutDartsPattern: PatternDefinition = {
  id: 'bodiceWithoutDarts',
  category: 'bodices',
  supportedProfileTypes: ['women'],
  requiredMeasurements: [],
  calculate() {
    return [];
  },
  buildDraft(_profile, t) {
    return {
      units: 'mm',
      width: 720,
      height: 420,
      points: [],
      lines: [],
      paths: [],
      labels: [
        {
          id: 'comingSoon',
          text: t('patternInPreparation'),
          x: 360,
          y: 210,
        },
      ],
    };
  },
};
