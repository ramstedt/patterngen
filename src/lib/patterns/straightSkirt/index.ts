import { calculateStraightSkirt } from './calculations';
import { buildStraightSkirtDraft } from './draft';
import type {
  PatternDefinition,
} from '../types';

export const straightSkirtPattern: PatternDefinition = {
  id: 'straightSkirt',
  category: 'skirts',
  supportedProfileTypes: ['women'],
  requiredMeasurements: [
    'waistCircumference',
    'hipCircumference',
    'seatCircumference',
    'hipHeight',
    'hipDepth',
    'kneeHeight',
  ],
  calculate(profile, t) {
    return calculateStraightSkirt(profile, t);
  },
  buildPrintConfig(profile, t) {
    const waistToHipDifference =
      profile.measurements.seatCircumference - profile.measurements.waistCircumference;
    const showSmallDartWaistbandNote = waistToHipDifference <= 6;

    return {
      enabled: true,
      calibrationSquareMm: 50,
      calibrationLabel: t('pdfTestSquareLabel'),
      pageMarginMm: 8,
      pageOverlapMm: 10,
      patternPaddingXMm: 18,
      patternPaddingBottomMm: 18,
      calibrationSquareTopMm: 12,
      calibrationSquareLeftMm: 18,
      firstPageInstructions: {
        title: t('pdfPrintingInstructionsTitle'),
        items: [
          t('pdfPrintingInstructionScale'),
          t('pdfPrintingInstructionMeasure'),
          t('pdfPrintingInstructionAssemble'),
          ...(showSmallDartWaistbandNote
            ? [t('pdfPrintingInstructionSmallDartsWaistband')]
            : []),
        ],
        leftMm: 82,
        topMm: 14,
        widthMm: 108,
        lineHeightMm: 5.5,
      },
    };
  },
  buildDraft(profile, t) {
    const calculations = calculateStraightSkirt(profile, t);
    return buildStraightSkirtDraft(profile, t, calculations);
  },
};
