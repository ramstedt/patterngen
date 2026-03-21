import type { Measurements } from '../types/measurements';

export type MeasurementGroup = 'upper' | 'lower';
export type MeasurementField = {
  key: keyof Measurements;
  group: MeasurementGroup;
};

export const MEASUREMENT_FIELDS: MeasurementField[] = [
  { key: 'backWaistLength', group: 'upper' },
  { key: 'totalLength', group: 'upper' },
  { key: 'backWidth', group: 'upper' },
  { key: 'neckCircumference', group: 'upper' },
  { key: 'bustCircumference', group: 'upper' },
  { key: 'waistCircumference', group: 'upper' },
  { key: 'hipCircumference', group: 'upper' },
  { key: 'hipDepth', group: 'upper' },
  { key: 'hipHeight', group: 'upper' },
  { key: 'highHipCircumference', group: 'upper' },
  { key: 'shoulderWidth', group: 'upper' },
  { key: 'armLength', group: 'upper' },
  { key: 'upperArmCircumference', group: 'upper' },
  { key: 'elbowCircumference', group: 'upper' },
  { key: 'wristCircumference', group: 'lower' },
  { key: 'chestWidth', group: 'lower' },
  { key: 'bustPoint', group: 'lower' },
  { key: 'frontWaistLength', group: 'lower' },
  { key: 'bustHeight', group: 'lower' },
  { key: 'sideHeight', group: 'lower' },
  { key: 'shoulderHeightRightBack', group: 'lower' },
  { key: 'shoulderHeightRightFull', group: 'lower' },
  { key: 'shoulderHeightLeftBack', group: 'lower' },
  { key: 'shoulderHeightLeftFull', group: 'lower' },
  { key: 'sideMeasurement', group: 'lower' },
  { key: 'kneeHeight', group: 'lower' },
  { key: 'trouserLength', group: 'lower' },
  { key: 'inseamLength', group: 'lower' },
  { key: 'rise', group: 'lower' },
  { key: 'crotchDepth', group: 'lower' },
];

type LegacyMeasurements = Partial<Measurements> & {
  shoulderHeight?: number;
  shoulderHeightBackFront?: number;
};

export function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
}

export function formatMeasurement(value: number) {
  const rounded = roundToHalf(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function createEmptyMeasurements(): Measurements {
  return Object.fromEntries(
    MEASUREMENT_FIELDS.map(({ key }) => [key, 0]),
  ) as Measurements;
}

export function normalizeMeasurements(
  measurements: LegacyMeasurements,
): Measurements {
  const shoulderHeight = measurements.shoulderHeight ?? 0;

  return {
    backWaistLength: measurements.backWaistLength ?? 0,
    totalLength: measurements.totalLength ?? 0,
    backWidth: measurements.backWidth ?? 0,
    neckCircumference: measurements.neckCircumference ?? 0,
    bustCircumference: measurements.bustCircumference ?? 0,
    waistCircumference: measurements.waistCircumference ?? 0,
    hipCircumference: measurements.hipCircumference ?? 0,
    hipDepth: measurements.hipDepth ?? 0,
    hipHeight: measurements.hipHeight ?? 0,
    highHipCircumference: measurements.highHipCircumference ?? 0,
    shoulderWidth: measurements.shoulderWidth ?? 0,
    armLength: measurements.armLength ?? 0,
    upperArmCircumference: measurements.upperArmCircumference ?? 0,
    elbowCircumference: measurements.elbowCircumference ?? 0,
    wristCircumference: measurements.wristCircumference ?? 0,
    chestWidth: measurements.chestWidth ?? 0,
    bustPoint: measurements.bustPoint ?? 0,
    frontWaistLength: measurements.frontWaistLength ?? 0,
    bustHeight: measurements.bustHeight ?? 0,
    sideHeight: measurements.sideHeight ?? 0,
    shoulderHeightRightBack:
      measurements.shoulderHeightRightBack ?? shoulderHeight,
    shoulderHeightRightFull:
      measurements.shoulderHeightRightFull ?? shoulderHeight,
    shoulderHeightLeftBack:
      measurements.shoulderHeightLeftBack ??
      measurements.shoulderHeightBackFront ??
      shoulderHeight,
    shoulderHeightLeftFull:
      measurements.shoulderHeightLeftFull ?? shoulderHeight,
    sideMeasurement: measurements.sideMeasurement ?? 0,
    kneeHeight: measurements.kneeHeight ?? 0,
    trouserLength: measurements.trouserLength ?? 0,
    inseamLength: measurements.inseamLength ?? 0,
    rise: measurements.rise ?? 0,
    crotchDepth: measurements.crotchDepth ?? 0,
  };
}
