import type { Profile } from '../../../types/measurements';
import { formatMeasurement } from '../../measurements';
import {
  cubicTangentAtX,
  cubicYAtX,
  offsetClosedPolyline,
  pointsToPath,
  sampleCubicSegmentByXRange,
  sampleCubicSegmentPointsByXRange,
  sampleQuadraticPoints,
  smoothPolylinePoints,
} from '../geometry';
import type { CubicSeamCurve, Point } from '../geometry';
import {
  buildTruedDartSeamSegments,
  solveFrontVerticalDartTop,
} from '../dartSeams';
import type { PatternCalculation, PatternDraft, Translate } from '../types';

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

type SideSeamBuild = {
  path: string;
  points: Point[];
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

function quadraticPath(start: Point, control: Point, end: Point) {
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

function pointOnCubicSeam(curve: CubicSeamCurve, x: number): Point {
  return {
    x,
    y: cubicYAtX({ curve, x }),
  };
}

function pointsMatch(a: Point, b: Point, epsilon = 0.001) {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

function combinePointSegments(...segments: Point[][]) {
  const combined: Point[] = [];

  for (const segment of segments) {
    if (segment.length === 0) {
      continue;
    }

    if (combined.length === 0) {
      combined.push(...segment);
      continue;
    }

    const startIndex = pointsMatch(combined[combined.length - 1], segment[0])
      ? 1
      : 0;

    combined.push(...segment.slice(startIndex));
  }

  return combined;
}

function reversePoints(points: Point[]) {
  return [...points].reverse();
}

function translatePathDataX(path: string, dx: number) {
  const tokens = path.match(/[MLQCZ]|-?\d*\.?\d+/g);

  if (!tokens || dx === 0) {
    return path;
  }

  let command = '';
  let valueIndex = 0;

  return tokens
    .map((token) => {
      if (/^[MLQCZ]$/.test(token)) {
        command = token;
        valueIndex = 0;
        return token;
      }

      const value = Number(token);
      let isX = false;

      if (command === 'M' || command === 'L') {
        isX = valueIndex % 2 === 0;
      } else if (command === 'Q') {
        isX = valueIndex === 0 || valueIndex === 2;
      } else if (command === 'C') {
        isX = valueIndex === 0 || valueIndex === 2 || valueIndex === 4;
      }

      valueIndex += 1;
      return String(isX ? value + dx : value);
    })
    .join(' ');
}

function splitAllowancePointsAtCenterRun({
  points,
  centerX,
  splitY,
  epsilon = 0.75,
}: {
  points: Point[];
  centerX: number;
  splitY: number;
  epsilon?: number;
}) {
  const centerIndices = points
    .map((point, index) => ({ point, index }))
    .filter(
      ({ point }) =>
        Math.abs(point.x - centerX) <= epsilon && point.y >= splitY - epsilon,
    )
    .map(({ index }) => index);

  if (centerIndices.length < 2) {
    return [points];
  }

  const firstIndex = centerIndices[0];
  const lastIndex = centerIndices[centerIndices.length - 1];

  return [points.slice(0, firstIndex + 1), points.slice(lastIndex)].filter(
    (segment) => segment.length > 1,
  );
}

function appendBoundarySegment({
  boundaryPoints,
  edgeOffsets,
  segmentPoints,
  edgeOffset,
}: {
  boundaryPoints: Point[];
  edgeOffsets: number[];
  segmentPoints: Point[];
  edgeOffset: number;
}) {
  if (segmentPoints.length === 0) {
    return;
  }

  if (boundaryPoints.length === 0) {
    boundaryPoints.push(segmentPoints[0]);
  }

  const startIndex = pointsMatch(
    boundaryPoints[boundaryPoints.length - 1],
    segmentPoints[0],
  )
    ? 1
    : 0;

  for (let i = startIndex; i < segmentPoints.length; i += 1) {
    const point = segmentPoints[i];

    if (pointsMatch(boundaryPoints[boundaryPoints.length - 1], point)) {
      continue;
    }

    edgeOffsets.push(edgeOffset);
    boundaryPoints.push(point);
  }
}

function buildSideSeam({
  start,
  lowerControl,
  hipPoint,
  upperControl,
  waistPoint,
  steps,
}: {
  start: Point;
  lowerControl: Point;
  hipPoint: Point;
  upperControl: Point;
  waistPoint: Point;
  steps: number;
}): SideSeamBuild {
  const lowerPoints = sampleQuadraticPoints({
    start,
    control: lowerControl,
    end: hipPoint,
    steps,
  });
  const upperPoints = sampleQuadraticPoints({
    start: hipPoint,
    control: upperControl,
    end: waistPoint,
    steps,
  });

  return {
    path: [
      quadraticPath(start, lowerControl, hipPoint),
      `Q ${upperControl.x} ${upperControl.y} ${waistPoint.x} ${waistPoint.y}`,
    ].join(' '),
    points: combinePointSegments(lowerPoints, upperPoints),
  };
}

function buildPieceSeamAllowancePaths({
  boundaryStart,
  boundaryEnd,
  hemInnerPoint,
  hemOuterPoint,
  sideSeamPoints,
  waistSeamPoints,
  seamAllowanceMm,
  smoothingPasses,
  splitCenterX,
  splitY,
}: {
  boundaryStart: Point;
  boundaryEnd: Point;
  hemInnerPoint: Point;
  hemOuterPoint: Point;
  sideSeamPoints: Point[];
  waistSeamPoints: Point[];
  seamAllowanceMm: number;
  smoothingPasses: number;
  splitCenterX: number;
  splitY: number;
}) {
  const boundaryPoints: Point[] = [];
  const boundaryOffsets: number[] = [];

  appendBoundarySegment({
    boundaryPoints,
    edgeOffsets: boundaryOffsets,
    segmentPoints: [boundaryStart, boundaryEnd],
    edgeOffset: 0,
  });
  appendBoundarySegment({
    boundaryPoints,
    edgeOffsets: boundaryOffsets,
    segmentPoints: [hemInnerPoint, hemOuterPoint],
    edgeOffset: seamAllowanceMm,
  });
  appendBoundarySegment({
    boundaryPoints,
    edgeOffsets: boundaryOffsets,
    segmentPoints: sideSeamPoints,
    edgeOffset: seamAllowanceMm,
  });
  appendBoundarySegment({
    boundaryPoints,
    edgeOffsets: boundaryOffsets,
    segmentPoints: reversePoints(waistSeamPoints),
    edgeOffset: seamAllowanceMm,
  });

  if (
    boundaryPoints.length > 1 &&
    pointsMatch(boundaryPoints[boundaryPoints.length - 1], boundaryPoints[0])
  ) {
    boundaryPoints.pop();
  }

  const smoothedBoundaryPoints = smoothPolylinePoints({
    points: boundaryPoints,
    passes: smoothingPasses,
    cornerAngleDeg: 18,
  });

  const seamAllowancePoints = offsetClosedPolyline({
    points: smoothedBoundaryPoints,
    edgeOffsets: boundaryOffsets,
  });

  return splitAllowancePointsAtCenterRun({
    points: seamAllowancePoints,
    centerX: splitCenterX,
    splitY,
  }).map((segment) => pointsToPath(segment));
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
    values.get('highHipCircumference') ??
    profile.measurements.highHipCircumference;
  const seatWidthCm =
    values.get('hipCircumference') ?? profile.measurements.hipCircumference;
  const sideLineWaistCm = values.get('sideLineWaist') ?? 0;
  const sideLineHipCm = values.get('sideLineHip') ?? 0;
  const backDartPlacementCm = values.get('backDartPlacement') ?? 0;
  const frontDartPlacementCm = values.get('frontDartPlacement') ?? 0;
  const backDartWidthCm = values.get('backDartWidth') ?? 0;
  const frontDartWidthCm = values.get('frontDartWidth') ?? 0;

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

  const raisedWaistDotMm = 15;
  const loweredBackWaistMm = 5;
  const frontDartDepthMm = 10;

  const marginMm = 56;
  const rightLabelSpaceMm = 88;
  const grainlineInsetY = 22;
  const arrowSizeMm = 7;
  const waistTrueingOffsetMm = 35;
  const seamAllowanceMm = 10;
  const pieceSpacingMm = 100;
  const printTestSquareSizeMm = 40;
  const printTestSquareInsetMm = 16;
  const printTestSquareTextInsetMm = 8;
  const seamAllowanceLabelGapMm = 12;
  const helperTextDropMm = 2;
  const seamCurveSamplingSteps = 72;
  const seamAllowanceSmoothingPasses = 0;

  const lowerCurveOffsetMm = 2;
  const lowerCurveLiftMm = 8;
  const upperCurveOffsetMm = 6;
  const upperCurveDropMm = 20;

  validateDraftInputs({ skirtLengthMm, hipHeightMm, hipDepthMm });

  const layout = createLayout({
    bottomWidthMm,
    skirtLengthMm,
    leftMeasureSpaceMm: marginMm,
    rightLabelSpaceMm: marginMm + rightLabelSpaceMm,
    topBottomMarginMm: marginMm,
  });

  const { width, height, leftX, lineX, sideLineX, startY, endY } = layout;
  const centerFrontX = leftX;
  const centerBackX = lineX;
  const loweredBackWaistY = startY + loweredBackWaistMm;
  const hipMarkerY = startY + hipHeightMm;
  const seatMarkerY = startY + hipDepthMm;

  const grainlineTopY = startY + grainlineInsetY;
  const grainlineBottomY = endY - grainlineInsetY;
  const printTestSquareLeftX = (width - printTestSquareSizeMm) / 2;
  const printTestSquareRightX = printTestSquareLeftX + printTestSquareSizeMm;
  const printTestSquareTopY = startY - printTestSquareSizeMm;
  const printTestSquareBottomY = printTestSquareTopY + printTestSquareSizeMm;
  const printTestSquareCenterX =
    printTestSquareLeftX + printTestSquareSizeMm / 2;
  const printTestSquareCenterY =
    printTestSquareTopY + printTestSquareSizeMm / 2;
  const seamAllowanceLabelText = `Seam allowance included: ${formatMeasurement(seamAllowanceMm / 10)} cm`;
  const estimatedSeamAllowanceLabelWidth =
    seamAllowanceLabelText.length * 8.8;
  const seamAllowanceLabelHalfWidth =
    estimatedSeamAllowanceLabelWidth / 2;
  const seamAllowanceLabelX = Math.min(
    width - seamAllowanceLabelHalfWidth - printTestSquareInsetMm,
    Math.max(
      seamAllowanceLabelHalfWidth + printTestSquareInsetMm,
      printTestSquareCenterX,
    ),
  );
  const seamAllowanceLabelY =
    printTestSquareTopY - seamAllowanceLabelGapMm + helperTextDropMm;

  // Step 1: Establish drafting points from measurements.
  const backDartCenterX = centerBackX - backDartPlacementMm;
  const backDartBottomY = hipMarkerY + (seatMarkerY - hipMarkerY) / 2;

  const frontDartX = sideLineX - halfSideLineWaistMm - frontDartPlacementMm;
  const frontDartLeftX = frontDartX - frontDartWidthMm;
  const frontDartBottomY = hipMarkerY - frontDartDepthMm;

  const frontSideWaistPoint = {
    x: sideLineX - halfSideLineWaistMm,
    y: startY - raisedWaistDotMm,
  };
  const frontSideHipPoint = {
    x: sideLineX - halfSideLineHipMm,
    y: hipMarkerY,
  };
  const backSideWaistPoint = {
    x: sideLineX + halfSideLineWaistMm,
    y: startY - raisedWaistDotMm,
  };
  const backSideHipPoint = {
    x: sideLineX + halfSideLineHipMm,
    y: hipMarkerY,
  };
  const sideSeamSeatPoint = { x: sideLineX, y: seatMarkerY };

  // Step 2: Build the side seam shaping curves.
  const frontSideSeam = buildSideSeam({
    start: sideSeamSeatPoint,
    lowerControl: {
      x: sideLineX - lowerCurveOffsetMm,
      y: seatMarkerY - lowerCurveLiftMm,
    },
    hipPoint: frontSideHipPoint,
    upperControl: {
      x: frontSideHipPoint.x - upperCurveOffsetMm,
      y: frontSideWaistPoint.y + upperCurveDropMm,
    },
    waistPoint: frontSideWaistPoint,
    steps: seamCurveSamplingSteps,
  });

  const backSideSeam = buildSideSeam({
    start: sideSeamSeatPoint,
    lowerControl: {
      x: sideLineX + lowerCurveOffsetMm,
      y: seatMarkerY - lowerCurveLiftMm,
    },
    hipPoint: backSideHipPoint,
    upperControl: {
      x: backSideHipPoint.x + upperCurveOffsetMm,
      y: backSideWaistPoint.y + upperCurveDropMm,
    },
    waistPoint: backSideWaistPoint,
    steps: seamCurveSamplingSteps,
  });

  // Step 3: Define the front and back waist seam curves.
  const backWaistCurve: CubicSeamCurve = {
    start: { x: centerBackX, y: loweredBackWaistY },
    control1: {
      x: centerBackX - (centerBackX - backSideWaistPoint.x) * 0.32,
      y: loweredBackWaistY + 1,
    },
    control2: {
      x: centerBackX - (centerBackX - backSideWaistPoint.x) * 0.76,
      y: backSideWaistPoint.y + 2,
    },
    end: backSideWaistPoint,
    increasing: false,
    startBoundaryY: loweredBackWaistY,
    endBoundaryY: backSideWaistPoint.y,
  };

  const frontWaistCurve: CubicSeamCurve = {
    start: { x: centerFrontX, y: startY },
    control1: {
      x: centerFrontX + (frontSideWaistPoint.x - centerFrontX) * 0.3,
      y: startY,
    },
    control2: {
      x: centerFrontX + (frontSideWaistPoint.x - centerFrontX) * 0.78,
      y: frontSideWaistPoint.y + 2,
    },
    end: frontSideWaistPoint,
    increasing: true,
    startBoundaryY: startY,
    endBoundaryY: frontSideWaistPoint.y,
  };

  // Front dart: one side vertical by design, but trued so the sewn waistline is smoother.
  const frontDartBottom = { x: frontDartX, y: frontDartBottomY };
  const frontDartLeftTop = pointOnCubicSeam(frontWaistCurve, frontDartLeftX);

  const frontDartRightTop = solveFrontVerticalDartTop({
    apex: frontDartBottom,
    leftTop: frontDartLeftTop,
    rightX: frontDartX,
  });

  // Back dart: symmetric legs, then trued in the closed state.
  const backDartTopY = cubicYAtX({ curve: backWaistCurve, x: backDartCenterX });

  const backDartLeftTop = {
    x: backDartCenterX - halfBackDartWidthMm,
    y: backDartTopY,
  };
  const backDartRightTop = {
    x: backDartCenterX + halfBackDartWidthMm,
    y: backDartTopY,
  };
  const backDartBottom = { x: backDartCenterX, y: backDartBottomY };

  const frontLeftAnchorX = Math.max(
    leftX,
    frontDartLeftX - waistTrueingOffsetMm,
  );
  const frontRightAnchorX = Math.min(
    frontSideWaistPoint.x,
    frontDartX + waistTrueingOffsetMm,
  );

  const frontLeftAnchor = pointOnCubicSeam(frontWaistCurve, frontLeftAnchorX);
  const frontRightAnchor = pointOnCubicSeam(frontWaistCurve, frontRightAnchorX);

  const frontLeftAnchorTangent = cubicTangentAtX({
    curve: frontWaistCurve,
    x: frontLeftAnchorX,
  });

  const frontRightAnchorTangent = cubicTangentAtX({
    curve: frontWaistCurve,
    x: frontRightAnchorX,
  });

  const backLeftAnchorX = Math.min(
    centerBackX,
    backDartRightTop.x + waistTrueingOffsetMm,
  );
  const backRightAnchorX = Math.max(
    backSideWaistPoint.x,
    backDartLeftTop.x - waistTrueingOffsetMm,
  );

  const backLeftAnchor = pointOnCubicSeam(backWaistCurve, backLeftAnchorX);
  const backRightAnchor = pointOnCubicSeam(backWaistCurve, backRightAnchorX);

  const backLeftAnchorTangent = cubicTangentAtX({
    curve: backWaistCurve,
    x: backLeftAnchorX,
  });

  const backRightAnchorTangent = cubicTangentAtX({
    curve: backWaistCurve,
    x: backRightAnchorX,
  });

  const frontTruedWaist = buildTruedDartSeamSegments({
    apex: frontDartBottom,
    leftTop: frontDartLeftTop,
    rightTop: frontDartRightTop,
    leftAnchor: frontLeftAnchor,
    rightAnchor: frontRightAnchor,
    leftAnchorTangent: frontLeftAnchorTangent,
    rightAnchorTangent: frontRightAnchorTangent,
  });

  const backTruedWaist = buildTruedDartSeamSegments({
    apex: backDartBottom,
    leftTop: backDartRightTop,
    rightTop: backDartLeftTop,
    leftAnchor: backLeftAnchor,
    rightAnchor: backRightAnchor,
    leftAnchorTangent: backLeftAnchorTangent,
    rightAnchorTangent: backRightAnchorTangent,
  });

  const frontWaistSegmentLeftPath = frontTruedWaist.leftPath;
  const frontWaistSegmentRightPath = frontTruedWaist.rightPath;
  const backWaistSegmentLeftPath = backTruedWaist.leftPath;
  const backWaistSegmentRightPath = backTruedWaist.rightPath;

  const frontWaistOuterLeftPoints = sampleCubicSegmentPointsByXRange({
    curve: frontWaistCurve,
    startX: centerFrontX,
    endX: frontLeftAnchorX,
    steps: seamCurveSamplingSteps,
  });

  const frontWaistOuterRightPoints = sampleCubicSegmentPointsByXRange({
    curve: frontWaistCurve,
    startX: frontRightAnchorX,
    endX: frontSideWaistPoint.x,
    steps: seamCurveSamplingSteps,
  });

  const backWaistOuterLeftPoints = sampleCubicSegmentPointsByXRange({
    curve: backWaistCurve,
    startX: centerBackX,
    endX: backLeftAnchorX,
    steps: seamCurveSamplingSteps,
  });

  const backWaistOuterRightPoints = sampleCubicSegmentPointsByXRange({
    curve: backWaistCurve,
    startX: backRightAnchorX,
    endX: backSideWaistPoint.x,
    steps: seamCurveSamplingSteps,
  });

  const frontWaistOuterLeftPath = sampleCubicSegmentByXRange({
    curve: frontWaistCurve,
    startX: centerFrontX,
    endX: frontLeftAnchorX,
    steps: seamCurveSamplingSteps,
  });

  const frontWaistOuterRightPath = sampleCubicSegmentByXRange({
    curve: frontWaistCurve,
    startX: frontRightAnchorX,
    endX: frontSideWaistPoint.x,
    steps: seamCurveSamplingSteps,
  });

  const backWaistOuterLeftPath = sampleCubicSegmentByXRange({
    curve: backWaistCurve,
    startX: centerBackX,
    endX: backLeftAnchorX,
    steps: seamCurveSamplingSteps,
  });

  const backWaistOuterRightPath = sampleCubicSegmentByXRange({
    curve: backWaistCurve,
    startX: backRightAnchorX,
    endX: backSideWaistPoint.x,
    steps: seamCurveSamplingSteps,
  });

  const frontWaistSeamPoints = combinePointSegments(
    frontWaistOuterLeftPoints,
    frontTruedWaist.leftPoints,
    frontTruedWaist.rightPoints,
    frontWaistOuterRightPoints,
  );
  const backWaistSeamPoints = combinePointSegments(
    backWaistOuterLeftPoints,
    backTruedWaist.leftPoints,
    backTruedWaist.rightPoints,
    backWaistOuterRightPoints,
  );

  const frontSeamAllowancePaths = buildPieceSeamAllowancePaths({
    boundaryStart: frontWaistCurve.start,
    boundaryEnd: { x: centerFrontX, y: endY },
    hemInnerPoint: { x: centerFrontX, y: endY },
    hemOuterPoint: { x: sideLineX, y: endY },
    sideSeamPoints: frontSideSeam.points,
    waistSeamPoints: frontWaistSeamPoints,
    seamAllowanceMm,
    smoothingPasses: seamAllowanceSmoothingPasses,
    splitCenterX: sideLineX,
    splitY: seatMarkerY,
  });

  const backSeamAllowancePaths = buildPieceSeamAllowancePaths({
    boundaryStart: backWaistCurve.start,
    boundaryEnd: { x: centerBackX, y: endY },
    hemInnerPoint: { x: centerBackX, y: endY },
    hemOuterPoint: { x: sideLineX, y: endY },
    sideSeamPoints: backSideSeam.points,
    waistSeamPoints: backWaistSeamPoints,
    seamAllowanceMm,
    smoothingPasses: seamAllowanceSmoothingPasses,
    splitCenterX: sideLineX,
    splitY: seatMarkerY,
  });

  const shiftedBackPieceX = pieceSpacingMm;
  const draftWidth = width + pieceSpacingMm;

  const shiftedBackWaistOuterLeftPath = translatePathDataX(
    backWaistOuterLeftPath,
    shiftedBackPieceX,
  );
  const shiftedBackWaistSegmentLeftPath = translatePathDataX(
    backWaistSegmentLeftPath,
    shiftedBackPieceX,
  );
  const shiftedBackWaistSegmentRightPath = translatePathDataX(
    backWaistSegmentRightPath,
    shiftedBackPieceX,
  );
  const shiftedBackWaistOuterRightPath = translatePathDataX(
    backWaistOuterRightPath,
    shiftedBackPieceX,
  );
  const shiftedBackSideSeamPath = translatePathDataX(
    backSideSeam.path,
    shiftedBackPieceX,
  );
  const shiftedBackSeamAllowancePaths = backSeamAllowancePaths.map((path) =>
    translatePathDataX(path, shiftedBackPieceX),
  );

  return {
    units: 'mm',
    width: draftWidth,
    height,
    points: [
      { id: 'start', x: centerBackX + shiftedBackPieceX, y: startY },
      {
        id: 'grundlineVisibleTop',
        x: centerBackX + shiftedBackPieceX,
        y: loweredBackWaistY,
      },
      { id: 'end', x: centerBackX + shiftedBackPieceX, y: endY },
      { id: 'bottomLeft', x: centerFrontX, y: endY },
      { id: 'topLeft', x: centerFrontX, y: startY },
      { id: 'waistMiddle', x: sideLineX, y: startY - raisedWaistDotMm },
      { id: 'frontSideSeat', x: sideLineX, y: seatMarkerY },
      { id: 'frontSideHem', x: sideLineX, y: endY },
      { id: 'backSideSeat', x: sideLineX + shiftedBackPieceX, y: seatMarkerY },
      { id: 'backSideHem', x: sideLineX + shiftedBackPieceX, y: endY },
      {
        id: 'backDartTop',
        x: backDartCenterX + shiftedBackPieceX,
        y: backDartTopY,
      },
      {
        id: 'backDartBottom',
        x: backDartBottom.x + shiftedBackPieceX,
        y: backDartBottom.y,
      },
      { id: 'frontDartTop', x: frontDartRightTop.x, y: frontDartRightTop.y },
      { id: 'frontDartBottom', x: frontDartBottom.x, y: frontDartBottom.y },
      {
        id: 'backDartWidthLeft',
        x: backDartLeftTop.x + shiftedBackPieceX,
        y: backDartLeftTop.y,
      },
      {
        id: 'backDartWidthRight',
        x: backDartRightTop.x + shiftedBackPieceX,
        y: backDartRightTop.y,
      },
      {
        id: 'frontDartWidthLeft',
        x: frontDartLeftTop.x,
        y: frontDartLeftTop.y,
      },
      {
        id: 'frontDartCenterGuideTop',
        x: (frontDartX + frontDartLeftX) / 2,
        y: (frontDartRightTop.y + frontDartLeftTop.y) / 2,
      },
      {
        id: 'backArrowTop',
        x: centerBackX + shiftedBackPieceX,
        y: grainlineTopY,
      },
      {
        id: 'backArrowBottom',
        x: centerBackX + shiftedBackPieceX,
        y: grainlineBottomY,
      },
      { id: 'frontArrowTop', x: centerFrontX, y: grainlineTopY },
      { id: 'frontArrowBottom', x: centerFrontX, y: grainlineBottomY },
      {
        id: 'backArrowTopLeft',
        x: centerBackX - arrowSizeMm + shiftedBackPieceX,
        y: grainlineTopY + arrowSizeMm,
      },
      {
        id: 'backArrowTopRight',
        x: centerBackX + arrowSizeMm + shiftedBackPieceX,
        y: grainlineTopY + arrowSizeMm,
      },
      {
        id: 'backArrowBottomLeft',
        x: centerBackX - arrowSizeMm + shiftedBackPieceX,
        y: grainlineBottomY - arrowSizeMm,
      },
      {
        id: 'backArrowBottomRight',
        x: centerBackX + arrowSizeMm + shiftedBackPieceX,
        y: grainlineBottomY - arrowSizeMm,
      },
      {
        id: 'frontArrowTopLeft',
        x: centerFrontX - arrowSizeMm,
        y: grainlineTopY + arrowSizeMm,
      },
      {
        id: 'frontArrowTopRight',
        x: centerFrontX + arrowSizeMm,
        y: grainlineTopY + arrowSizeMm,
      },
      {
        id: 'frontArrowBottomLeft',
        x: centerFrontX - arrowSizeMm,
        y: grainlineBottomY - arrowSizeMm,
      },
      {
        id: 'frontArrowBottomRight',
        x: centerFrontX + arrowSizeMm,
        y: grainlineBottomY - arrowSizeMm,
      },
      {
        id: 'printTestSquareTopLeft',
        x: printTestSquareLeftX,
        y: printTestSquareTopY,
      },
      {
        id: 'printTestSquareTopRight',
        x: printTestSquareRightX,
        y: printTestSquareTopY,
      },
      {
        id: 'printTestSquareBottomRight',
        x: printTestSquareRightX,
        y: printTestSquareBottomY,
      },
      {
        id: 'printTestSquareBottomLeft',
        x: printTestSquareLeftX,
        y: printTestSquareBottomY,
      },
    ],
    lines: [
      {
        id: 'skirtLengthLine',
        from: 'grundlineVisibleTop',
        to: 'end',
        kind: 'outline',
      },
      {
        id: 'frontHemLine',
        from: 'bottomLeft',
        to: 'frontSideHem',
        kind: 'seam',
      },
      {
        id: 'backHemLine',
        from: 'backSideHem',
        to: 'end',
        kind: 'seam',
      },
      {
        id: 'leftVerticalLine',
        from: 'bottomLeft',
        to: 'topLeft',
        kind: 'outline',
      },
      {
        id: 'frontSideSeamStraight',
        from: 'frontSideSeat',
        to: 'frontSideHem',
        kind: 'seam',
      },
      {
        id: 'backSideSeamStraight',
        from: 'backSideSeat',
        to: 'backSideHem',
        kind: 'seam',
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
        id: 'backArrowTopLeftLine',
        from: 'backArrowTop',
        to: 'backArrowTopLeft',
        kind: 'grainline',
      },
      {
        id: 'backArrowTopRightLine',
        from: 'backArrowTop',
        to: 'backArrowTopRight',
        kind: 'grainline',
      },
      {
        id: 'backArrowBottomLeftLine',
        from: 'backArrowBottom',
        to: 'backArrowBottomLeft',
        kind: 'grainline',
      },
      {
        id: 'backArrowBottomRightLine',
        from: 'backArrowBottom',
        to: 'backArrowBottomRight',
        kind: 'grainline',
      },
      {
        id: 'frontArrowTopLeftLine',
        from: 'frontArrowTop',
        to: 'frontArrowTopLeft',
        kind: 'grainline',
      },
      {
        id: 'frontArrowTopRightLine',
        from: 'frontArrowTop',
        to: 'frontArrowTopRight',
        kind: 'grainline',
      },
      {
        id: 'frontArrowBottomLeftLine',
        from: 'frontArrowBottom',
        to: 'frontArrowBottomLeft',
        kind: 'grainline',
      },
      {
        id: 'frontArrowBottomRightLine',
        from: 'frontArrowBottom',
        to: 'frontArrowBottomRight',
        kind: 'grainline',
      },
      {
        id: 'printTestSquareTop',
        from: 'printTestSquareTopLeft',
        to: 'printTestSquareTopRight',
        kind: 'guide',
      },
      {
        id: 'printTestSquareRight',
        from: 'printTestSquareTopRight',
        to: 'printTestSquareBottomRight',
        kind: 'guide',
      },
      {
        id: 'printTestSquareBottom',
        from: 'printTestSquareBottomRight',
        to: 'printTestSquareBottomLeft',
        kind: 'guide',
      },
      {
        id: 'printTestSquareLeft',
        from: 'printTestSquareBottomLeft',
        to: 'printTestSquareTopLeft',
        kind: 'guide',
      },
    ],
    paths: [
      {
        id: 'frontWaistOuterLeft',
        d: frontWaistOuterLeftPath,
        kind: 'seam',
      },
      {
        id: 'frontWaistSegmentLeft',
        d: frontWaistSegmentLeftPath,
        kind: 'seam',
      },
      {
        id: 'frontWaistSegmentRight',
        d: frontWaistSegmentRightPath,
        kind: 'seam',
      },
      {
        id: 'frontWaistOuterRight',
        d: frontWaistOuterRightPath,
        kind: 'seam',
      },
      {
        id: 'backWaistOuterLeft',
        d: shiftedBackWaistOuterLeftPath,
        kind: 'seam',
      },
      {
        id: 'backWaistSegmentLeft',
        d: shiftedBackWaistSegmentLeftPath,
        kind: 'seam',
      },
      {
        id: 'backWaistSegmentRight',
        d: shiftedBackWaistSegmentRightPath,
        kind: 'seam',
      },
      {
        id: 'backWaistOuterRight',
        d: shiftedBackWaistOuterRightPath,
        kind: 'seam',
      },
      { id: 'frontSideSeam', d: frontSideSeam.path, kind: 'seam' },
      { id: 'backSideSeam', d: shiftedBackSideSeamPath, kind: 'seam' },
      ...frontSeamAllowancePaths.map((path, index) => ({
        id: `frontSeamAllowance${index + 1}`,
        d: path,
        kind: 'seamAllowance' as const,
      })),
      ...shiftedBackSeamAllowancePaths.map((path, index) => ({
        id: `backSeamAllowance${index + 1}`,
        d: path,
        kind: 'seamAllowance' as const,
      })),
    ],
    labels: [
      {
        id: 'centerBackLabel',
        text: t('centerBack'),
        x: centerBackX - 12 + shiftedBackPieceX,
        y: endY - 116,
        rotate: 90,
      },
      {
        id: 'centerFrontLabel',
        text: t('centerFront'),
        x: centerFrontX + 12,
        y: endY - 116,
        rotate: 90,
      },
      {
        id: 'seamAllowanceLabel',
        text: seamAllowanceLabelText,
        x: seamAllowanceLabelX,
        y: seamAllowanceLabelY,
        kind: 'guide',
      },
      {
        id: 'printTestSquareLabel',
        text: '4 cm',
        x: printTestSquareCenterX,
        y: printTestSquareCenterY + printTestSquareTextInsetMm / 2 + helperTextDropMm,
        kind: 'guide',
      },
    ],
  };
}
