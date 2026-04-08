import armholeDepthTable from '../../../data/armholeDepth.json';
import easeNoDarts from '../../../data/easeNoDarts.json';
import type { Profile } from '../../../types/measurements';
import { formatMeasurement, roundToHalf } from '../../measurements';
import type {
  PatternCalculation,
  PatternSleeveCap,
  Translate,
} from '../types';

type Point = { x: number; y: number };
const DRAFT_ORIGIN_X = 180;
const DRAFT_ORIGIN_Y = 60;

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

function getSleeveUpperArmEase(
  upperArmWidthRange: number[],
  sleeveCap: PatternSleeveCap,
) {
  return sleeveCap === 'high'
    ? upperArmWidthRange[0] ?? 0
    : upperArmWidthRange[1] ?? upperArmWidthRange[0] ?? 0;
}

function getSleeveCapHeight(armholeWidth: number, sleeveCap: PatternSleeveCap) {
  return roundToHalf(
    sleeveCap === 'high' ? armholeWidth / 3 : armholeWidth / 5,
  );
}

function getShoulderExtensionExcess(
  halfBustWithEase: number,
  armholeShare: number,
  neckWidth: number,
  shoulderWidthWithEase: number,
  shoulderHeight: number,
) {
  const calculatedSpanWidth = Math.sqrt(
    Math.max(
      shoulderWidthWithEase * shoulderWidthWithEase -
        shoulderHeight * shoulderHeight,
      0,
    ),
  );
  const minimumSpanWidth = Math.max(
    halfBustWithEase / 2 - armholeShare - neckWidth + 1,
    0,
  );

  if (calculatedSpanWidth >= minimumSpanWidth) {
    return 0;
  }

  return roundToHalf(
    Math.sqrt(
      minimumSpanWidth * minimumSpanWidth + shoulderHeight * shoulderHeight,
    ) - shoulderWidthWithEase,
  );
}

function distanceBetweenPoints(start: Point, end: Point) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function cubicPoint(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  t: number,
) {
  const oneMinusT = 1 - t;

  return {
    x:
      oneMinusT * oneMinusT * oneMinusT * start.x +
      3 * oneMinusT * oneMinusT * t * control1.x +
      3 * oneMinusT * t * t * control2.x +
      t * t * t * end.x,
    y:
      oneMinusT * oneMinusT * oneMinusT * start.y +
      3 * oneMinusT * oneMinusT * t * control1.y +
      3 * oneMinusT * t * t * control2.y +
      t * t * t * end.y,
  };
}

function approximateCubicLength(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  steps = 120,
) {
  let length = 0;
  let previousPoint = start;

  for (let step = 1; step <= steps; step += 1) {
    const point = cubicPoint(start, control1, control2, end, step / steps);
    length += distanceBetweenPoints(previousPoint, point);
    previousPoint = point;
  }

  return length;
}

function addPoints(left: Point, right: Point): Point {
  return { x: left.x + right.x, y: left.y + right.y };
}

function subtractPoints(left: Point, right: Point): Point {
  return { x: left.x - right.x, y: left.y - right.y };
}

function scalePoint(point: Point, scalar: number): Point {
  return { x: point.x * scalar, y: point.y * scalar };
}

function normalizeVector(vector: Point) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function segmentControls(
  start: Point,
  end: Point,
  startTangent: Point,
  endTangent: Point,
  strength = 0.28,
) {
  const segmentLength = distanceBetweenPoints(start, end);
  const handleLength = segmentLength * strength;

  return {
    control1: addPoints(start, scalePoint(startTangent, handleLength)),
    control2: addPoints(end, scalePoint(endTangent, -handleLength)),
  };
}

function divideLine(start: Point, end: Point, ratioFromStart: number): Point {
  return {
    x: start.x + (end.x - start.x) * ratioFromStart,
    y: start.y + (end.y - start.y) * ratioFromStart,
  };
}

function pointFromAngle(start: Point, angleDegrees: number, length: number): Point {
  const angleRadians = (angleDegrees * Math.PI) / 180;

  return {
    x: start.x - Math.cos(angleRadians) * length,
    y: start.y - Math.sin(angleRadians) * length,
  };
}

function getSleeveArmholeCurveMeasurements({
  armholeDepth,
  halfBustWithEase,
  backArmholeWidth,
  frontArmholeWidth,
  shoulderWidthWithEase,
  neckWidth,
  backInnerShoulderRise,
  frontInnerShoulderRise,
  backOuterShoulderDrop,
  frontOuterShoulderDrop,
  backArmholeCurveGuideLength,
  frontArmholeCurveGuideLength,
}: {
  armholeDepth: number;
  halfBustWithEase: number;
  backArmholeWidth: number;
  frontArmholeWidth: number;
  shoulderWidthWithEase: number;
  neckWidth: number;
  backInnerShoulderRise: number;
  frontInnerShoulderRise: number;
  backOuterShoulderDrop: number;
  frontOuterShoulderDrop: number;
  backArmholeCurveGuideLength: number;
  frontArmholeCurveGuideLength: number;
}) {
  const centerBackTop = { x: DRAFT_ORIGIN_X, y: DRAFT_ORIGIN_Y };
  const armholeDepthPoint = {
    x: centerBackTop.x,
    y: centerBackTop.y + armholeDepth,
  };
  const bustLineEndPoint = {
    x: armholeDepthPoint.x - halfBustWithEase,
    y: armholeDepthPoint.y,
  };
  const topRightPoint = {
    x: bustLineEndPoint.x,
    y: centerBackTop.y,
  };
  const upperMidPoint = {
    x: (centerBackTop.x + bustLineEndPoint.x) / 2,
    y: armholeDepthPoint.y,
  };
  const backArmholePoint = {
    x: upperMidPoint.x + backArmholeWidth,
    y: upperMidPoint.y,
  };
  const backArmholeTopPoint = {
    x: backArmholePoint.x,
    y: centerBackTop.y,
  };
  const frontArmholePoint = {
    x: upperMidPoint.x - frontArmholeWidth,
    y: upperMidPoint.y,
  };
  const frontArmholeTopPoint = {
    x: frontArmholePoint.x,
    y: centerBackTop.y,
  };
  const frontArmholeThirdPoint = divideLine(
    frontArmholePoint,
    frontArmholeTopPoint,
    1 / 3,
  );
  const droppedFrontOuterShoulderPoint = {
    x: frontArmholeTopPoint.x,
    y: frontArmholeTopPoint.y + frontOuterShoulderDrop,
  };
  const frontNeckWidthPoint = {
    x: topRightPoint.x + neckWidth,
    y: topRightPoint.y,
  };
  const raisedFrontInnerShoulderPoint = {
    x: frontNeckWidthPoint.x,
    y: frontNeckWidthPoint.y - frontInnerShoulderRise,
  };
  const frontShoulderSpanHeight =
    droppedFrontOuterShoulderPoint.y - raisedFrontInnerShoulderPoint.y;
  const frontShoulderSpanWidth = Math.sqrt(
    Math.max(
      shoulderWidthWithEase * shoulderWidthWithEase -
        frontShoulderSpanHeight * frontShoulderSpanHeight,
      0,
    ),
  );
  const minimumFrontOuterShoulderPoint = {
    x: droppedFrontOuterShoulderPoint.x + 1,
    y: droppedFrontOuterShoulderPoint.y,
  };
  const calculatedFrontOuterShoulderPoint = {
    x: raisedFrontInnerShoulderPoint.x + frontShoulderSpanWidth,
    y: droppedFrontOuterShoulderPoint.y,
  };
  const frontOuterShoulderPoint =
    calculatedFrontOuterShoulderPoint.x < minimumFrontOuterShoulderPoint.x
      ? minimumFrontOuterShoulderPoint
      : calculatedFrontOuterShoulderPoint;
  const droppedBackOuterShoulderPoint = {
    x: backArmholeTopPoint.x,
    y: backArmholeTopPoint.y + backOuterShoulderDrop,
  };
  const neckWidthPoint = {
    x: centerBackTop.x - neckWidth,
    y: centerBackTop.y,
  };
  const raisedBackInnerShoulderPoint = {
    x: neckWidthPoint.x,
    y: neckWidthPoint.y - backInnerShoulderRise,
  };
  const backShoulderSpanHeight =
    droppedBackOuterShoulderPoint.y - raisedBackInnerShoulderPoint.y;
  const backShoulderSpanWidth = Math.sqrt(
    Math.max(
      shoulderWidthWithEase * shoulderWidthWithEase -
        backShoulderSpanHeight * backShoulderSpanHeight,
      0,
    ),
  );
  const minimumBackOuterShoulderPoint = {
    x: droppedBackOuterShoulderPoint.x - 1,
    y: droppedBackOuterShoulderPoint.y,
  };
  const calculatedBackOuterShoulderPoint = {
    x: raisedBackInnerShoulderPoint.x - backShoulderSpanWidth,
    y: droppedBackOuterShoulderPoint.y,
  };
  const backOuterShoulderPoint =
    calculatedBackOuterShoulderPoint.x > minimumBackOuterShoulderPoint.x
      ? minimumBackOuterShoulderPoint
      : calculatedBackOuterShoulderPoint;
  const backArmholeShoulderMidPoint = {
    x: (backArmholePoint.x + droppedBackOuterShoulderPoint.x) / 2,
    y: (backArmholePoint.y + droppedBackOuterShoulderPoint.y) / 2,
  };
  const backArmholeCurveGuidePoint = pointFromAngle(
    backArmholePoint,
    50,
    backArmholeCurveGuideLength,
  );
  const frontArmholeCurveGuidePoint = pointFromAngle(
    frontArmholePoint,
    120,
    frontArmholeCurveGuideLength,
  );

  const backArmholeStartTangent = normalizeVector(
    subtractPoints(backArmholeShoulderMidPoint, backOuterShoulderPoint),
  );
  const backArmholeMidTangent = normalizeVector(
    addPoints(
      normalizeVector(
        subtractPoints(backArmholeShoulderMidPoint, backOuterShoulderPoint),
      ),
      normalizeVector(
        subtractPoints(backArmholeCurveGuidePoint, backArmholeShoulderMidPoint),
      ),
    ),
  );
  const backArmholeGuideTangent = normalizeVector(
    addPoints(
      normalizeVector(
        subtractPoints(backArmholeCurveGuidePoint, backArmholeShoulderMidPoint),
      ),
      normalizeVector(subtractPoints(upperMidPoint, backArmholeCurveGuidePoint)),
    ),
  );
  const backArmholeCurveStartControls = segmentControls(
    backOuterShoulderPoint,
    backArmholeShoulderMidPoint,
    backArmholeStartTangent,
    backArmholeMidTangent,
  );
  const backArmholeCurveMiddleControls = segmentControls(
    backArmholeShoulderMidPoint,
    backArmholeCurveGuidePoint,
    backArmholeMidTangent,
    backArmholeGuideTangent,
    0.36,
  );
  const backArmholeEndSpanX = Math.abs(
    upperMidPoint.x - backArmholeCurveGuidePoint.x,
  );
  const backArmholeCurveEndControls = {
    control1: addPoints(
      backArmholeCurveGuidePoint,
      scalePoint(
        backArmholeGuideTangent,
        distanceBetweenPoints(backArmholeCurveGuidePoint, upperMidPoint) * 0.26,
      ),
    ),
    control2: {
      x: upperMidPoint.x - backArmholeEndSpanX * 0.12,
      y: upperMidPoint.y,
    },
  };
  backArmholeCurveEndControls.control1.y = Math.min(
    backArmholeCurveEndControls.control1.y,
    upperMidPoint.y,
  );

  const frontArmholeStartTangent = normalizeVector(
    subtractPoints(frontArmholeThirdPoint, frontOuterShoulderPoint),
  );
  const frontArmholeMidTangent = normalizeVector(
    addPoints(
      normalizeVector(
        subtractPoints(frontArmholeThirdPoint, frontOuterShoulderPoint),
      ),
      normalizeVector(
        subtractPoints(frontArmholeCurveGuidePoint, frontArmholeThirdPoint),
      ),
    ),
  );
  const frontArmholeGuideTangent = normalizeVector(
    addPoints(
      normalizeVector(
        subtractPoints(frontArmholeCurveGuidePoint, frontArmholeThirdPoint),
      ),
      normalizeVector(subtractPoints(upperMidPoint, frontArmholeCurveGuidePoint)),
    ),
  );
  const frontArmholeCurveStartControls = segmentControls(
    frontOuterShoulderPoint,
    frontArmholeThirdPoint,
    frontArmholeStartTangent,
    frontArmholeMidTangent,
  );
  const frontArmholeCurveMiddleControls = segmentControls(
    frontArmholeThirdPoint,
    frontArmholeCurveGuidePoint,
    frontArmholeMidTangent,
    frontArmholeGuideTangent,
  );
  const frontArmholeEndSpanX = Math.abs(
    frontArmholeCurveGuidePoint.x - upperMidPoint.x,
  );
  const frontArmholeCurveEndControls = {
    control1: addPoints(
      frontArmholeCurveGuidePoint,
      scalePoint(
        frontArmholeGuideTangent,
        distanceBetweenPoints(frontArmholeCurveGuidePoint, upperMidPoint) * 0.26,
      ),
    ),
    control2: {
      x: upperMidPoint.x + frontArmholeEndSpanX * 0.12,
      y: upperMidPoint.y,
    },
  };
  frontArmholeCurveEndControls.control1.y = Math.min(
    frontArmholeCurveEndControls.control1.y,
    upperMidPoint.y,
  );

  const backArmholeCurveLength =
    approximateCubicLength(
      backOuterShoulderPoint,
      backArmholeCurveStartControls.control1,
      backArmholeCurveStartControls.control2,
      backArmholeShoulderMidPoint,
    ) +
    approximateCubicLength(
      backArmholeShoulderMidPoint,
      backArmholeCurveMiddleControls.control1,
      backArmholeCurveMiddleControls.control2,
      backArmholeCurveGuidePoint,
    ) +
    approximateCubicLength(
      backArmholeCurveGuidePoint,
      backArmholeCurveEndControls.control1,
      backArmholeCurveEndControls.control2,
      upperMidPoint,
    );

  const frontArmholeCurveLength =
    approximateCubicLength(
      frontOuterShoulderPoint,
      frontArmholeCurveStartControls.control1,
      frontArmholeCurveStartControls.control2,
      frontArmholeThirdPoint,
    ) +
    approximateCubicLength(
      frontArmholeThirdPoint,
      frontArmholeCurveMiddleControls.control1,
      frontArmholeCurveMiddleControls.control2,
      frontArmholeCurveGuidePoint,
    ) +
    approximateCubicLength(
      frontArmholeCurveGuidePoint,
      frontArmholeCurveEndControls.control1,
      frontArmholeCurveEndControls.control2,
      upperMidPoint,
    );

  return {
    backArmholeCurveLength: roundToHalf(backArmholeCurveLength),
    frontArmholeCurveLength: roundToHalf(frontArmholeCurveLength),
    totalArmholeCurveLength: roundToHalf(
      backArmholeCurveLength + frontArmholeCurveLength,
    ),
  };
}

export function calculateBodiceWithoutDarts(
  profile: Profile,
  t: Translate,
  movementEase: number,
  sleeveCap: PatternSleeveCap = 'high',
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
  const sleeveLengthEase = roundToHalf(easeEntry.sleeve.length);
  const backShoulderExtensionExcess = getShoulderExtensionExcess(
    halfBustWithEase,
    backArmholeWidth,
    neckWidth,
    shoulderWidthWithEase,
    4,
  );
  const frontShoulderExtensionExcess = getShoulderExtensionExcess(
    halfBustWithEase,
    frontArmholeWidth,
    neckWidth,
    shoulderWidthWithEase,
    5,
  );
  const shoulderExtensionExcess = roundToHalf(
    Math.max(backShoulderExtensionExcess, frontShoulderExtensionExcess),
  );
  const measuredArmLength = roundToHalf(profile.measurements.armLength);
  const sleeveLengthBase = roundToHalf(measuredArmLength + sleeveLengthEase);
  const sleeveLengthWithEase = roundToHalf(
    sleeveLengthBase - shoulderExtensionExcess,
  );
  const elbowHeight = roundToHalf(sleeveLengthWithEase / 2 + 3);
  const upperArmEase = roundToHalf(
    getSleeveUpperArmEase(easeEntry.sleeve.upperArmWidthRange, sleeveCap),
  );
  const upperArmWidthWithEase = roundToHalf(
    roundToHalf(profile.measurements.upperArmCircumference) + upperArmEase,
  );
  const armholeCurveMeasurements = getSleeveArmholeCurveMeasurements({
    armholeDepth,
    halfBustWithEase,
    backArmholeWidth,
    frontArmholeWidth,
    shoulderWidthWithEase,
    neckWidth,
    backInnerShoulderRise: 2,
    frontInnerShoulderRise: 2,
    backOuterShoulderDrop: 2,
    frontOuterShoulderDrop: 3,
    backArmholeCurveGuideLength: easeEntry.helperMeasurements.bodice.armholeBack,
    frontArmholeCurveGuideLength: easeEntry.helperMeasurements.bodice.armholeFront,
  });
  const sleeveCapHeight = getSleeveCapHeight(
    armholeCurveMeasurements.totalArmholeCurveLength,
    sleeveCap,
  );

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
    {
      id: 'sleeveArmholeWidth',
      label: t('sleeveArmholeWidth'),
      value: armholeCurveMeasurements.totalArmholeCurveLength,
      description: `${formatMeasurement(
        armholeCurveMeasurements.backArmholeCurveLength,
      )} + ${formatMeasurement(
        armholeCurveMeasurements.frontArmholeCurveLength,
      )} = ${formatMeasurement(armholeCurveMeasurements.totalArmholeCurveLength)}`,
      explanation: t('sleeveArmholeWidthExplanation'),
      section: 'sleeveMeasurements',
    },
    ...(sleeveCap === 'low'
      ? [
          {
            id: 'sleeveFrontArmholeWidth',
            label: t('sleeveFrontArmholeWidth'),
            value: armholeCurveMeasurements.frontArmholeCurveLength,
            description: `${formatMeasurement(
              armholeCurveMeasurements.frontArmholeCurveLength,
            )}`,
            explanation: t('sleeveFrontArmholeWidthLowCapExplanation'),
            section: 'sleeveMeasurements' as const,
          },
          {
            id: 'sleeveBackArmholeWidth',
            label: t('sleeveBackArmholeWidth'),
            value: armholeCurveMeasurements.backArmholeCurveLength,
            description: `${formatMeasurement(
              armholeCurveMeasurements.backArmholeCurveLength,
            )}`,
            explanation: t('sleeveBackArmholeWidthLowCapExplanation'),
            section: 'sleeveMeasurements' as const,
          },
        ]
      : []),
    {
      id: 'sleeveCapHeight',
      label: t('sleeveCapHeight'),
      value: sleeveCapHeight,
      description:
        sleeveCap === 'high'
          ? `${formatMeasurement(
              armholeCurveMeasurements.totalArmholeCurveLength,
            )} / 3 = ${formatMeasurement(sleeveCapHeight)}`
          : `${formatMeasurement(
              armholeCurveMeasurements.totalArmholeCurveLength,
            )} / 5 = ${formatMeasurement(sleeveCapHeight)}`,
      explanation: t(
        sleeveCap === 'high'
          ? 'highSleeveCapHeightExplanation'
          : 'lowSleeveCapHeightExplanation',
      ),
      section: 'sleeveMeasurements',
    },
    {
      id: 'sleeveLengthWithEase',
      label: t('sleeveLengthWithEase'),
      value: sleeveLengthWithEase,
      description:
        shoulderExtensionExcess > 0
          ? `${formatMeasurement(measuredArmLength)} + ${formatMeasurement(
              sleeveLengthEase,
            )} = ${formatMeasurement(sleeveLengthBase)}, ${formatMeasurement(
              sleeveLengthBase,
            )} - ${formatMeasurement(
              shoulderExtensionExcess,
            )} = ${formatMeasurement(sleeveLengthWithEase)}`
          : `${formatMeasurement(measuredArmLength)} + ${formatMeasurement(
              sleeveLengthEase,
            )} = ${formatMeasurement(sleeveLengthWithEase)}`,
      explanation: t('sleeveLengthWithEaseExplanation'),
      section: 'sleeveMeasurements',
    },
    ...(sleeveCap === 'high'
      ? [
          {
            id: 'elbowHeight',
            label: t('elbowHeight'),
            value: elbowHeight,
            description: `${formatMeasurement(
              sleeveLengthWithEase,
            )} / 2 + 3 = ${formatMeasurement(elbowHeight)}`,
            explanation: t('elbowHeightExplanation'),
            section: 'sleeveMeasurements' as const,
          },
          {
            id: 'upperArmWidthWithEase',
            label: t('upperArmWidthWithEase'),
            value: upperArmWidthWithEase,
            description: `${formatMeasurement(
              roundToHalf(profile.measurements.upperArmCircumference),
            )} + ${formatMeasurement(upperArmEase)} = ${formatMeasurement(
              upperArmWidthWithEase,
            )}`,
            explanation: t('upperArmWidthWithHighCapExplanation'),
            section: 'sleeveMeasurements' as const,
          },
        ]
      : []),
  ];
}
