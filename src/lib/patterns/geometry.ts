export type Point = { x: number; y: number };

export type CubicSeamCurve = {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
  increasing: boolean;
  startBoundaryY: number;
  endBoundaryY: number;
};

export function distanceBetweenPoints(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function normalizeVector(vector: Point) {
  const length = Math.hypot(vector.x, vector.y);

  if (length === 0) {
    return { x: 1, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

export function scaleVector(vector: Point, scale: number) {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
  };
}

export function addVector(point: Point, vector: Point) {
  return {
    x: point.x + vector.x,
    y: point.y + vector.y,
  };
}

export function subtractVector(point: Point, vector: Point) {
  return {
    x: point.x - vector.x,
    y: point.y - vector.y,
  };
}

export function rotatePoint(point: Point, pivot: Point, angleRad: number): Point {
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  };
}

export function rotateVector(vector: Point, angleRad: number): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

export function cubicPointAtT(
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

export function cubicDerivativeAtT(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  t: number,
) {
  const oneMinusT = 1 - t;

  return {
    x:
      3 * oneMinusT * oneMinusT * (control1.x - start.x) +
      6 * oneMinusT * t * (control2.x - control1.x) +
      3 * t * t * (end.x - control2.x),
    y:
      3 * oneMinusT * oneMinusT * (control1.y - start.y) +
      6 * oneMinusT * t * (control2.y - control1.y) +
      3 * t * t * (end.y - control2.y),
  };
}

export function solveMonotonicBezierT({
  targetX,
  pointAtT,
  increasing,
}: {
  targetX: number;
  pointAtT: (t: number) => Point;
  increasing: boolean;
}) {
  let low = 0;
  let high = 1;

  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    const point = pointAtT(mid);

    if (increasing ? point.x < targetX : point.x > targetX) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

export function cubicYAtX({
  curve,
  x,
}: {
  curve: CubicSeamCurve;
  x: number;
}) {
  if (curve.increasing) {
    if (x <= curve.start.x) return curve.startBoundaryY;
    if (x >= curve.end.x) return curve.endBoundaryY;
  } else {
    if (x >= curve.start.x) return curve.startBoundaryY;
    if (x <= curve.end.x) return curve.endBoundaryY;
  }

  const t = solveMonotonicBezierT({
    targetX: x,
    pointAtT: (value) =>
      cubicPointAtT(
        curve.start,
        curve.control1,
        curve.control2,
        curve.end,
        value,
      ),
    increasing: curve.increasing,
  });

  return cubicPointAtT(
    curve.start,
    curve.control1,
    curve.control2,
    curve.end,
    t,
  ).y;
}

export function cubicTangentAtX({
  curve,
  x,
}: {
  curve: Pick<
    CubicSeamCurve,
    'start' | 'control1' | 'control2' | 'end' | 'increasing'
  >;
  x: number;
}) {
  const t = solveMonotonicBezierT({
    targetX: x,
    pointAtT: (value) =>
      cubicPointAtT(
        curve.start,
        curve.control1,
        curve.control2,
        curve.end,
        value,
      ),
    increasing: curve.increasing,
  });

  return normalizeVector(
    cubicDerivativeAtT(
      curve.start,
      curve.control1,
      curve.control2,
      curve.end,
      t,
    ),
  );
}

export function cubicControlsFromTangents({
  start,
  end,
  startTangent,
  endTangent,
}: {
  start: Point;
  end: Point;
  startTangent: Point;
  endTangent: Point;
}) {
  const chordLength = distanceBetweenPoints(start, end);
  const handleLength = Math.max(chordLength / 3, 1);

  return {
    control1: addVector(
      start,
      scaleVector(normalizeVector(startTangent), handleLength),
    ),
    control2: subtractVector(
      end,
      scaleVector(normalizeVector(endTangent), handleLength),
    ),
  };
}

export function sampleCubicPoints({
  start,
  control1,
  control2,
  end,
  steps = 40,
}: {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
  steps?: number;
}) {
  const points: Point[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push(cubicPointAtT(start, control1, control2, end, t));
  }

  return points;
}

export function sampleQuadraticPoints({
  start,
  control,
  end,
  steps = 40,
}: {
  start: Point;
  control: Point;
  end: Point;
  steps?: number;
}) {
  const points: Point[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const oneMinusT = 1 - t;

    points.push({
      x:
        oneMinusT * oneMinusT * start.x +
        2 * oneMinusT * t * control.x +
        t * t * end.x,
      y:
        oneMinusT * oneMinusT * start.y +
        2 * oneMinusT * t * control.y +
        t * t * end.y,
    });
  }

  return points;
}

export function pointsToPath(points: Point[]) {
  if (points.length === 0) {
    return '';
  }

  return [
    `M ${points[0].x} ${points[0].y}`,
    ...points.slice(1).map((point) => `L ${point.x} ${point.y}`),
  ].join(' ');
}

export function sampleCubicSegmentPointsByXRange({
  curve,
  startX,
  endX,
  steps = 40,
}: {
  curve: Pick<
    CubicSeamCurve,
    'start' | 'control1' | 'control2' | 'end' | 'increasing'
  >;
  startX: number;
  endX: number;
  steps?: number;
}) {
  const startT = solveMonotonicBezierT({
    targetX: startX,
    pointAtT: (value) =>
      cubicPointAtT(
        curve.start,
        curve.control1,
        curve.control2,
        curve.end,
        value,
      ),
    increasing: curve.increasing,
  });

  const endT = solveMonotonicBezierT({
    targetX: endX,
    pointAtT: (value) =>
      cubicPointAtT(
        curve.start,
        curve.control1,
        curve.control2,
        curve.end,
        value,
      ),
    increasing: curve.increasing,
  });

  const points: Point[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = startT + ((endT - startT) * i) / steps;
    points.push(
      cubicPointAtT(curve.start, curve.control1, curve.control2, curve.end, t),
    );
  }

  return points;
}

export function sampleCubicSegmentByXRange({
  curve,
  startX,
  endX,
  steps = 40,
}: {
  curve: Pick<
    CubicSeamCurve,
    'start' | 'control1' | 'control2' | 'end' | 'increasing'
  >;
  startX: number;
  endX: number;
  steps?: number;
}) {
  return pointsToPath(
    sampleCubicSegmentPointsByXRange({
      curve,
      startX,
      endX,
      steps,
    }),
  );
}

function normalizeForAngle(vector: Point) {
  const length = Math.hypot(vector.x, vector.y);

  if (length === 0) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

export function smoothPolylinePoints({
  points,
  passes = 1,
  cornerAngleDeg = 24,
}: {
  points: Point[];
  passes?: number;
  cornerAngleDeg?: number;
}) {
  if (points.length < 3 || passes <= 0) {
    return points;
  }

  let smoothed = [...points];
  const cornerThreshold = Math.cos((cornerAngleDeg * Math.PI) / 180);

  for (let pass = 0; pass < passes; pass += 1) {
    const next = [smoothed[0]];

    for (let i = 1; i < smoothed.length - 1; i += 1) {
      const previous = smoothed[i - 1];
      const current = smoothed[i];
      const following = smoothed[i + 1];

      const incoming = normalizeForAngle({
        x: current.x - previous.x,
        y: current.y - previous.y,
      });
      const outgoing = normalizeForAngle({
        x: following.x - current.x,
        y: following.y - current.y,
      });

      if (!incoming || !outgoing) {
        next.push(current);
        continue;
      }

      const alignment = incoming.x * outgoing.x + incoming.y * outgoing.y;

      if (alignment < cornerThreshold) {
        next.push(current);
        continue;
      }

      next.push({
        x: previous.x * 0.2 + current.x * 0.6 + following.x * 0.2,
        y: previous.y * 0.2 + current.y * 0.6 + following.y * 0.2,
      });
    }

    next.push(smoothed[smoothed.length - 1]);
    smoothed = next;
  }

  return smoothed;
}

function signedPolygonArea(points: Point[]) {
  let area = 0;

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}

function outwardNormal(a: Point, b: Point, isCounterClockwise: boolean) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  if (isCounterClockwise) {
    return { x: dy / length, y: -dx / length };
  }

  return { x: -dy / length, y: dx / length };
}

function shiftedPoint(point: Point, normal: Point, distance: number) {
  return {
    x: point.x + normal.x * distance,
    y: point.y + normal.y * distance,
  };
}

function dotProduct(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y;
}

function vectorBetween(from: Point, to: Point) {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
  };
}

function pointsMatch(a: Point, b: Point, epsilon = 1e-6) {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

function pushDistinctPoint(points: Point[], point: Point) {
  if (points.length === 0 || !pointsMatch(points[points.length - 1], point)) {
    points.push(point);
  }
}

function intersectInfiniteLines(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): Point | null {
  const denominator =
    (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);

  if (Math.abs(denominator) < 1e-9) {
    return null;
  }

  const determinantA = a1.x * a2.y - a1.y * a2.x;
  const determinantB = b1.x * b2.y - b1.y * b2.x;

  return {
    x:
      (determinantA * (b1.x - b2.x) - (a1.x - a2.x) * determinantB) /
      denominator,
    y:
      (determinantA * (b1.y - b2.y) - (a1.y - a2.y) * determinantB) /
      denominator,
  };
}

export function offsetClosedPolyline({
  points,
  edgeOffsets,
}: {
  points: Point[];
  edgeOffsets: number[];
}) {
  if (points.length < 3 || edgeOffsets.length !== points.length) {
    return points;
  }

  const isCounterClockwise = signedPolygonArea(points) > 0;
  const offsetPoints: Point[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const previousIndex = (i - 1 + points.length) % points.length;
    const nextIndex = (i + 1) % points.length;

    const previousPoint = points[previousIndex];
    const currentPoint = points[i];
    const nextPoint = points[nextIndex];

    const previousOffset = edgeOffsets[previousIndex];
    const nextOffset = edgeOffsets[i];

    const previousNormal = outwardNormal(
      previousPoint,
      currentPoint,
      isCounterClockwise,
    );
    const nextNormal = outwardNormal(
      currentPoint,
      nextPoint,
      isCounterClockwise,
    );

    const previousShiftedStart = shiftedPoint(
      previousPoint,
      previousNormal,
      previousOffset,
    );
    const previousShiftedEnd = shiftedPoint(
      currentPoint,
      previousNormal,
      previousOffset,
    );
    const nextShiftedStart = shiftedPoint(
      currentPoint,
      nextNormal,
      nextOffset,
    );
    const nextShiftedEnd = shiftedPoint(nextPoint, nextNormal, nextOffset);

    const intersection = intersectInfiniteLines(
      previousShiftedStart,
      previousShiftedEnd,
      nextShiftedStart,
      nextShiftedEnd,
    );

    if (intersection) {
      const previousDirection = vectorBetween(previousPoint, currentPoint);
      const nextDirection = vectorBetween(currentPoint, nextPoint);
      const previousUnitDirection = normalizeForAngle(previousDirection);
      const nextUnitDirection = normalizeForAngle(nextDirection);
      const previousForward =
        dotProduct(
          vectorBetween(previousShiftedEnd, intersection),
          previousDirection,
        ) >= -1e-6;
      const nextForward =
        dotProduct(vectorBetween(nextShiftedStart, intersection), nextDirection) >=
        -1e-6;
      const maxOffset = Math.max(previousOffset, nextOffset, 1);
      const miterDistance = Math.hypot(
        intersection.x - currentPoint.x,
        intersection.y - currentPoint.y,
      );
      const hasZeroOffsetCorner =
        Math.min(previousOffset, nextOffset) <= 1e-6 &&
        Math.max(previousOffset, nextOffset) > 1e-6;

      if (previousForward && nextForward && miterDistance <= maxOffset * 6) {
        pushDistinctPoint(offsetPoints, intersection);
        continue;
      }

      // Keep the seam allowance sharp where an offset seam meets a fold edge
      // or other zero-allowance boundary.
      if (hasZeroOffsetCorner && miterDistance <= maxOffset * 6) {
        pushDistinctPoint(offsetPoints, intersection);
        continue;
      }

      if (previousUnitDirection && nextUnitDirection) {
        const alignment =
          previousUnitDirection.x * nextUnitDirection.x +
          previousUnitDirection.y * nextUnitDirection.y;

        // Preserve square corners where a hem meets a vertical seam edge.
        if (Math.abs(alignment) <= 0.35) {
          const squareCorner = {
            x: previousShiftedEnd.x + nextNormal.x * nextOffset,
            y: previousShiftedEnd.y + nextNormal.y * nextOffset,
          };

          pushDistinctPoint(offsetPoints, previousShiftedEnd);
          pushDistinctPoint(offsetPoints, squareCorner);
          pushDistinctPoint(offsetPoints, nextShiftedStart);
          continue;
        }
      }
    }

    pushDistinctPoint(offsetPoints, previousShiftedEnd);
    pushDistinctPoint(offsetPoints, nextShiftedStart);
  }

  return offsetPoints;
}
