import type { PatternDefinition, PatternDraft } from '../types';
import { calculateBodiceWithDarts } from './calculations';

function createEmptyDraft(): PatternDraft {
  return {
    units: 'mm',
    width: 240,
    height: 240,
    points: [],
    markers: [],
    lines: [],
    paths: [],
    labels: [],
    notes: [],
  };
}

export const bodiceWithDartsPattern: PatternDefinition = {
  id: 'bodiceWithDarts',
  category: 'bodices',
  supportedProfileTypes: ['women'],
  requiredMeasurements: [
    'backWaistLength',
    'sideMeasurement',
    'bustCircumference',
    'bustPoint',
    'backWidth',
    'chestWidth',
    'frontWaistLength',
    'bustHeight',
    'sideHeight',
    'waistCircumference',
    'shoulderWidth',
    'neckCircumference',
    'shoulderHeightRightBack',
    'shoulderHeightRightFull',
    'shoulderHeightLeftBack',
    'shoulderHeightLeftFull',
  ],
  printConfig: { enabled: false },
  calculate(profile, t, settings) {
    const movementEase = settings?.movementEase;

    if (!movementEase) {
      return [];
    }

    return calculateBodiceWithDarts(profile, t, movementEase);
  },
  buildDraft() {
    return createEmptyDraft();
  },
};
