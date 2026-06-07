import easeWithDarts from '../../../data/easeWithDarts.json';
import type { Profile } from '../../../types/measurements';
import { formatMeasurement, roundToHalf } from '../../measurements';
import type { PatternCalculation, Translate } from '../types';

function getEaseEntry(ease: number) {
  const entry = easeWithDarts.entries.find((row) => row.ease === ease);

  if (!entry) {
    throw new Error('Could not find the requested ease entry for bodice with darts.');
  }

  return entry;
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateBodiceWithDarts(
  profile: Profile,
  t: Translate,
  movementEase: number,
): PatternCalculation[] {
  const easeEntry = getEaseEntry(movementEase);
  const backWaistLength = roundToHalf(profile.measurements.backWaistLength);
  const sideMeasurement = roundToHalf(profile.measurements.sideMeasurement);
  const bustCircumference = roundToHalf(profile.measurements.bustCircumference);
  const bustPoint = roundToHalf(profile.measurements.bustPoint);
  const backWidth = roundToHalf(profile.measurements.backWidth);
  const chestWidth = roundToHalf(profile.measurements.chestWidth);
  const frontWaistLength = roundToHalf(profile.measurements.frontWaistLength);
  const bustHeight = roundToHalf(profile.measurements.bustHeight);
  const sideHeight = roundToHalf(profile.measurements.sideHeight);
  const waistCircumference = roundToHalf(profile.measurements.waistCircumference);
  const shoulderWidth = roundToHalf(profile.measurements.shoulderWidth);
  const neckCircumference = roundToHalf(profile.measurements.neckCircumference);
  const rightShoulderHeightBack = roundToHalf(
    profile.measurements.shoulderHeightRightBack,
  );
  const rightShoulderHeightFull = roundToHalf(
    profile.measurements.shoulderHeightRightFull,
  );
  const leftShoulderHeightBack = roundToHalf(
    profile.measurements.shoulderHeightLeftBack,
  );
  const leftShoulderHeightFull = roundToHalf(
    profile.measurements.shoulderHeightLeftFull,
  );
  const armholeDepthEase = easeEntry.bodice.armholeDepth;
  const bustWidthEase = easeEntry.bodice.bustWidth;
  const backWidthEase = easeEntry.bodice.backOrChestWidth;
  const shoulderWidthEase = easeEntry.bodice.shoulderWidth;
  const neckWidthEase = easeEntry.bodice.neckWidth;
  const armholeDepth = roundToHalf(
    backWaistLength - sideMeasurement + 2 + armholeDepthEase,
  );
  const bustWidthWithEase = roundToHalf(bustCircumference + bustWidthEase);
  const halfBustWithEase = roundToHalf(bustWidthWithEase / 2);
  const chestWidthWithEase = roundToHalf(chestWidth + backWidthEase);
  const halfChestWidthWithEase = roundToHalf(chestWidthWithEase / 2);
  const waistWidthEase = roundToHalf(getAverage(easeEntry.bodice.waistWidthRange));
  const waistWidthWithEase = roundToHalf(waistCircumference + waistWidthEase);
  const halfWaistWithEase = roundToHalf(waistWidthWithEase / 2);
  const bustPointWidth = roundToHalf(
    movementEase >= 2 && movementEase <= 10
      ? bustPoint / 2
      : bustWidthWithEase / 10,
  );
  const backWidthWithEase = roundToHalf(backWidth + backWidthEase);
  const halfBackWidthWithEase = roundToHalf(backWidthWithEase / 2);
  const selectedShoulderHeights =
    rightShoulderHeightFull >= leftShoulderHeightFull
      ? {
          back: rightShoulderHeightBack,
          full: rightShoulderHeightFull,
        }
      : {
          back: leftShoulderHeightBack,
          full: leftShoulderHeightFull,
        };
  const shoulderHeightBack = selectedShoulderHeights.back;
  const shoulderHeightFront = roundToHalf(
    selectedShoulderHeights.full - selectedShoulderHeights.back,
  );
  const sideHeightWithEase = roundToHalf(sideHeight + 3);
  const shoulderWidthWithEase = roundToHalf(shoulderWidth + shoulderWidthEase);
  const neckWidthWithEase = roundToHalf(neckCircumference + neckWidthEase);
  const neckWidth = roundToHalf(neckWidthWithEase / 5 - 1);
  const neckDepth = roundToHalf(
    neckWidthWithEase / 5 + (movementEase >= 2 && movementEase <= 10 ? 1 : 0.5),
  );
  const backNeck = roundToHalf(neckWidthWithEase / 5 - 0.5);
  const backNecklineCheck = roundToHalf(neckWidthWithEase / 5 - 0.5);
  const frontNecklineCheck = roundToHalf(
    neckWidthWithEase / 2 - backNecklineCheck,
  );
  const armholeWidth =
    bustCircumference < 110
      ? roundToHalf(
          halfBustWithEase / 4 + easeEntry.bodice.armholeWidth.bustUnder110,
        )
      : roundToHalf(
          halfBustWithEase / 3 +
            easeEntry.bodice.armholeWidth.bustOverOrEqual110,
        );

  return [
    {
      id: 'backWaistLength',
      label: t('backWaistLength'),
      value: backWaistLength,
      description: `${formatMeasurement(backWaistLength)}`,
      explanation: t('backWaistLengthBodiceWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'armholeDepth',
      label: t('armholeDepth'),
      value: armholeDepth,
      description: `${formatMeasurement(backWaistLength)} - ${formatMeasurement(sideMeasurement)} + 2 + ${formatMeasurement(armholeDepthEase)}`,
      explanation: t('armholeDepthWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'frontWaistLength',
      label: t('frontWaistLength'),
      value: frontWaistLength,
      description: `${formatMeasurement(frontWaistLength)}`,
      explanation: t('frontWaistLengthWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'bustHeight',
      label: t('bustHeight'),
      value: bustHeight,
      description: `${formatMeasurement(bustHeight)}`,
      explanation: t('bustHeightWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'sideHeight',
      label: t('sideHeight'),
      value: sideHeightWithEase,
      description: `${formatMeasurement(sideHeight)} + 3`,
      explanation: t('sideHeightWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'halfBustWithEase',
      label: t('halfBustWithEase'),
      value: halfBustWithEase,
      description: `(${formatMeasurement(bustCircumference)} + ${formatMeasurement(bustWidthEase)}) / 2`,
      explanation: t('halfBustWithEaseExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'halfWaistWithEase',
      label: t('halfWaistWithEase'),
      value: halfWaistWithEase,
      description: `(${formatMeasurement(waistCircumference)} + ${formatMeasurement(waistWidthEase)}) / 2`,
      explanation: t('halfWaistWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'shoulderHeightBack',
      label: t('shoulderHeightBack'),
      value: shoulderHeightBack,
      description: `${formatMeasurement(shoulderHeightBack)}`,
      explanation: t('shoulderHeightBackWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'shoulderHeightFront',
      label: t('shoulderHeightFront'),
      value: shoulderHeightFront,
      description: `${formatMeasurement(selectedShoulderHeights.full)} - ${formatMeasurement(selectedShoulderHeights.back)}`,
      explanation: t('shoulderHeightFrontWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'bustPointWidth',
      label: t('bustPoint'),
      value: bustPointWidth,
      description:
        movementEase >= 2 && movementEase <= 10
          ? `${formatMeasurement(bustPoint)} / 2`
          : `${formatMeasurement(bustWidthWithEase)} / 10`,
      explanation: t('bustPointWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'halfBackWidthWithEase',
      label: t('halfBackWidthWithEase'),
      value: halfBackWidthWithEase,
      description: `(${formatMeasurement(backWidth)} + ${formatMeasurement(backWidthEase)}) / 2`,
      explanation: t('halfBackWidthWithEaseExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'armholeWidth',
      label: t('armholeWidth'),
      value: armholeWidth,
      description:
        bustCircumference < 110
          ? `${formatMeasurement(halfBustWithEase)} / 4 ${easeEntry.bodice.armholeWidth.bustUnder110 < 0 ? '-' : '+'} ${formatMeasurement(Math.abs(easeEntry.bodice.armholeWidth.bustUnder110))}`
          : `${formatMeasurement(halfBustWithEase)} / 3 - ${formatMeasurement(Math.abs(easeEntry.bodice.armholeWidth.bustOverOrEqual110))}`,
      explanation: t('armholeWidthWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'shoulderWidthWithEase',
      label: t('shoulderWidth'),
      value: shoulderWidthWithEase,
      description: `${formatMeasurement(shoulderWidth)} + ${formatMeasurement(shoulderWidthEase)}`,
      explanation: t('shoulderWidthWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'neckWidthWithEase',
      label: t('neckWidthBodice'),
      value: neckWidthWithEase,
      description: `${formatMeasurement(neckCircumference)} + ${formatMeasurement(neckWidthEase)}`,
      explanation: t('neckWidthWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'neckWidth',
      label: t('neckWidth'),
      value: neckWidth,
      description: `${formatMeasurement(neckWidthWithEase)} / 5 - 1`,
      explanation: t('neckWidthExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'neckDepth',
      label: t('neckDepth'),
      value: neckDepth,
      description:
        movementEase >= 2 && movementEase <= 10
          ? `${formatMeasurement(neckWidthWithEase)} / 5 + 1`
          : `${formatMeasurement(neckWidthWithEase)} / 5 + 0.5`,
      explanation: t('neckDepthWithDartsExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'backNeck',
      label: t('backNeck'),
      value: backNeck,
      description: `${formatMeasurement(neckWidthWithEase)} / 5 - 0.5`,
      explanation: t('backNeckExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'backNecklineCheck',
      label: t('backNecklineCheck'),
      value: backNecklineCheck,
      description: `${formatMeasurement(neckWidthWithEase)} / 5 - 0.5`,
      explanation: t('backNecklineCheckExplanation'),
      section: 'controlMeasurements',
    },
    {
      id: 'frontNecklineCheck',
      label: t('frontNecklineCheck'),
      value: frontNecklineCheck,
      description: `${formatMeasurement(neckWidthWithEase)} / 2 - ${formatMeasurement(backNecklineCheck)}`,
      explanation: t('frontNecklineCheckExplanation'),
      section: 'controlMeasurements',
    },
    {
      id: 'halfChestWidthWithEase',
      label: t('halfChestWidthWithEase'),
      value: halfChestWidthWithEase,
      description: `(${formatMeasurement(chestWidth)} + ${formatMeasurement(backWidthEase)}) / 2`,
      explanation: t('halfChestWidthWithDartsExplanation'),
      section: 'controlMeasurements',
    },
    {
      id: 'backInnerShoulderRise',
      label: t('backInnerShoulderRise'),
      value: 2,
      description: '2',
      explanation: t('backInnerShoulderRiseExplanation'),
      section: 'fixedMeasurements',
    },
    {
      id: 'backShoulderDart',
      label: t('backShoulderDart'),
      value: 2,
      description: '2',
      explanation: t('backShoulderDartExplanation'),
      section: 'fixedMeasurements',
    },
  ];
}
