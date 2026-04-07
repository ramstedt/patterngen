import type { Profile } from '../../../types/measurements';
import type { PatternCalculation, PatternDraft, Translate } from '../types';

type Point = { x: number; y: number };
type CurveSample = { point: Point; distanceFromStart: number };
type PathSegment =
  | { kind: 'line'; start: Point; end: Point }
  | { kind: 'quadratic'; start: Point; control: Point; end: Point }
  | {
      kind: 'cubic';
      start: Point;
      control1: Point;
      control2: Point;
      end: Point;
    };
type Layout = {
  leftMeasureSpaceMm: number;
  patternWidthMm: number;
  rightLabelSpaceMm: number;
  width: number;
  height: number;
  leftX: number;
  lineX: number;
  sideLineX: number;
  startY: number;
  endY: number;
  centerY: number;
};

const MM_PER_CM = 10;

function createCalculationValueMap(calculations: PatternCalculation[]) {
  return new Map(
    calculations.map((calculation) => [calculation.id, calculation.value]),
  );
}

function toMm(valueInCm: number) {
  return valueInCm * MM_PER_CM;
}

function halfToMm(valueInCm: number) {
  return toMm(valueInCm) / 2;
}

function distanceBetweenPoints(start: Point, end: Point) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function interpolatePoint(start: Point, end: Point, t: number): Point {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

function quadraticPoint(
  start: Point,
  control: Point,
  end: Point,
  t: number,
): Point {
  const oneMinusT = 1 - t;

  return {
    x:
      oneMinusT * oneMinusT * start.x +
      2 * oneMinusT * t * control.x +
      t * t * end.x,
    y:
      oneMinusT * oneMinusT * start.y +
      2 * oneMinusT * t * control.y +
      t * t * end.y,
  };
}

function cubicPoint(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  t: number,
): Point {
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

function samplePathSegments(segments: PathSegment[]): CurveSample[] {
  const samples: CurveSample[] = [];
  let previousPoint: Point | null = null;
  let distanceFromStart = 0;

  for (const segment of segments) {
    const steps = segment.kind === 'line' ? 32 : 160;

    for (let step = samples.length === 0 ? 0 : 1; step <= steps; step += 1) {
      const t = step / steps;
      const point =
        segment.kind === 'line'
          ? interpolatePoint(segment.start, segment.end, t)
          : segment.kind === 'quadratic'
            ? quadraticPoint(segment.start, segment.control, segment.end, t)
            : cubicPoint(
                segment.start,
                segment.control1,
                segment.control2,
                segment.end,
                t,
              );

      if (previousPoint) {
        distanceFromStart += distanceBetweenPoints(previousPoint, point);
      }

      samples.push({ point, distanceFromStart });
      previousPoint = point;
    }
  }

  return samples;
}

function pointOnSamplesAtX(
  samples: CurveSample[],
  targetX: number,
): CurveSample {
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const minX = Math.min(previous.point.x, current.point.x);
    const maxX = Math.max(previous.point.x, current.point.x);

    if (targetX < minX || targetX > maxX) {
      continue;
    }

    const deltaX = current.point.x - previous.point.x;
    const t = deltaX === 0 ? 0 : (targetX - previous.point.x) / deltaX;
    const point = interpolatePoint(previous.point, current.point, t);

    return {
      point,
      distanceFromStart:
        previous.distanceFromStart +
        distanceBetweenPoints(previous.point, point),
    };
  }

  throw new Error(
    'Could not locate the requested x-position on the waist curve.',
  );
}

function pointOnSamplesAtDistance(
  samples: CurveSample[],
  targetDistanceFromStart: number,
): CurveSample {
  if (targetDistanceFromStart <= 0) {
    return samples[0];
  }

  const lastSample = samples[samples.length - 1];

  if (targetDistanceFromStart >= lastSample.distanceFromStart) {
    return lastSample;
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];

    if (targetDistanceFromStart > current.distanceFromStart) {
      continue;
    }

    const segmentLength =
      current.distanceFromStart - previous.distanceFromStart;
    const t =
      segmentLength === 0
        ? 0
        : (targetDistanceFromStart - previous.distanceFromStart) /
          segmentLength;

    return {
      point: interpolatePoint(previous.point, current.point, t),
      distanceFromStart: targetDistanceFromStart,
    };
  }

  return lastSample;
}

function pointOnLineAtX(start: Point, end: Point, x: number): Point {
  const deltaX = end.x - start.x;

  if (deltaX === 0) {
    return { x: start.x, y: (start.y + end.y) / 2 };
  }

  const t = (x - start.x) / deltaX;

  return interpolatePoint(start, end, t);
}

function uniqueAppend(points: Point[], point: Point) {
  const lastPoint = points[points.length - 1];

  if (
    !lastPoint ||
    Math.abs(lastPoint.x - point.x) > 0.01 ||
    Math.abs(lastPoint.y - point.y) > 0.01
  ) {
    points.push(point);
  }
}

function pointsAlongSamples(
  samples: CurveSample[],
  startDistance: number,
  endDistance: number,
  options?: {
    includeStart?: boolean;
    includeEnd?: boolean;
  },
): Point[] {
  const includeStart = options?.includeStart ?? true;
  const includeEnd = options?.includeEnd ?? true;

  if (endDistance <= startDistance) {
    return includeStart
      ? [pointOnSamplesAtDistance(samples, startDistance).point]
      : [];
  }

  const points: Point[] = [];

  if (includeStart) {
    points.push(pointOnSamplesAtDistance(samples, startDistance).point);
  }

  for (const sample of samples) {
    if (
      sample.distanceFromStart > startDistance &&
      sample.distanceFromStart < endDistance
    ) {
      uniqueAppend(points, sample.point);
    }
  }

  if (includeEnd) {
    uniqueAppend(points, pointOnSamplesAtDistance(samples, endDistance).point);
  }

  return points;
}

function polylinePath(points: Point[]) {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function buildWaistPathWithStraightDarts({
  samples,
  darts,
}: {
  samples: CurveSample[];
  darts: Array<{
    startDistance: number;
    startPoint: Point;
    endDistance: number;
    endPoint: Point;
  }>;
}) {
  const totalDistance = samples[samples.length - 1].distanceFromStart;
  const orderedDarts = [...darts].sort(
    (left, right) => left.startDistance - right.startDistance,
  );
  const points: Point[] = [];
  let cursor = 0;
  let previousDartEndPoint: Point | null = null;

  for (const dart of orderedDarts) {
    const rawSegmentPoints = pointsAlongSamples(
      samples,
      cursor,
      dart.startDistance,
      {
        includeStart: cursor === 0,
        includeEnd: true,
      },
    );
    const firstRawPoint = rawSegmentPoints[0];
    const lastRawPoint = rawSegmentPoints[rawSegmentPoints.length - 1];
    const startYOffset =
      previousDartEndPoint && firstRawPoint
        ? previousDartEndPoint.y - firstRawPoint.y
        : 0;
    const endYOffset = lastRawPoint ? dart.startPoint.y - lastRawPoint.y : 0;
    const segmentPoints = rawSegmentPoints.map((point, index) => {
      const t =
        rawSegmentPoints.length <= 1
          ? 1
          : index / (rawSegmentPoints.length - 1);

      return {
        x: point.x,
        y: point.y + startYOffset + (endYOffset - startYOffset) * t,
      };
    });

    for (const point of segmentPoints) {
      uniqueAppend(points, point);
    }

    uniqueAppend(points, dart.startPoint);
    uniqueAppend(points, dart.endPoint);
    cursor = dart.endDistance;
    previousDartEndPoint = dart.endPoint;
  }

  const rawTrailingPoints = pointsAlongSamples(samples, cursor, totalDistance, {
    includeStart: cursor === 0,
    includeEnd: true,
  });
  const firstTrailingPoint = rawTrailingPoints[0];
  const trailingPoints = rawTrailingPoints.map((point, index) => {
    const t =
      rawTrailingPoints.length <= 1
        ? 1
        : index / (rawTrailingPoints.length - 1);
    const startYOffset =
      previousDartEndPoint && firstTrailingPoint
        ? previousDartEndPoint.y - firstTrailingPoint.y
        : 0;

    return {
      x: point.x,
      y: point.y + startYOffset * (1 - t),
    };
  });

  for (const point of trailingPoints) {
    uniqueAppend(points, point);
  }

  return polylinePath(points);
}

function solveDartWithFixedLeg({
  apex,
  left,
  right,
  fixedSide,
}: {
  apex: Point;
  left: CurveSample;
  right: CurveSample;
  fixedSide: 'left' | 'right';
}) {
  const fixed = fixedSide === 'left' ? left : right;
  const movable = fixedSide === 'left' ? right : left;
  const targetLength = distanceBetweenPoints(apex, fixed.point);
  const solveMovablePoint = (sample: CurveSample): CurveSample => {
    const horizontalDistance = Math.abs(apex.x - sample.point.x);
    const verticalDistance = Math.sqrt(
      Math.max(
        targetLength * targetLength - horizontalDistance * horizontalDistance,
        0,
      ),
    );

    return {
      ...sample,
      point: {
        x: sample.point.x,
        y: apex.y - verticalDistance,
      },
    };
  };

  if (fixedSide === 'left') {
    return { left, right: solveMovablePoint(movable) };
  }

  return {
    left: solveMovablePoint(movable),
    right,
  };
}

function normalizeVector(x: number, y: number) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

type JoinedSideCurveControls = {
  control1: Point;
  control2: Point;
  control3: Point;
  control4: Point;
};

function calculateJoinedSideCurveControls({
  start,
  mid,
  end,
  inwardDirection,
}: {
  start: Point;
  mid: Point;
  end: Point;
  inwardDirection: 1 | -1;
}): JoinedSideCurveControls {
  const startToMid = { x: mid.x - start.x, y: mid.y - start.y };
  const midToEnd = { x: end.x - mid.x, y: end.y - mid.y };

  const tangentBase = normalizeVector(
    startToMid.x + midToEnd.x,
    startToMid.y + midToEnd.y,
  );

  const tangent =
    tangentBase.y < 0
      ? tangentBase
      : { x: -tangentBase.x, y: -tangentBase.y };

  const lowerLength = Math.hypot(startToMid.x, startToMid.y);
  const upperLength = Math.hypot(midToEnd.x, midToEnd.y);
  const lowerHandle = Math.min(lowerLength * 0.32, 28);
  const upperHandle = Math.min(upperLength * 0.32, 28);

  return {
    control1: {
      x: start.x,
      y: start.y - Math.min(lowerLength * 0.18, 14),
    },
    control2: {
      x: mid.x - tangent.x * lowerHandle,
      y: mid.y - tangent.y * lowerHandle,
    },
    control3: {
      x: mid.x + tangent.x * upperHandle,
      y: mid.y + tangent.y * upperHandle,
    },
    control4: {
      x: end.x - inwardDirection * Math.min(Math.abs(end.x - mid.x) * 0.55, 20),
      y: end.y + Math.min(Math.abs(end.y - mid.y) * 0.35, 18),
    },
  };
}

function buildSmoothJoinedSideCurvePath({
  start,
  mid,
  end,
  inwardDirection,
}: {
  start: Point;
  mid: Point;
  end: Point;
  inwardDirection: 1 | -1;
}) {
  const { control1, control2, control3, control4 } =
    calculateJoinedSideCurveControls({
      start,
      mid,
      end,
      inwardDirection,
    });

  return [
    `M ${start.x} ${start.y}`,
    `C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${mid.x} ${mid.y}`,
    `C ${control3.x} ${control3.y} ${control4.x} ${control4.y} ${end.x} ${end.y}`,
  ].join(' ');
}

function validateDraftInputs({
  skirtLengthMm,
  hipHeightMm,
  hipDepthMm,
}: {
  skirtLengthMm: number;
  hipHeightMm: number;
  hipDepthMm: number;
}) {
  if (hipHeightMm > skirtLengthMm) {
    throw new Error(
      'Hip height cannot exceed skirt length for straight skirt draft.',
    );
  }

  if (hipDepthMm > skirtLengthMm) {
    throw new Error(
      'Hip depth cannot exceed skirt length for straight skirt draft.',
    );
  }
}

function createLayout({
  bottomWidthMm,
  skirtLengthMm,
  leftMeasureSpaceMm,
  rightLabelSpaceMm,
  topBottomMarginMm,
}: {
  bottomWidthMm: number;
  skirtLengthMm: number;
  leftMeasureSpaceMm: number;
  rightLabelSpaceMm: number;
  topBottomMarginMm: number;
}): Layout {
  const patternWidthMm = bottomWidthMm;
  const width = leftMeasureSpaceMm + patternWidthMm + rightLabelSpaceMm;
  const height = Math.max(skirtLengthMm + topBottomMarginMm * 2, 220);
  const leftX = leftMeasureSpaceMm;
  const lineX = leftX + patternWidthMm;
  const sideLineX = leftX + patternWidthMm / 2;
  const startY = topBottomMarginMm;
  const endY = startY + skirtLengthMm;
  const centerY = startY + skirtLengthMm / 2;

  return {
    leftMeasureSpaceMm,
    patternWidthMm,
    rightLabelSpaceMm,
    width,
    height,
    leftX,
    lineX,
    sideLineX,
    startY,
    endY,
    centerY,
  };
}

export function buildStraightSkirtDraft(
  profile: Profile,
  t: Translate,
  calculations: PatternCalculation[],
): PatternDraft {
  const values = createCalculationValueMap(calculations);

  const skirtLengthCm =
    values.get('skirtLength') ?? profile.measurements.kneeHeight;
  const hipHeightCm = values.get('hipHeight') ?? profile.measurements.hipHeight;
  const hipDepthCm = values.get('hipDepth') ?? profile.measurements.hipDepth;
  const highHipWidthCm =
    values.get('hipCircumference') ??
    profile.measurements.hipCircumference;
  const seatWidthCm =
    values.get('seatCircumference') ?? profile.measurements.seatCircumference;
  const sideLineWaistCm = values.get('sideLineWaist') ?? 0;
  const sideLineHipCm = values.get('sideLineHip') ?? 0;
  const backDartPlacementCm = values.get('backDartPlacement') ?? 0;
  const frontDartPlacementCm = values.get('frontDartPlacement') ?? 0;
  const backDartWidthCm = values.get('backDartWidth') ?? 0;
  const backDartWidthSecondaryCm = values.get('backDartWidthSecondary') ?? 0;
  const frontDartWidthCm = values.get('frontDartWidth') ?? 0;
  const frontDartWidthSecondaryCm = values.get('frontDartWidthSecondary') ?? 0;

  const skirtLengthMm = toMm(skirtLengthCm);
  const hipHeightMm = toMm(hipHeightCm);
  const hipDepthMm = toMm(hipDepthCm);
  const bottomWidthMm = toMm(Math.max(highHipWidthCm, seatWidthCm));
  const halfSideLineWaistMm = halfToMm(sideLineWaistCm);
  const halfSideLineHipMm = halfToMm(sideLineHipCm);
  const backDartPlacementMm = toMm(backDartPlacementCm);
  const frontDartPlacementMm = toMm(frontDartPlacementCm);
  const halfBackDartWidthMm = halfToMm(backDartWidthCm);
  const frontDartWidthMm = toMm(frontDartWidthCm);
  const hasSecondaryDarts =
    frontDartWidthSecondaryCm > 0 || backDartWidthSecondaryCm > 0;

  const raisedWaistDotMm = 15;
  const loweredBackWaistMm = 5;
  const frontDartDepthMm = 10;

  const marginMm = 56;
  const rightLabelSpaceMm = 88;
  const dimensionOffsetMm = 16;
  const dimensionLabelGapMm = 28;
  const grainlineInsetY = 22;
  const arrowSizeMm = 7;

  validateDraftInputs({ skirtLengthMm, hipHeightMm, hipDepthMm });

  const layout = createLayout({
    bottomWidthMm,
    skirtLengthMm,
    leftMeasureSpaceMm: marginMm,
    rightLabelSpaceMm: marginMm + rightLabelSpaceMm,
    topBottomMarginMm: marginMm,
  });

  const { width, height, leftX, lineX, sideLineX, startY, endY, centerY } =
    layout;
  const loweredBackWaistY = startY + loweredBackWaistMm;
  const hipMarkerY = startY + hipHeightMm;
  const seatMarkerY = startY + hipDepthMm;

  const lengthMeasureX = leftX - dimensionOffsetMm;
  const widthMeasureY = endY + dimensionOffsetMm;
  const widthCenterX = leftX + bottomWidthMm / 2;
  const grainlineTopY = startY + grainlineInsetY;
  const grainlineBottomY = endY - grainlineInsetY;

  const backDartX = lineX - backDartPlacementMm;
  const backDartBottomY = hipMarkerY + (seatMarkerY - hipMarkerY) / 2;

  const frontDartX = sideLineX - halfSideLineWaistMm - frontDartPlacementMm;
  const frontDartLeftX = frontDartX - frontDartWidthMm;
  const frontDartBottomY = hipMarkerY - frontDartDepthMm;

  const leftWaistPoint = {
    x: sideLineX - halfSideLineWaistMm,
    y: startY - raisedWaistDotMm,
  };
  const leftHipPoint = { x: sideLineX - halfSideLineHipMm, y: hipMarkerY };
  const rightWaistPoint = {
    x: sideLineX + halfSideLineWaistMm,
    y: startY - raisedWaistDotMm,
  };
  const rightHipPoint = { x: sideLineX + halfSideLineHipMm, y: hipMarkerY };
  const seatCenterPoint = { x: sideLineX, y: seatMarkerY };

  const leftCurvePath = buildSmoothJoinedSideCurvePath({
    start: seatCenterPoint,
    mid: leftHipPoint,
    end: leftWaistPoint,
    inwardDirection: -1,
  });

  const rightCurvePath = buildSmoothJoinedSideCurvePath({
    start: seatCenterPoint,
    mid: rightHipPoint,
    end: rightWaistPoint,
    inwardDirection: 1,
  });

  const rightWaistCurveStartX = lineX - 40;
  const rightWaistCurveMeetX = lineX - (lineX - rightWaistPoint.x) / 2;
  const rightWaistCurveStartPoint = { x: lineX, y: loweredBackWaistY };
  const rightWaistCurveLineEndPoint = {
    x: rightWaistCurveStartX,
    y: loweredBackWaistY,
  };
  const rightWaistCurveFirstControlPoint = {
    x: rightWaistCurveStartX - backDartPlacementMm / 6,
    y: loweredBackWaistY,
  };
  const rightWaistCurveMeetPoint = { x: rightWaistCurveMeetX, y: startY };
  const rightWaistCurveSecondControlPoint = {
    x: rightWaistPoint.x + 24,
    y: rightWaistPoint.y + 2,
  };
  const leftWaistCurveMeetX = leftX + (leftWaistPoint.x - leftX) / 2;
  const leftWaistCurveStart = { x: leftWaistCurveMeetX, y: startY };
  const leftWaistCurveControl1 = {
    x: leftWaistCurveMeetX + frontDartPlacementMm / 4.2,
    y: startY - 1.5,
  };
  const leftWaistCurveControl2 = {
    x: leftWaistPoint.x - 20,
    y: leftWaistPoint.y + 4,
  };
  const leftWaistCurveSamples = samplePathSegments([
    {
      kind: 'line',
      start: { x: leftX, y: startY },
      end: leftWaistCurveStart,
    },
    {
      kind: 'cubic',
      start: leftWaistCurveStart,
      control1: leftWaistCurveControl1,
      control2: leftWaistCurveControl2,
      end: leftWaistPoint,
    },
  ]);
  const frontDartTopPoint = pointOnSamplesAtX(
    leftWaistCurveSamples,
    frontDartX,
  );
  const frontDartLeftTopPoint = pointOnSamplesAtX(
    leftWaistCurveSamples,
    frontDartLeftX,
  );
  const adjustedFrontDart = solveDartWithFixedLeg({
    apex: { x: frontDartX, y: frontDartBottomY },
    left: frontDartLeftTopPoint,
    right: frontDartTopPoint,
    fixedSide: 'right',
  });
  const extraFrontDartRightSample = pointOnSamplesAtDistance(
    leftWaistCurveSamples,
    adjustedFrontDart.right.distanceFromStart + toMm(2),
  );
  const secondExtraFrontDartRightSample = pointOnSamplesAtDistance(
    leftWaistCurveSamples,
    adjustedFrontDart.right.distanceFromStart + toMm(4),
  );
  const secondExtraFrontDartRightPoint = secondExtraFrontDartRightSample.point;
  const secondExtraFrontDartGuideEndPoint = {
    x: secondExtraFrontDartRightPoint.x,
    y: hipMarkerY - toMm(1),
  };
  const adjustedSecondExtraFrontDart = solveDartWithFixedLeg({
    apex: secondExtraFrontDartGuideEndPoint,
    left: extraFrontDartRightSample,
    right: secondExtraFrontDartRightSample,
    fixedSide: 'right',
  });
  const waistMiddlePoint = { x: sideLineX, y: startY - raisedWaistDotMm };
  const rightWaistReferencePoint = rightWaistPoint;
  const backDartLeftTopPoint = {
    x: backDartX - halfBackDartWidthMm,
    y: startY,
  };
  const backDartRightTopPoint = {
    x: backDartX + halfBackDartWidthMm,
    y: startY,
  };
  const rightWaistCurveSamples = samplePathSegments([
    {
      kind: 'line',
      start: rightWaistCurveStartPoint,
      end: rightWaistCurveLineEndPoint,
    },
    {
      kind: 'quadratic',
      start: rightWaistCurveLineEndPoint,
      control: rightWaistCurveFirstControlPoint,
      end: rightWaistCurveMeetPoint,
    },
    {
      kind: 'quadratic',
      start: rightWaistCurveMeetPoint,
      control: rightWaistCurveSecondControlPoint,
      end: rightWaistPoint,
    },
  ]);
  const backDartLeftOnWaistCurve = pointOnSamplesAtX(
    rightWaistCurveSamples,
    backDartLeftTopPoint.x,
  );
  const backDartRightOnWaistCurve = pointOnSamplesAtX(
    rightWaistCurveSamples,
    backDartRightTopPoint.x,
  );
  const adjustedBackDart = solveDartWithFixedLeg({
    apex: { x: backDartX, y: backDartBottomY },
    left: backDartLeftOnWaistCurve,
    right: backDartRightOnWaistCurve,
    fixedSide: 'right',
  });
  const adjustedBackDartTopPoint = pointOnLineAtX(
    adjustedBackDart.right.point,
    adjustedBackDart.left.point,
    backDartX,
  );
  const rightWaistToBackDartLeftLengthMm =
    rightWaistCurveSamples[rightWaistCurveSamples.length - 1]
      .distanceFromStart - adjustedBackDart.left.distanceFromStart;
  const halfDistanceOnWaistCurve = pointOnSamplesAtDistance(
    rightWaistCurveSamples,
    rightWaistCurveSamples[rightWaistCurveSamples.length - 1]
      .distanceFromStart -
      rightWaistToBackDartLeftLengthMm / 2,
  );
  const halfDistanceWaistLinePoint = halfDistanceOnWaistCurve.point;
  const halfDistanceLeftWaistPoint = pointOnSamplesAtDistance(
    rightWaistCurveSamples,
    halfDistanceOnWaistCurve.distanceFromStart + toMm(0.75),
  );
  const halfDistanceRightWaistPoint = pointOnSamplesAtDistance(
    rightWaistCurveSamples,
    halfDistanceOnWaistCurve.distanceFromStart - toMm(0.75),
  );
  const halfDistanceGuideEndPoint = {
    x: halfDistanceWaistLinePoint.x,
    y: hipMarkerY - toMm(1),
  };
  const adjustedHalfDistanceDart = solveDartWithFixedLeg({
    apex: halfDistanceGuideEndPoint,
    left: halfDistanceLeftWaistPoint,
    right: halfDistanceRightWaistPoint,
    fixedSide: 'right',
  });
  const adjustedHalfDistanceTopPoint = pointOnLineAtX(
    adjustedHalfDistanceDart.right.point,
    adjustedHalfDistanceDart.left.point,
    halfDistanceGuideEndPoint.x,
  );
  const leftWaistCurvePath = buildWaistPathWithStraightDarts({
    samples: leftWaistCurveSamples,
    darts: [
      {
        startDistance: adjustedFrontDart.left.distanceFromStart,
        startPoint: adjustedFrontDart.left.point,
        endDistance: adjustedFrontDart.right.distanceFromStart,
        endPoint: adjustedFrontDart.right.point,
      },
      ...(hasSecondaryDarts
        ? [
            {
              startDistance:
                adjustedSecondExtraFrontDart.left.distanceFromStart,
              startPoint: adjustedSecondExtraFrontDart.left.point,
              endDistance: adjustedSecondExtraFrontDart.right.distanceFromStart,
              endPoint: adjustedSecondExtraFrontDart.right.point,
            },
          ]
        : []),
    ],
  });
  const rightWaistCurvePath = buildWaistPathWithStraightDarts({
    samples: rightWaistCurveSamples,
    darts: [
      {
        startDistance: adjustedBackDart.right.distanceFromStart,
        startPoint: adjustedBackDart.right.point,
        endDistance: adjustedBackDart.left.distanceFromStart,
        endPoint: adjustedBackDart.left.point,
      },
      ...(hasSecondaryDarts
        ? [
            {
              startDistance: adjustedHalfDistanceDart.right.distanceFromStart,
              startPoint: adjustedHalfDistanceDart.right.point,
              endDistance: adjustedHalfDistanceDart.left.distanceFromStart,
              endPoint: adjustedHalfDistanceDart.left.point,
            },
          ]
        : []),
    ],
  });
  return {
    units: 'mm',
    width,
    height,
    points: [
      { id: 'start', x: lineX, y: startY },
      { id: 'grundlineVisibleTop', x: lineX, y: loweredBackWaistY },
      { id: 'end', x: lineX, y: endY },
      { id: 'bottomLeft', x: leftX, y: endY },
      { id: 'topLeft', x: leftX, y: startY },
      { id: 'waistMiddle', x: waistMiddlePoint.x, y: waistMiddlePoint.y },
      {
        id: 'rightWaistReference',
        x: rightWaistReferencePoint.x,
        y: rightWaistReferencePoint.y,
      },
      ...(hasSecondaryDarts
        ? [
            {
              id: 'halfDistanceWaistLinePoint',
              x: adjustedHalfDistanceTopPoint.x,
              y: adjustedHalfDistanceTopPoint.y,
            },
            {
              id: 'halfDistanceLeftWaistPoint',
              x: adjustedHalfDistanceDart.left.point.x,
              y: adjustedHalfDistanceDart.left.point.y,
            },
            {
              id: 'halfDistanceRightWaistPoint',
              x: adjustedHalfDistanceDart.right.point.x,
              y: adjustedHalfDistanceDart.right.point.y,
            },
            {
              id: 'halfDistanceGuideEnd',
              x: halfDistanceGuideEndPoint.x,
              y: halfDistanceGuideEndPoint.y,
            },
          ]
        : []),
      { id: 'sideLineTop', x: sideLineX, y: seatMarkerY },
      { id: 'sideLineBottom', x: sideLineX, y: endY },
      {
        id: 'backDartTop',
        x: adjustedBackDartTopPoint.x,
        y: adjustedBackDartTopPoint.y,
      },
      { id: 'backDartBottom', x: backDartX, y: backDartBottomY },
      {
        id: 'frontDartTop',
        x: adjustedFrontDart.right.point.x,
        y: adjustedFrontDart.right.point.y,
      },
      { id: 'frontDartBottom', x: frontDartX, y: frontDartBottomY },
      {
        id: 'backDartWidthLeft',
        x: adjustedBackDart.left.point.x,
        y: adjustedBackDart.left.point.y,
      },
      {
        id: 'backDartWidthRight',
        x: adjustedBackDart.right.point.x,
        y: adjustedBackDart.right.point.y,
      },
      {
        id: 'frontDartWidthLeft',
        x: adjustedFrontDart.left.point.x,
        y: adjustedFrontDart.left.point.y,
      },
      ...(hasSecondaryDarts
        ? [
            {
              id: 'extraFrontDartRightPoint',
              x: adjustedSecondExtraFrontDart.left.point.x,
              y: adjustedSecondExtraFrontDart.left.point.y,
            },
            {
              id: 'secondExtraFrontDartRightPoint',
              x: adjustedSecondExtraFrontDart.right.point.x,
              y: adjustedSecondExtraFrontDart.right.point.y,
            },
            {
              id: 'secondExtraFrontDartGuideEnd',
              x: secondExtraFrontDartGuideEndPoint.x,
              y: secondExtraFrontDartGuideEndPoint.y,
            },
          ]
        : []),
      { id: 'hipMarkerStart', x: lineX, y: hipMarkerY },
      { id: 'hipMarkerEnd', x: leftX, y: hipMarkerY },
      { id: 'seatMarkerStart', x: lineX, y: seatMarkerY },
      { id: 'seatMarkerEnd', x: leftX, y: seatMarkerY },
      { id: 'lengthMeasureTop', x: lengthMeasureX, y: startY },
      {
        id: 'lengthMeasureUpperTextGap',
        x: lengthMeasureX,
        y: centerY - dimensionLabelGapMm,
      },
      {
        id: 'lengthMeasureLowerTextGap',
        x: lengthMeasureX,
        y: centerY + dimensionLabelGapMm,
      },
      { id: 'lengthMeasureBottom', x: lengthMeasureX, y: endY },
      { id: 'widthMeasureLeft', x: leftX, y: widthMeasureY },
      {
        id: 'widthMeasureLeftTextGap',
        x: widthCenterX - dimensionLabelGapMm,
        y: widthMeasureY,
      },
      {
        id: 'widthMeasureRightTextGap',
        x: widthCenterX + dimensionLabelGapMm,
        y: widthMeasureY,
      },
      { id: 'widthMeasureRight', x: lineX, y: widthMeasureY },
      { id: 'backArrowTop', x: lineX, y: grainlineTopY },
      { id: 'backArrowBottom', x: lineX, y: grainlineBottomY },
      { id: 'frontArrowTop', x: leftX, y: grainlineTopY },
      { id: 'frontArrowBottom', x: leftX, y: grainlineBottomY },
      {
        id: 'backArrowTopLeft',
        x: lineX - arrowSizeMm,
        y: grainlineTopY + arrowSizeMm,
      },
      {
        id: 'backArrowTopRight',
        x: lineX + arrowSizeMm,
        y: grainlineTopY + arrowSizeMm,
      },
      {
        id: 'backArrowBottomLeft',
        x: lineX - arrowSizeMm,
        y: grainlineBottomY - arrowSizeMm,
      },
      {
        id: 'backArrowBottomRight',
        x: lineX + arrowSizeMm,
        y: grainlineBottomY - arrowSizeMm,
      },
      {
        id: 'frontArrowTopLeft',
        x: leftX - arrowSizeMm,
        y: grainlineTopY + arrowSizeMm,
      },
      {
        id: 'frontArrowTopRight',
        x: leftX + arrowSizeMm,
        y: grainlineTopY + arrowSizeMm,
      },
      {
        id: 'frontArrowBottomLeft',
        x: leftX - arrowSizeMm,
        y: grainlineBottomY - arrowSizeMm,
      },
      {
        id: 'frontArrowBottomRight',
        x: leftX + arrowSizeMm,
        y: grainlineBottomY - arrowSizeMm,
      },
    ],
    markers: [],
    lines: [
      {
        id: 'grundlineHiddenTop',
        from: 'start',
        to: 'grundlineVisibleTop',
        kind: 'hidden',
      },
      {
        id: 'skirtLengthLine',
        from: 'grundlineVisibleTop',
        to: 'end',
        kind: 'outline',
      },
      {
        id: 'bottomWidthLine',
        from: 'end',
        to: 'bottomLeft',
        kind: 'outline',
      },
      {
        id: 'leftVerticalLine',
        from: 'bottomLeft',
        to: 'topLeft',
        kind: 'outline',
      },
      {
        id: 'waistLine',
        from: 'start',
        to: 'topLeft',
        kind: 'hidden',
      },
      {
        id: 'sideLine',
        from: 'sideLineTop',
        to: 'sideLineBottom',
        kind: 'outline',
      },
      {
        id: 'sideLineExtension',
        from: 'waistMiddle',
        to: 'sideLineTop',
        kind: 'hidden',
      },
      {
        id: 'hipHeightMarker',
        from: 'hipMarkerStart',
        to: 'hipMarkerEnd',
        kind: 'hidden',
      },
      ...(hasSecondaryDarts
        ? [
            {
              id: 'halfDistanceGuide',
              from: 'halfDistanceWaistLinePoint',
              to: 'halfDistanceGuideEnd',
              kind: 'hidden' as const,
            },
            {
              id: 'secondExtraFrontDartGuide',
              from: 'secondExtraFrontDartRightPoint',
              to: 'secondExtraFrontDartGuideEnd',
              kind: 'outline' as const,
            },
            {
              id: 'secondExtraFrontDartLeftLeg',
              from: 'secondExtraFrontDartGuideEnd',
              to: 'extraFrontDartRightPoint',
              kind: 'outline' as const,
            },
            {
              id: 'halfDistanceLeftGuide',
              from: 'halfDistanceLeftWaistPoint',
              to: 'halfDistanceGuideEnd',
              kind: 'outline' as const,
            },
            {
              id: 'halfDistanceRightGuide',
              from: 'halfDistanceRightWaistPoint',
              to: 'halfDistanceGuideEnd',
              kind: 'outline' as const,
            },
          ]
        : []),
      {
        id: 'seatHeightMarker',
        from: 'seatMarkerStart',
        to: 'seatMarkerEnd',
        kind: 'hidden',
      },
      {
        id: 'backDartGuide',
        from: 'backDartTop',
        to: 'backDartBottom',
        kind: 'hidden',
      },
      {
        id: 'backDartLeftLeg',
        from: 'backDartWidthLeft',
        to: 'backDartBottom',
        kind: 'outline',
      },
      {
        id: 'backDartRightLeg',
        from: 'backDartWidthRight',
        to: 'backDartBottom',
        kind: 'outline',
      },
      {
        id: 'frontDartGuide',
        from: 'frontDartTop',
        to: 'frontDartBottom',
        kind: 'outline',
      },
      {
        id: 'frontDartLeftLeg',
        from: 'frontDartWidthLeft',
        to: 'frontDartBottom',
        kind: 'outline',
      },
      {
        id: 'lengthMeasureUpper',
        from: 'lengthMeasureTop',
        to: 'lengthMeasureUpperTextGap',
        kind: 'hidden',
      },
      {
        id: 'lengthMeasureLower',
        from: 'lengthMeasureLowerTextGap',
        to: 'lengthMeasureBottom',
        kind: 'hidden',
      },
      {
        id: 'widthMeasureLeftLine',
        from: 'widthMeasureLeft',
        to: 'widthMeasureLeftTextGap',
        kind: 'hidden',
      },
      {
        id: 'widthMeasureRightLine',
        from: 'widthMeasureRightTextGap',
        to: 'widthMeasureRight',
        kind: 'hidden',
      },
      {
        id: 'backArrowTopLeftLine',
        from: 'backArrowTop',
        to: 'backArrowTopLeft',
        kind: 'hidden',
      },
      {
        id: 'backArrowTopRightLine',
        from: 'backArrowTop',
        to: 'backArrowTopRight',
        kind: 'hidden',
      },
      {
        id: 'backArrowBottomLeftLine',
        from: 'backArrowBottom',
        to: 'backArrowBottomLeft',
        kind: 'hidden',
      },
      {
        id: 'backArrowBottomRightLine',
        from: 'backArrowBottom',
        to: 'backArrowBottomRight',
        kind: 'hidden',
      },
      {
        id: 'frontArrowTopLeftLine',
        from: 'frontArrowTop',
        to: 'frontArrowTopLeft',
        kind: 'hidden',
      },
      {
        id: 'frontArrowTopRightLine',
        from: 'frontArrowTop',
        to: 'frontArrowTopRight',
        kind: 'hidden',
      },
      {
        id: 'frontArrowBottomLeftLine',
        from: 'frontArrowBottom',
        to: 'frontArrowBottomLeft',
        kind: 'hidden',
      },
      {
        id: 'frontArrowBottomRightLine',
        from: 'frontArrowBottom',
        to: 'frontArrowBottomRight',
        kind: 'hidden',
      },
    ],
    paths: [
      { id: 'leftWaistlineCurve', d: leftWaistCurvePath, kind: 'outline' },
      { id: 'waistlineCurve', d: rightWaistCurvePath, kind: 'outline' },
      { id: 'leftCurve', d: leftCurvePath, kind: 'outline' },
      { id: 'rightCurve', d: rightCurvePath, kind: 'outline' },
    ],
    labels: [
      {
        id: 'centerBackLabel',
        text: t('centerBack'),
        x: lineX - 12,
        y: endY - 66,
        rotate: 90,
      },
      {
        id: 'centerFrontLabel',
        text: t('centerFront'),
        x: leftX + 12,
        y: endY - 66,
        rotate: 90,
      },
      {
        id: 'sideLineLabel',
        text: t('sideLineLabel'),
        x: sideLineX + 12,
        y: endY - 66,
        rotate: 90,
      },
    ],
    highlightPathIds: ['leftWaistlineCurve', 'waistlineCurve'],
  };
}
