import {
  cubicControlsFromTangents,
  normalizeVector,
  pointsToPath,
  rotatePoint,
  rotateVector,
  sampleCubicPoints,
} from './geometry';
import type { Point } from './geometry';

export type DartSpec = {
  apex: Point;
  leftTop: Point;
  rightTop: Point;
};

export type DartConstraint =
  | { kind: 'none' }
  | { kind: 'verticalRightLeg'; x: number };

export type DartClosureResult = {
  leftAngle: number;
  rightAngle: number;
  closureAngle: number;
};

export type TruedDartSeamResult = {
  leftPath: string;
  rightPath: string;
  leftPoints: Point[];
  rightPoints: Point[];
  closureAngle: number;
  closedRightTop: Point;
  mergedTop: Point;
};

export function getDartLegAngles({ apex, leftTop, rightTop }: DartSpec) {
  return {
    leftAngle: Math.atan2(leftTop.y - apex.y, leftTop.x - apex.x),
    rightAngle: Math.atan2(rightTop.y - apex.y, rightTop.x - apex.x),
  };
}

export function getDartClosureAngle(dart: DartSpec) {
  const { leftAngle, rightAngle } = getDartLegAngles(dart);

  return leftAngle - rightAngle;
}

export function getDartClosureResult(dart: DartSpec): DartClosureResult {
  const { leftAngle, rightAngle } = getDartLegAngles(dart);

  return {
    leftAngle,
    rightAngle,
    closureAngle: leftAngle - rightAngle,
  };
}

export function closePointAroundDart({
  point,
  apex,
  closureAngle,
}: {
  point: Point;
  apex: Point;
  closureAngle: number;
}) {
  return rotatePoint(point, apex, closureAngle);
}

export function openPointAroundDart({
  point,
  apex,
  closureAngle,
}: {
  point: Point;
  apex: Point;
  closureAngle: number;
}) {
  return rotatePoint(point, apex, -closureAngle);
}

export function solveConstrainedDartTop({
  apex,
  otherTop,
  constraint,
}: {
  apex: Point;
  otherTop: Point;
  constraint: DartConstraint;
}) {
  if (constraint.kind === 'none') {
    return otherTop;
  }

  const dxLeft = otherTop.x - apex.x;
  const dyLeft = otherTop.y - apex.y;
  const radius = Math.hypot(dxLeft, dyLeft);
  const dxRight = constraint.x - apex.x;

  if (Math.abs(dxRight) > radius) {
    return {
      x: constraint.x,
      y: otherTop.y,
    };
  }

  const dyMagnitude = Math.sqrt(
    Math.max(radius * radius - dxRight * dxRight, 0),
  );

  return {
    x: constraint.x,
    y: apex.y - dyMagnitude,
  };
}

export function solveFrontVerticalDartTop({
  apex,
  leftTop,
  rightX,
}: {
  apex: Point;
  leftTop: Point;
  rightX: number;
}) {
  return solveConstrainedDartTop({
    apex,
    otherTop: leftTop,
    constraint: { kind: 'verticalRightLeg', x: rightX },
  });
}

export function buildTruedDartSeamSegments({
  apex,
  leftTop,
  rightTop,
  leftAnchor,
  rightAnchor,
  leftAnchorTangent,
  rightAnchorTangent,
}: {
  apex: Point;
  leftTop: Point;
  rightTop: Point;
  leftAnchor: Point;
  rightAnchor: Point;
  leftAnchorTangent: Point;
  rightAnchorTangent: Point;
}) {
  const closureAngle = getDartClosureAngle({ apex, leftTop, rightTop });
  const closedRightTop = closePointAroundDart({
    point: rightTop,
    apex,
    closureAngle,
  });
  const closedRightAnchor = closePointAroundDart({
    point: rightAnchor,
    apex,
    closureAngle,
  });
  const closedRightAnchorTangent = rotateVector(rightAnchorTangent, closureAngle);

  const mergedTop: Point = {
    x: (leftTop.x + closedRightTop.x) / 2,
    y: (leftTop.y + closedRightTop.y) / 2,
  };

  // The shared tangent is constructed in the sewn state, then reopened.
  const sharedClosedTangent = normalizeVector({
    x: closedRightAnchor.x - leftAnchor.x,
    y: closedRightAnchor.y - leftAnchor.y,
  });

  const leftControls = cubicControlsFromTangents({
    start: leftAnchor,
    end: mergedTop,
    startTangent: leftAnchorTangent,
    endTangent: sharedClosedTangent,
  });

  const rightClosedControls = cubicControlsFromTangents({
    start: mergedTop,
    end: closedRightAnchor,
    startTangent: sharedClosedTangent,
    endTangent: closedRightAnchorTangent,
  });

  const leftPoints = sampleCubicPoints({
    start: leftAnchor,
    control1: leftControls.control1,
    control2: leftControls.control2,
    end: mergedTop,
  });

  const rightClosedPoints = sampleCubicPoints({
    start: mergedTop,
    control1: rightClosedControls.control1,
    control2: rightClosedControls.control2,
    end: closedRightAnchor,
  });

  const rightOpenPoints = rightClosedPoints.map((point) =>
    openPointAroundDart({ point, apex, closureAngle }),
  );

  return {
    leftPath: pointsToPath(leftPoints),
    rightPath: pointsToPath(rightOpenPoints),
    leftPoints,
    rightPoints: rightOpenPoints,
    closureAngle,
    closedRightTop,
    mergedTop,
  };
}
