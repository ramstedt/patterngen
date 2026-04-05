import armholeDepthTable from '../../../data/armholeDepth.json';
import easeNoDarts from '../../../data/easeNoDarts.json';
import type { Profile } from '../../../types/measurements';
import { formatMeasurement, roundToHalf } from '../../measurements';
import type { PatternCalculation, Translate } from '../types';

function parseRange(range: string) {
  const [min, max] = range.split('-').map(Number);
  return { min, max };
}

function getArmholeDepthFromBust(bustCircumference: number) {
  const entry = armholeDepthTable.women.find((row) => {
    const { min, max } = parseRange(row.bustRange);
    return bustCircumference >= min && bustCircumference <= max;
  });

  if (!entry) {
    throw new Error('Could not find an armhole depth entry for the measured bust.');
  }

  return entry.armholeDepth;
}

function getEaseEntry(ease: number) {
  const entry = easeNoDarts.entries.find((row) => row.ease === ease);

  if (!entry) {
    throw new Error('Could not find the requested ease entry for bodice without darts.');
  }

  return entry;
}

function getFrontArmholeWidth(armholeWidth: number, ease: number) {
  if (ease >= 8 && ease <= 16) {
    return roundToHalf(armholeWidth / 2 + 0.25);
  }

  if (ease >= 18 && ease <= 36) {
    return roundToHalf(armholeWidth / 2 + 0.5);
  }

  throw new Error('Unsupported ease value for armhole width distribution.');
}

export function calculateBodiceWithoutDarts(
  profile: Profile,
  t: Translate,
  movementEase: number,
): PatternCalculation[] {
  const backWaistLength = roundToHalf(profile.measurements.backWaistLength);
  const measuredBust = roundToHalf(profile.measurements.bustCircumference);
  const measuredShoulderWidth = roundToHalf(profile.measurements.shoulderWidth);
  const measuredNeckCircumference = roundToHalf(
    profile.measurements.neckCircumference,
  );
  const easeEntry = getEaseEntry(movementEase);
  const armholeDepthFromTable = roundToHalf(getArmholeDepthFromBust(measuredBust));
  const armholeDepthEase = roundToHalf(easeEntry.bodice.armholeDepth);
  const armholeDepth = roundToHalf(armholeDepthFromTable + armholeDepthEase);
  const bustEase = roundToHalf(easeEntry.bodice.bustWidth);
  const shoulderWidthEase = roundToHalf(easeEntry.bodice.shoulderWidth);
  const shoulderWidthWithEase = roundToHalf(
    measuredShoulderWidth + shoulderWidthEase,
  );
  const neckWidthEase = roundToHalf(easeEntry.bodice.neckWidth);
  const neckWidthWithEase = roundToHalf(
    measuredNeckCircumference + neckWidthEase,
  );
  const neckWidth = roundToHalf(neckWidthWithEase / 5 - 1);
  const neckDepth = roundToHalf(neckWidthWithEase / 5 + 0.5);
  const backNecklineCheck = roundToHalf(neckWidthWithEase / 5 - 0.5);
  const frontNecklineCheck = roundToHalf(
    neckWidthWithEase / 2 - backNecklineCheck,
  );
  const bustWithEase = roundToHalf(measuredBust + bustEase);
  const halfBustWithEase = roundToHalf(bustWithEase / 2);
  const armholeWidthAdjustment =
    measuredBust < 110
      ? roundToHalf(easeEntry.bodice.armholeWidth.bustUnder110)
      : roundToHalf(easeEntry.bodice.armholeWidth.bustOverOrEqual110);
  const armholeWidthBase =
    measuredBust < 110
      ? roundToHalf(halfBustWithEase / 4)
      : roundToHalf(halfBustWithEase / 3);
  const armholeWidth = roundToHalf(armholeWidthBase + armholeWidthAdjustment);
  const frontArmholeWidth = getFrontArmholeWidth(
    armholeWidth,
    easeEntry.ease,
  );
  const backArmholeWidth = roundToHalf(armholeWidth - frontArmholeWidth);

  return [
    {
      id: 'backWaistLength',
      label: t('backWaistLength'),
      value: backWaistLength,
      description: `${formatMeasurement(backWaistLength)}`,
      explanation: t('backWaistLengthBodiceExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'armholeDepth',
      label: t('armholeDepth'),
      value: armholeDepth,
      description: `${formatMeasurement(armholeDepthFromTable)} + ${formatMeasurement(
        armholeDepthEase,
      )} = ${formatMeasurement(armholeDepth)}`,
      explanation: t('armholeDepthBodiceExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'halfBustWithEase',
      label: t('halfBustWithEase'),
      value: halfBustWithEase,
      description: `${formatMeasurement(measuredBust)} + ${formatMeasurement(
        bustEase,
      )} = ${formatMeasurement(bustWithEase)}, ${formatMeasurement(
        bustWithEase,
      )} / 2 = ${formatMeasurement(halfBustWithEase)}`,
      explanation: t('halfBustWithEaseExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'armholeWidth',
      label: t('armholeWidth'),
      value: armholeWidth,
      description:
        measuredBust < 110
          ? `${formatMeasurement(halfBustWithEase)} / 4 = ${formatMeasurement(
              armholeWidthBase,
            )}, ${formatMeasurement(armholeWidthBase)} ${armholeWidthAdjustment < 0 ? '-' : '+'} ${formatMeasurement(
              Math.abs(armholeWidthAdjustment),
            )} = ${formatMeasurement(armholeWidth)}`
          : `${formatMeasurement(halfBustWithEase)} / 3 = ${formatMeasurement(
              armholeWidthBase,
            )}, ${formatMeasurement(armholeWidthBase)} - ${formatMeasurement(
              Math.abs(armholeWidthAdjustment),
            )} = ${formatMeasurement(armholeWidth)}`,
      explanation: t('armholeWidthExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'frontArmholeWidth',
      label: t('frontArmholeWidth'),
      value: frontArmholeWidth,
      description:
        easeEntry.ease <= 16
          ? `${formatMeasurement(armholeWidth)} / 2 + 0.25 = ${formatMeasurement(
              frontArmholeWidth,
            )}`
          : `${formatMeasurement(armholeWidth)} / 2 + 0.5 = ${formatMeasurement(
              frontArmholeWidth,
            )}`,
      explanation: t('frontArmholeWidthExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'backArmholeWidth',
      label: t('backArmholeWidth'),
      value: backArmholeWidth,
      description: `${formatMeasurement(armholeWidth)} - ${formatMeasurement(
        frontArmholeWidth,
      )} = ${formatMeasurement(backArmholeWidth)}`,
      explanation: t('backArmholeWidthExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'shoulderWidthWithEase',
      label: t('shoulderWidth'),
      value: shoulderWidthWithEase,
      description: `${formatMeasurement(measuredShoulderWidth)} + ${formatMeasurement(
        shoulderWidthEase,
      )} = ${formatMeasurement(shoulderWidthWithEase)}`,
      explanation: t('shoulderWidthBodiceExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'neckWidthWithEase',
      label: t('neckCircumference'),
      value: neckWidthWithEase,
      description: `${formatMeasurement(measuredNeckCircumference)} + ${formatMeasurement(
        neckWidthEase,
      )} = ${formatMeasurement(neckWidthWithEase)}`,
      explanation: t('neckWidthBodiceExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'neckWidth',
      label: t('neckWidth'),
      value: neckWidth,
      description: `${formatMeasurement(neckWidthWithEase)} / 5 - 1 = ${formatMeasurement(
        neckWidth,
      )}`,
      explanation: t('neckWidthExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'neckDepth',
      label: t('neckDepth'),
      value: neckDepth,
      description: `${formatMeasurement(neckWidthWithEase)} / 5 + 0.5 = ${formatMeasurement(
        neckDepth,
      )}`,
      explanation: t('neckDepthExplanation'),
      section: 'basicMeasurements',
    },
    {
      id: 'backNecklineCheck',
      label: t('backNecklineCheck'),
      value: backNecklineCheck,
      description: `${formatMeasurement(neckWidthWithEase)} / 5 - 0.5 = ${formatMeasurement(
        backNecklineCheck,
      )}`,
      explanation: t('backNecklineCheckExplanation'),
      section: 'controlMeasurements',
    },
    {
      id: 'frontNecklineCheck',
      label: t('frontNecklineCheck'),
      value: frontNecklineCheck,
      description: `${formatMeasurement(neckWidthWithEase)} / 2 - ${formatMeasurement(
        backNecklineCheck,
      )} = ${formatMeasurement(frontNecklineCheck)}`,
      explanation: t('frontNecklineCheckExplanation'),
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
      id: 'frontInnerShoulderRise',
      label: t('frontInnerShoulderRise'),
      value: 2,
      description: '2',
      explanation: t('frontInnerShoulderRiseExplanation'),
      section: 'fixedMeasurements',
    },
    {
      id: 'backOuterShoulderDrop',
      label: t('backOuterShoulderDrop'),
      value: 2,
      description: '2',
      explanation: t('backOuterShoulderDropExplanation'),
      section: 'fixedMeasurements',
    },
    {
      id: 'frontOuterShoulderDrop',
      label: t('frontOuterShoulderDrop'),
      value: 3,
      description: '3',
      explanation: t('frontOuterShoulderDropExplanation'),
      section: 'fixedMeasurements',
    },
  ];
}
