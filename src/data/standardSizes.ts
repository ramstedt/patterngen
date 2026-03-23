import womenChart from './standardSizesWomen168.json';
import menChart from './standardSizesMen176.json';
import type { Measurements } from '../types/measurements';

type StandardChartRow = Record<string, number | null | undefined>;
type StandardMeasurementDefaults = Partial<Measurements>;

const WOMEN_FALLBACK_MEASUREMENTS: StandardMeasurementDefaults = {
  sideHeight: 0,
  shoulderHeightRightBack: 0,
  shoulderHeightRightFull: 0,
  shoulderHeightLeftBack: 0,
  shoulderHeightLeftFull: 0,
  sideMeasurement: 0,
  chestWidth: 0,
  crotchDepth: 0,
};

const MEN_FALLBACK_MEASUREMENTS: StandardMeasurementDefaults = {
  totalLength: 0,
  hipHeight: 0,
  hipDepth: 0,
  sideHeight: 0,
  shoulderHeightRightBack: 0,
  shoulderHeightRightFull: 0,
  shoulderHeightLeftBack: 0,
  shoulderHeightLeftFull: 0,
  sideMeasurement: 0,
  bustHeight: 0,
  bustPoint: 0,
};

function getChartValue<T extends StandardChartRow, K extends string>(
  row: T | undefined,
  size: K,
): number {
  if (!row) return 0;
  const value = row[size as keyof T];
  return typeof value === 'number' ? value : 0;
}

export type StandardSize = keyof typeof womenChart.rows.bustCircumference;

export function measurementsFromStandardSize(
  size: StandardSize,
): Partial<Measurements> {
  const r = womenChart.rows;

  return {
    ...WOMEN_FALLBACK_MEASUREMENTS,
    bustCircumference: getChartValue(r.bustCircumference, size),
    waistCircumference: getChartValue(r.waistCircumference, size),
    highHipCircumference: getChartValue(r.highHipCircumference, size),
    hipCircumference: getChartValue(r.hipCircumference, size),
    backWaistLength: getChartValue(r.backWaistLength, size),
    backWidth: getChartValue(r.backWidth, size),
    shoulderWidth: getChartValue(r.shoulderWidth, size),
    neckCircumference: getChartValue(r.neckCircumference, size),
    frontWaistLength: getChartValue(r.frontWaistLength, size),
    bustHeight: getChartValue(r.bustHeight, size),
    bustPoint: getChartValue(r.bustPoint, size),
    armLength: getChartValue(r.armLength, size),
    upperArmCircumference: getChartValue(r.upperArmCircumference, size),
    elbowCircumference: getChartValue(r.elbowCircumference, size),
    wristCircumference: getChartValue(r.wristCircumference, size),
    trouserLength: getChartValue(r.trouserLength, size),
    rise: getChartValue(r.rise, size),
    inseamLength: getChartValue(r.inseamLength, size),
    kneeHeight: getChartValue(r.kneeHeight, size),
    hipHeight: getChartValue(r.hipHeight, size),
    hipDepth: getChartValue(r.hipDepth, size),
    totalLength: womenChart.meta.height,
  };
}

/**
 * Men chart exports.
 *
 * IMPORTANT: This expects `standardSizesMen.json` to use the SAME internal row keys
 * as our app (e.g. `bustCircumference`, `waistCircumference`, `highHipCircumference`,
 * `hipCircumference`, `backWaistLength`, `backWidth`, `chestWidth`, `frontWaistLength`,
 * `neckCircumference`, `shoulderWidth`, `armLength`, `upperArmCircumference`,
 * `elbowCircumference`, `wristCircumference`, `trouserLength`, `rise`, `inseamLength`,
 * `kneeHeight`, `crotchDepth`).
 */
export type MenSize = keyof typeof menChart.rows.chestCircumference;

export function measurementsFromMenStandardSize(
  size: MenSize,
): Partial<Measurements> {
  const r = menChart.rows;

  return {
    ...MEN_FALLBACK_MEASUREMENTS,
    bustCircumference: getChartValue(r.chestCircumference, size),
    waistCircumference: getChartValue(r.waistCircumference, size),
    highHipCircumference: getChartValue(r.highHipCircumference, size),
    hipCircumference: getChartValue(r.hipCircumference, size),
    backWaistLength: getChartValue(r.backWaistLength, size),
    backWidth: getChartValue(r.backWidth, size),
    chestWidth: getChartValue(r.chestWidth, size),
    shoulderWidth: getChartValue(r.shoulderWidth, size),
    neckCircumference: getChartValue(r.neckCircumference, size),
    frontWaistLength: getChartValue(r.frontWaistLength, size),
    armLength: getChartValue(r.armLength, size),
    upperArmCircumference: getChartValue(r.upperArmCircumference, size),
    elbowCircumference: getChartValue(r.elbowCircumference, size),
    wristCircumference: getChartValue(r.wristCircumference, size),
    trouserLength: getChartValue(r.trouserLength, size),
    rise: getChartValue(r.rise, size),
    inseamLength: getChartValue(r.inseamLength, size),
    kneeHeight: getChartValue(r.kneeHeight, size),
    crotchDepth: getChartValue(r.crotchDepth, size),
  };
}
