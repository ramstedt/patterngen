import womenChart from './standardSizesWomen168.json';
import menChart from './standardSizesMen176.json';
import type { Measurements } from '../types/measurements';

function v<T extends Record<string, number | null | undefined>>(
  row: T | undefined,
  size: keyof T | string,
): number {
  if (!row) return 0;
  const value = (row as any)[size] as number | null | undefined;
  return typeof value === 'number' ? value : 0;
}

export type StandardSize = keyof typeof womenChart.rows.bustCircumference;

export function measurementsFromStandardSize(
  size: StandardSize,
): Partial<Measurements> {
  const r = womenChart.rows;

  return {
    bustCircumference: v(r.bustCircumference, size),
    waistCircumference: v(r.waistCircumference, size),
    highHipCircumference: v(r.highHipCircumference, size),
    hipCircumference: v(r.hipCircumference, size),
    backWaistLength: v(r.backWaistLength, size),
    backWidth: v(r.backWidth, size),
    shoulderWidth: v(r.shoulderWidth, size),
    neckCircumference: v(r.neckCircumference, size),
    frontWaistLength: v(r.frontWaistLength, size),
    bustHeight: v(r.bustHeight, size),
    bustPoint: v(r.bustPoint, size),
    armLength: v(r.armLength, size),
    upperArmCircumference: v(r.upperArmCircumference, size),
    elbowCircumference: v(r.elbowCircumference, size),
    wristCircumference: v(r.wristCircumference, size),
    trouserLength: v(r.trouserLength, size),
    rise: v(r.rise, size),
    inseamLength: v(r.inseamLength, size),
    kneeHeight: v(r.kneeHeight, size),
    hipHeight: v(r.hipHeight, size),
    hipDepth: v(r.hipDepth, size),

    // Not in chart: keep as 0
    totalLength: womenChart.meta.height,
    sideHeight: 0,
    shoulderHeightRightBack: 0,
    shoulderHeightRightFull: 0,
    shoulderHeightLeftBack: 0,
    shoulderHeightLeftFull: 0,
    sideMeasurement: 0,
    chestWidth: 0,
    crotchDepth: 0,
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
    bustCircumference: v(r.chestCircumference, size),
    waistCircumference: v(r.waistCircumference, size),
    highHipCircumference: v(r.highHipCircumference, size),
    hipCircumference: v(r.hipCircumference, size),
    backWaistLength: v(r.backWaistLength, size),
    backWidth: v(r.backWidth, size),
    chestWidth: v(r.chestWidth, size),
    shoulderWidth: v(r.shoulderWidth, size),
    neckCircumference: v(r.neckCircumference, size),
    frontWaistLength: v(r.frontWaistLength, size),
    armLength: v(r.armLength, size),
    upperArmCircumference: v(r.upperArmCircumference, size),
    elbowCircumference: v(r.elbowCircumference, size),
    wristCircumference: v(r.wristCircumference, size),
    trouserLength: v(r.trouserLength, size),
    rise: v(r.rise, size),
    inseamLength: v(r.inseamLength, size),
    kneeHeight: v(r.kneeHeight, size),
    crotchDepth: v(r.crotchDepth, size),

    // Not in mens table
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
}
