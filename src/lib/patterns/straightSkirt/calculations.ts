import type { Profile } from '../../../types/measurements';
import { formatMeasurement, roundToHalf } from '../../measurements';
import type {
  PatternCalculation,
  Translate,
} from '../types';

type DartWidthCalculation = PatternCalculation & { section: 'dartWidth' };

function getStraightSkirtDartValues(difference: number) {
  if (difference >= 30) {
    return {
      front: 2,
      frontSecondary: 2,
      back: 3,
      backSecondary: 1.5,
      hipLineBackHalf: 1,
    };
  }

  if (difference >= 11) {
    return {
      front: 2,
      frontSecondary: 0,
      back: 3,
      backSecondary: 0,
      hipLineBackHalf: 1,
    };
  }

  if (difference >= 7) {
    return {
      front: 1.5,
      frontSecondary: 0,
      back: 2,
      backSecondary: 0,
      hipLineBackHalf: 0.7,
    };
  }

  return {
    front: 1,
    frontSecondary: 0,
    back: 1.5,
    backSecondary: 0,
    hipLineBackHalf: 0.5,
  };
}

export function calculateStraightSkirt(
  profile: Profile,
  t: Translate,
): PatternCalculation[] {
  const waist = roundToHalf(profile.measurements.waistCircumference);
  const highHip = roundToHalf(profile.measurements.hipCircumference);
  const hip = roundToHalf(profile.measurements.seatCircumference);
  const hipHeight = roundToHalf(profile.measurements.hipHeight);
  const hipDepth = roundToHalf(profile.measurements.hipDepth);
  const kneeHeight = roundToHalf(profile.measurements.kneeHeight);
  const waistToHipDifference = roundToHalf(hip - waist);

  const waistHalf = roundToHalf((waist + 2) / 2);
  const highHipHalf = roundToHalf((highHip + 2) / 2);
  const hipHalf = roundToHalf((hip + 2) / 2);
  const dartValues = getStraightSkirtDartValues(waistToHipDifference);
  const backDartPlacement = roundToHalf(
    waist / 10 + dartValues.back / 2,
  );
  const frontDartPlacement = roundToHalf(waist / 10 + 1);
  const sideLineWaist = roundToHalf(
    hipHalf -
      waistHalf -
      dartValues.front -
      dartValues.frontSecondary -
      dartValues.back -
      dartValues.backSecondary,
  );
  const sideLineHip = roundToHalf(
    hipHalf - highHipHalf - dartValues.hipLineBackHalf,
  );
  const dartWidthCalculations: DartWidthCalculation[] = [
    {
      id: 'frontDartWidth',
      label: t('frontDartWidth'),
      value: dartValues.front,
      explanation: t('frontDartWidthExplanation'),
      section: 'dartWidth' as const,
    },
    ...(dartValues.frontSecondary > 0
      ? [
          {
            id: 'frontDartWidthSecondary',
            label: t('frontDartWidthSecondary'),
            value: dartValues.frontSecondary,
            explanation: t('frontDartWidthSecondaryExplanation'),
            section: 'dartWidth' as const,
          },
        ]
      : []),
    {
      id: 'backDartWidth',
      label: t('backDartWidth'),
      value: dartValues.back,
      explanation: t('backDartWidthExplanation'),
      section: 'dartWidth' as const,
    },
    ...(dartValues.backSecondary > 0
      ? [
          {
            id: 'backDartWidthSecondary',
            label: t('backDartWidthSecondary'),
            value: dartValues.backSecondary,
            explanation: t('backDartWidthSecondaryExplanation'),
            section: 'dartWidth' as const,
          },
        ]
      : []),
    {
      id: 'backHipLineDartWidthHalf',
      label: t('backHipLineDartWidthHalf'),
      value: dartValues.hipLineBackHalf,
      explanation: t('backHipLineDartWidthHalfExplanation'),
      section: 'dartWidth' as const,
    },
  ];

  return [
    {
      id: 'waistCircumference',
      label: t('halfWaistWithEase'),
      value: waistHalf,
      description: `(${formatMeasurement(waist)} + 2) / 2 = ${formatMeasurement(
        waistHalf,
      )}`,
      explanation: t('waistCircumferenceExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'hipCircumference',
      label: t('halfHighHipWithEase'),
      value: highHipHalf,
      description: `(${formatMeasurement(highHip)} + 2) / 2 = ${formatMeasurement(
        highHipHalf,
      )}`,
      explanation: t('hipCircumferenceExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'seatCircumference',
      label: t('halfSeatWithEase'),
      value: hipHalf,
      description: `(${formatMeasurement(hip)} + 2) / 2 = ${formatMeasurement(
        hipHalf,
      )}`,
      explanation: t('seatCircumferenceExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'hipHeight',
      label: t('hipHeight'),
      value: hipHeight,
      description: `${formatMeasurement(hipHeight)}`,
      explanation: t('hipHeightExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'hipDepth',
      label: t('hipDepth'),
      value: hipDepth,
      description: `${formatMeasurement(hipDepth)}`,
      explanation: t('hipDepthExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'skirtLength',
      label: t('skirtLength'),
      value: kneeHeight,
      description: `${formatMeasurement(kneeHeight)}`,
      explanation: t('skirtLengthExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'backDartPlacement',
      label: t('backDartPlacement'),
      value: backDartPlacement,
      description: `(${formatMeasurement(waist)} / 10) + (${formatMeasurement(
        dartValues.back,
      )} / 2) = ${formatMeasurement(backDartPlacement)}`,
      explanation: t('backDartPlacementExplanation'),
      section: 'dartPlacement',
    },
    {
      id: 'frontDartPlacement',
      label: t('frontDartPlacement'),
      value: frontDartPlacement,
      description: `(${formatMeasurement(waist)} / 10) + 1 = ${formatMeasurement(
        frontDartPlacement,
      )}`,
      explanation: t('frontDartPlacementExplanation'),
      section: 'dartPlacement',
    },
    ...dartWidthCalculations,
    {
      id: 'sideLineWaist',
      label: t('sideLineWaist'),
      value: sideLineWaist,
      description: `${formatMeasurement(hipHalf)} - ${formatMeasurement(
        waistHalf,
      )} - ${formatMeasurement(dartValues.front)} - ${formatMeasurement(
        dartValues.back,
      )} = ${formatMeasurement(sideLineWaist)}`,
      explanation: t('sideLineWaistExplanation'),
      section: 'sideLine',
    },
    {
      id: 'sideLineHip',
      label: t('sideLineHip'),
      value: sideLineHip,
      description: `${formatMeasurement(hipHalf)} - ${formatMeasurement(
        highHipHalf,
      )} - ${formatMeasurement(dartValues.hipLineBackHalf)} = ${formatMeasurement(
        sideLineHip,
      )}`,
      explanation: t('sideLineHipExplanation'),
      section: 'sideLine',
    },
  ];
}
