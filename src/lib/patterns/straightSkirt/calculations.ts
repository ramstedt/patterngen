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
  const highHip = roundToHalf(profile.measurements.highHipCircumference);
  const hip = roundToHalf(profile.measurements.hipCircumference);
  const hipHeight = roundToHalf(profile.measurements.hipHeight);
  const hipDepth = roundToHalf(profile.measurements.hipDepth);
  const kneeHeight = roundToHalf(profile.measurements.kneeHeight);
  const waistToHipDifference = roundToHalf(hip - waist);

  const waistHalf = roundToHalf((waist + 2) / 2);
  const highHipHalf = roundToHalf((highHip + 2) / 2);
  const hipHalf = roundToHalf((hip + 2) / 2);
  const dartValues = getStraightSkirtDartValues(waistToHipDifference);
  const backDartPlacement = roundToHalf(
    waistHalf / 10 + dartValues.back / 2,
  );
  const frontDartPlacement = roundToHalf(waistHalf / 10 + 1);
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
      description: '',
      section: 'dartWidth',
    },
    ...(dartValues.frontSecondary > 0
      ? [
          {
            id: 'frontDartWidthSecondary',
            label: t('frontDartWidthSecondary'),
            value: dartValues.frontSecondary,
            description: '',
            section: 'dartWidth' as const,
          },
        ]
      : []),
    {
      id: 'backDartWidth',
      label: t('backDartWidth'),
      value: dartValues.back,
      description: '',
      section: 'dartWidth',
    },
    ...(dartValues.backSecondary > 0
      ? [
          {
            id: 'backDartWidthSecondary',
            label: t('backDartWidthSecondary'),
            value: dartValues.backSecondary,
            description: '',
            section: 'dartWidth' as const,
          },
        ]
      : []),
    {
      id: 'backHipLineDartWidthHalf',
      label: t('backHipLineDartWidthHalf'),
      value: dartValues.hipLineBackHalf,
      description: '',
      section: 'dartWidth',
    },
  ];

  return [
    {
      id: 'waistCircumference',
      label: t('waistCircumference'),
      value: waistHalf,
      description: `(${formatMeasurement(waist)} + 2) / 2 = ${formatMeasurement(
        waistHalf,
      )}`,
      section: 'basicMeasurements',
    },
    {
      id: 'highHipCircumference',
      label: t('highHipCircumference'),
      value: highHipHalf,
      description: `(${formatMeasurement(highHip)} + 2) / 2 = ${formatMeasurement(
        highHipHalf,
      )}`,
      section: 'basicMeasurements',
    },
    {
      id: 'hipCircumference',
      label: t('hipCircumference'),
      value: hipHalf,
      description: `(${formatMeasurement(hip)} + 2) / 2 = ${formatMeasurement(
        hipHalf,
      )}`,
      section: 'basicMeasurements',
    },
    {
      id: 'hipHeight',
      label: t('hipHeight'),
      value: hipHeight,
      description: `${formatMeasurement(hipHeight)}`,
      section: 'basicMeasurements',
    },
    {
      id: 'hipDepth',
      label: t('hipDepth'),
      value: hipDepth,
      description: `${formatMeasurement(hipDepth)}`,
      section: 'basicMeasurements',
    },
    {
      id: 'skirtLength',
      label: t('skirtLength'),
      value: kneeHeight,
      description: `${formatMeasurement(kneeHeight)}`,
      section: 'basicMeasurements',
    },
    {
      id: 'backDartPlacement',
      label: t('backDartPlacement'),
      value: backDartPlacement,
      description: `(${formatMeasurement(waistHalf)} / 10) + (${formatMeasurement(
        dartValues.back,
      )} / 2) = ${formatMeasurement(backDartPlacement)}`,
      section: 'dartPlacement',
    },
    {
      id: 'frontDartPlacement',
      label: t('frontDartPlacement'),
      value: frontDartPlacement,
      description: `(${formatMeasurement(waistHalf)} / 10) + 1 = ${formatMeasurement(
        frontDartPlacement,
      )}`,
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
      section: 'sideLine',
    },
  ];
}
