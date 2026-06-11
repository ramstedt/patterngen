import { calculateBodiceWithoutDarts } from './calculations';
import easeNoDarts from '../../../data/easeNoDarts.json';
import type {
  PatternDefinition,
  PatternDraft,
} from '../types';

const MM_PER_CM = 10;
type Point = { x: number; y: number };
type SleeveDraftBuildParams = {
  sleeveCap: 'high' | 'low';
  armholeWidthMm: number;
  sleeveBackArmholeWidthMm: number;
  sleeveLengthWithEaseMm: number;
  sleeveCapHeightMm: number;
  elbowHeightMm: number;
  halfUpperArmWidthWithEaseMm: number;
  backHighCapGuideMm: number;
  frontHighCapGuideMm: number;
  backLowCapGuideMm: number;
  frontLowCapGuideMm: number;
  backLabel: string;
  frontLabel: string;
};

function createEmptyDraft() {
  return {
    units: 'mm' as const,
    width: 720,
    height: 420,
    points: [],
    lines: [],
    paths: [],
    labels: [],
    notes: [],
  };
}

function createCalculationValueMap(
  calculations: ReturnType<typeof calculateBodiceWithoutDarts>,
) {
  return new Map(
    calculations.map((calculation) => [calculation.id, calculation.value]),
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



function normalizeVector(vector: Point) {
  const length = Math.hypot(vector.x, vector.y) || 1;

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function subtractPoints(left: Point, right: Point): Point {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
  };
}

function addPoints(left: Point, right: Point): Point {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
  };
}

function scalePoint(point: Point, scalar: number): Point {
  return {
    x: point.x * scalar,
    y: point.y * scalar,
  };
}

function pointFromVector(start: Point, vector: Point, length: number): Point {
  return {
    x: start.x + vector.x * length,
    y: start.y + vector.y * length,
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

function pickPerpendicularVector(
  baseVector: Point,
  anchorPoint: Point,
  length: number,
  direction: 'up' | 'down',
) {
  const normalizedBaseVector = normalizeVector(baseVector);
  const perpendicularCandidateA = normalizeVector({
    x: -normalizedBaseVector.y,
    y: normalizedBaseVector.x,
  });
  const perpendicularCandidateB = normalizeVector({
    x: normalizedBaseVector.y,
    y: -normalizedBaseVector.x,
  });
  const candidateAEndPoint = pointFromVector(anchorPoint, perpendicularCandidateA, length);

  if (direction === 'up') {
    return candidateAEndPoint.y < anchorPoint.y
      ? perpendicularCandidateA
      : perpendicularCandidateB;
  }

  return candidateAEndPoint.y > anchorPoint.y
    ? perpendicularCandidateA
    : perpendicularCandidateB;
}

function buildPerpendicularGuidePoint(
  anchorPoint: Point,
  baseVector: Point,
  length: number,
  direction: 'up' | 'down',
) {
  return pointFromVector(
    anchorPoint,
    pickPerpendicularVector(baseVector, anchorPoint, length, direction),
    length,
  );
}

function clampPointToMinY(point: Point, minY: number): Point {
  return {
    x: point.x,
    y: Math.max(point.y, minY),
  };
}

function clampedSegmentControls(
  minY: number,
  start: Point,
  end: Point,
  startTangent: Point,
  endTangent: Point,
  strength: number,
) {
  const controls = segmentControls(start, end, startTangent, endTangent, strength);

  return {
    control1: clampPointToMinY(controls.control1, minY),
    control2: clampPointToMinY(controls.control2, minY),
  };
}

function buildSleeveDraft({
  sleeveCap,
  armholeWidthMm,
  sleeveBackArmholeWidthMm,
  sleeveLengthWithEaseMm,
  sleeveCapHeightMm,
  elbowHeightMm,
  halfUpperArmWidthWithEaseMm,
  backHighCapGuideMm,
  frontHighCapGuideMm,
  backLowCapGuideMm,
  frontLowCapGuideMm,
  backLabel,
  frontLabel,
}: SleeveDraftBuildParams): PatternDraft {
  const grainlineTop = {
    x: Math.max(armholeWidthMm, 160),
    y: 60,
  };

  if (sleeveCap === 'low') {
    const sleeveCapPoint = {
      x: grainlineTop.x,
      y: grainlineTop.y + sleeveCapHeightMm,
    };
    const topRightGuideEndPoint = {
      x: grainlineTop.x + 8 * MM_PER_CM,
      y: grainlineTop.y,
    };
    const topLeftGuideEndPoint = {
      x: grainlineTop.x - 8 * MM_PER_CM,
      y: grainlineTop.y,
    };
    const grainlineBottom = {
      x: grainlineTop.x,
      y: grainlineTop.y + sleeveLengthWithEaseMm,
    };
    const verticalDistanceMm = sleeveCapPoint.y - grainlineTop.y;
    const horizontalDistanceMm = Math.sqrt(
      Math.max(0, sleeveBackArmholeWidthMm ** 2 - verticalDistanceMm ** 2),
    );
    const backLowCapPoint = {
      x: grainlineTop.x + horizontalDistanceMm,
      y: sleeveCapPoint.y,
    };
    const mirroredBackLowCapPoint = {
      x: grainlineTop.x - horizontalDistanceMm,
      y: sleeveCapPoint.y,
    };
    const lowCapBackThirdPoint = divideLine(grainlineTop, backLowCapPoint, 1 / 3);
    const lowCapFrontThirdPoint = divideLine(grainlineTop, mirroredBackLowCapPoint, 1 / 3);
    const mirroredBackLowCapSixthPoint = divideLine(
      mirroredBackLowCapPoint,
      grainlineTop,
      1 / 6,
    );
    const backLowCapSixthPoint = divideLine(backLowCapPoint, grainlineTop, 1 / 6);
    const backLowCapTwoSixthsPoint = divideLine(backLowCapPoint, grainlineTop, 2 / 6);
    const mirroredBackLowCapTwoSixthsPoint = divideLine(
      mirroredBackLowCapPoint,
      grainlineTop,
      2 / 6,
    );
    const lowCapFrontGuideBaseVector = subtractPoints(grainlineTop, mirroredBackLowCapPoint);
    const lowCapBackGuideBaseVector = subtractPoints(grainlineTop, backLowCapPoint);
    const mirroredBackLowCapSixthDropPoint = buildPerpendicularGuidePoint(
      mirroredBackLowCapSixthPoint,
      lowCapFrontGuideBaseVector,
      0.5 * MM_PER_CM,
      'down',
    );
    const lowCapBackThirdGuideEndPoint = buildPerpendicularGuidePoint(
      lowCapBackThirdPoint,
      lowCapBackGuideBaseVector,
      backLowCapGuideMm,
      'up',
    );
    const backLowCapSixthDropPoint = buildPerpendicularGuidePoint(
      backLowCapSixthPoint,
      lowCapBackGuideBaseVector,
      0.2 * MM_PER_CM,
      'down',
    );
    const lowCapFrontThirdGuideEndPoint = buildPerpendicularGuidePoint(
      lowCapFrontThirdPoint,
      lowCapFrontGuideBaseVector,
      frontLowCapGuideMm,
      'up',
    );
    const leftLowCapHemPoint = {
      x: mirroredBackLowCapPoint.x,
      y: grainlineBottom.y,
    };
    const rightLowCapHemPoint = {
      x: backLowCapPoint.x,
      y: grainlineBottom.y,
    };
    const lowCapFrontArmholeWidthMm = Math.max(0, armholeWidthMm - sleeveBackArmholeWidthMm);
    const lowCapCrownTangent = { x: 1, y: 0 };

    const lowCapFrontStartTangent = normalizeVector(
      subtractPoints(mirroredBackLowCapSixthDropPoint, mirroredBackLowCapPoint),
    );
    const lowCapFrontFirstBlendTangent = normalizeVector(
      addPoints(
        normalizeVector(subtractPoints(mirroredBackLowCapSixthDropPoint, mirroredBackLowCapPoint)),
        normalizeVector(subtractPoints(mirroredBackLowCapTwoSixthsPoint, mirroredBackLowCapSixthDropPoint)),
      ),
    );
    const lowCapFrontSecondBlendTangent = normalizeVector(
      addPoints(
        normalizeVector(subtractPoints(mirroredBackLowCapTwoSixthsPoint, mirroredBackLowCapSixthDropPoint)),
        normalizeVector(subtractPoints(lowCapFrontThirdGuideEndPoint, mirroredBackLowCapTwoSixthsPoint)),
      ),
    );
    const lowCapFrontGuideTangent = normalizeVector(
      addPoints(
        normalizeVector(subtractPoints(lowCapFrontThirdGuideEndPoint, mirroredBackLowCapTwoSixthsPoint)),
        normalizeVector(subtractPoints(grainlineTop, lowCapFrontThirdGuideEndPoint)),
      ),
    );
    const lowCapBackGuideTangent = normalizeVector(
      addPoints(
        normalizeVector(subtractPoints(lowCapBackThirdGuideEndPoint, grainlineTop)),
        normalizeVector(subtractPoints(backLowCapTwoSixthsPoint, lowCapBackThirdGuideEndPoint)),
      ),
    );
    const lowCapBackSecondBlendTangent = normalizeVector(
      addPoints(
        normalizeVector(subtractPoints(backLowCapTwoSixthsPoint, lowCapBackThirdGuideEndPoint)),
        normalizeVector(subtractPoints(backLowCapSixthDropPoint, backLowCapTwoSixthsPoint)),
      ),
    );
    const lowCapBackFirstBlendTangent = normalizeVector(
      addPoints(
        normalizeVector(subtractPoints(backLowCapSixthDropPoint, backLowCapTwoSixthsPoint)),
        normalizeVector(subtractPoints(backLowCapPoint, backLowCapSixthDropPoint)),
      ),
    );
    const lowCapBackEndTangent = normalizeVector(
      subtractPoints(backLowCapPoint, backLowCapSixthDropPoint),
    );

    function buildLowCapCurve(frontStrengthScale: number, backStrengthScale: number) {
      const frontStartControls = clampedSegmentControls(
        grainlineTop.y,
        mirroredBackLowCapPoint,
        mirroredBackLowCapSixthDropPoint,
        lowCapFrontStartTangent,
        lowCapFrontFirstBlendTangent,
        0.2 * frontStrengthScale,
      );
      const frontMidControls = clampedSegmentControls(
        grainlineTop.y,
        mirroredBackLowCapSixthDropPoint,
        mirroredBackLowCapTwoSixthsPoint,
        lowCapFrontFirstBlendTangent,
        lowCapFrontSecondBlendTangent,
        0.22 * frontStrengthScale,
      );
      const frontUpperControls = clampedSegmentControls(
        grainlineTop.y,
        mirroredBackLowCapTwoSixthsPoint,
        lowCapFrontThirdGuideEndPoint,
        lowCapFrontSecondBlendTangent,
        lowCapFrontGuideTangent,
        0.26 * frontStrengthScale,
      );
      const frontCrownControls = clampedSegmentControls(
        grainlineTop.y,
        lowCapFrontThirdGuideEndPoint,
        grainlineTop,
        lowCapFrontGuideTangent,
        lowCapCrownTangent,
        0.28 * frontStrengthScale,
      );

      const backCrownControls = clampedSegmentControls(
        grainlineTop.y,
        grainlineTop,
        lowCapBackThirdGuideEndPoint,
        lowCapCrownTangent,
        lowCapBackGuideTangent,
        0.28 * backStrengthScale,
      );
      const backUpperControls = clampedSegmentControls(
        grainlineTop.y,
        lowCapBackThirdGuideEndPoint,
        backLowCapTwoSixthsPoint,
        lowCapBackGuideTangent,
        lowCapBackSecondBlendTangent,
        0.26 * backStrengthScale,
      );
      const backMidControls = clampedSegmentControls(
        grainlineTop.y,
        backLowCapTwoSixthsPoint,
        backLowCapSixthDropPoint,
        lowCapBackSecondBlendTangent,
        lowCapBackFirstBlendTangent,
        0.22 * backStrengthScale,
      );
      const backEndControls = clampedSegmentControls(
        grainlineTop.y,
        backLowCapSixthDropPoint,
        backLowCapPoint,
        lowCapBackFirstBlendTangent,
        lowCapBackEndTangent,
        0.2 * backStrengthScale,
      );

      const frontLength =
        approximateCubicLength(
          mirroredBackLowCapPoint,
          frontStartControls.control1,
          frontStartControls.control2,
          mirroredBackLowCapSixthDropPoint,
        ) +
        approximateCubicLength(
          mirroredBackLowCapSixthDropPoint,
          frontMidControls.control1,
          frontMidControls.control2,
          mirroredBackLowCapTwoSixthsPoint,
        ) +
        approximateCubicLength(
          mirroredBackLowCapTwoSixthsPoint,
          frontUpperControls.control1,
          frontUpperControls.control2,
          lowCapFrontThirdGuideEndPoint,
        ) +
        approximateCubicLength(
          lowCapFrontThirdGuideEndPoint,
          frontCrownControls.control1,
          frontCrownControls.control2,
          grainlineTop,
        );
      const backLength =
        approximateCubicLength(
          grainlineTop,
          backCrownControls.control1,
          backCrownControls.control2,
          lowCapBackThirdGuideEndPoint,
        ) +
        approximateCubicLength(
          lowCapBackThirdGuideEndPoint,
          backUpperControls.control1,
          backUpperControls.control2,
          backLowCapTwoSixthsPoint,
        ) +
        approximateCubicLength(
          backLowCapTwoSixthsPoint,
          backMidControls.control1,
          backMidControls.control2,
          backLowCapSixthDropPoint,
        ) +
        approximateCubicLength(
          backLowCapSixthDropPoint,
          backEndControls.control1,
          backEndControls.control2,
          backLowCapPoint,
        );
      const path = [
        `M ${mirroredBackLowCapPoint.x} ${mirroredBackLowCapPoint.y}`,
        `C ${frontStartControls.control1.x} ${frontStartControls.control1.y} ${frontStartControls.control2.x} ${frontStartControls.control2.y} ${mirroredBackLowCapSixthDropPoint.x} ${mirroredBackLowCapSixthDropPoint.y}`,
        `C ${frontMidControls.control1.x} ${frontMidControls.control1.y} ${frontMidControls.control2.x} ${frontMidControls.control2.y} ${mirroredBackLowCapTwoSixthsPoint.x} ${mirroredBackLowCapTwoSixthsPoint.y}`,
        `C ${frontUpperControls.control1.x} ${frontUpperControls.control1.y} ${frontUpperControls.control2.x} ${frontUpperControls.control2.y} ${lowCapFrontThirdGuideEndPoint.x} ${lowCapFrontThirdGuideEndPoint.y}`,
        `C ${frontCrownControls.control1.x} ${frontCrownControls.control1.y} ${frontCrownControls.control2.x} ${frontCrownControls.control2.y} ${grainlineTop.x} ${grainlineTop.y}`,
        `C ${backCrownControls.control1.x} ${backCrownControls.control1.y} ${backCrownControls.control2.x} ${backCrownControls.control2.y} ${lowCapBackThirdGuideEndPoint.x} ${lowCapBackThirdGuideEndPoint.y}`,
        `C ${backUpperControls.control1.x} ${backUpperControls.control1.y} ${backUpperControls.control2.x} ${backUpperControls.control2.y} ${backLowCapTwoSixthsPoint.x} ${backLowCapTwoSixthsPoint.y}`,
        `C ${backMidControls.control1.x} ${backMidControls.control1.y} ${backMidControls.control2.x} ${backMidControls.control2.y} ${backLowCapSixthDropPoint.x} ${backLowCapSixthDropPoint.y}`,
        `C ${backEndControls.control1.x} ${backEndControls.control1.y} ${backEndControls.control2.x} ${backEndControls.control2.y} ${backLowCapPoint.x} ${backLowCapPoint.y}`,
      ].join(' ');

      return { path, frontLength, backLength };
    }

    let bestLowCapCurve = buildLowCapCurve(1, 1);

    for (let frontStrengthScale = 0.7; frontStrengthScale <= 1.35; frontStrengthScale += 0.02) {
      for (let backStrengthScale = 0.7; backStrengthScale <= 1.35; backStrengthScale += 0.02) {
        const candidateCurve = buildLowCapCurve(frontStrengthScale, backStrengthScale);
        const candidateError =
          Math.abs(candidateCurve.frontLength - lowCapFrontArmholeWidthMm) +
          Math.abs(candidateCurve.backLength - sleeveBackArmholeWidthMm);
        const bestError =
          Math.abs(bestLowCapCurve.frontLength - lowCapFrontArmholeWidthMm) +
          Math.abs(bestLowCapCurve.backLength - sleeveBackArmholeWidthMm);

        if (candidateError < bestError) {
          bestLowCapCurve = candidateCurve;
        }
      }
    }

    return {
      units: 'mm',
      width: 320,
      height: Math.max(sleeveLengthWithEaseMm + 120, 420),
      points: [
        { id: '1', x: grainlineTop.x, y: grainlineTop.y },
        { id: '2', x: sleeveCapPoint.x, y: sleeveCapPoint.y },
        { id: '3', x: grainlineBottom.x, y: grainlineBottom.y },
        { id: '4', x: backLowCapPoint.x, y: backLowCapPoint.y },
        { id: '5', x: mirroredBackLowCapPoint.x, y: mirroredBackLowCapPoint.y },
        { id: '4a', x: backLowCapSixthPoint.x, y: backLowCapSixthPoint.y },
        { id: '4b', x: backLowCapTwoSixthsPoint.x, y: backLowCapTwoSixthsPoint.y },
        { id: '4c', x: backLowCapSixthDropPoint.x, y: backLowCapSixthDropPoint.y },
        { id: '5a', x: mirroredBackLowCapSixthPoint.x, y: mirroredBackLowCapSixthPoint.y },
        { id: '5b', x: mirroredBackLowCapTwoSixthsPoint.x, y: mirroredBackLowCapTwoSixthsPoint.y },
        { id: '5c', x: mirroredBackLowCapSixthDropPoint.x, y: mirroredBackLowCapSixthDropPoint.y },
        { id: '6', x: rightLowCapHemPoint.x, y: rightLowCapHemPoint.y },
        { id: '7', x: leftLowCapHemPoint.x, y: leftLowCapHemPoint.y },
        { id: 'b1', x: lowCapBackThirdPoint.x, y: lowCapBackThirdPoint.y },
        {
          id: 'b2',
          x: lowCapBackThirdGuideEndPoint.x,
          y: lowCapBackThirdGuideEndPoint.y,
        },
        { id: 'f1', x: lowCapFrontThirdPoint.x, y: lowCapFrontThirdPoint.y },
        {
          id: 'f2',
          x: lowCapFrontThirdGuideEndPoint.x,
          y: lowCapFrontThirdGuideEndPoint.y,
        },
        { id: 'lowCapTopGuideRightEnd', x: topRightGuideEndPoint.x, y: topRightGuideEndPoint.y },
        { id: 'lowCapTopGuideLeftEnd', x: topLeftGuideEndPoint.x, y: topLeftGuideEndPoint.y },
      ],
      markers: [],
      lines: [
        {
          id: 'lowCapSleeveGrainline',
          from: '1',
          to: '3',
          kind: 'grainline',
        },
        {
          id: 'lowCapTopGuideRight',
          from: '1',
          to: 'lowCapTopGuideRightEnd',
          kind: 'hidden',
        },
        {
          id: 'lowCapTopGuideLeft',
          from: '1',
          to: 'lowCapTopGuideLeftEnd',
          kind: 'hidden',
        },
        {
          id: 'lowCapBackArmholeGuide',
          from: '1',
          to: '4',
          kind: 'hidden',
        },
        {
          id: 'lowCapFrontArmholeGuide',
          from: '1',
          to: '5',
          kind: 'hidden',
        },
        {
          id: 'lowCapLeftSixthDropGuide',
          from: '5a',
          to: '5c',
          kind: 'hidden',
        },
        {
          id: 'lowCapBackThirdGuide',
          from: 'b1',
          to: 'b2',
          kind: 'hidden',
        },
        {
          id: 'lowCapBackSixthDropGuide',
          from: '4a',
          to: '4c',
          kind: 'hidden',
        },
        {
          id: 'lowCapFrontThirdGuide',
          from: 'f1',
          to: 'f2',
          kind: 'hidden',
        },
        {
          id: 'lowCapLeftSideSeam',
          from: '5',
          to: '7',
          kind: 'outline',
        },
        {
          id: 'lowCapRightSideSeam',
          from: '4',
          to: '6',
          kind: 'outline',
        },
        {
          id: 'lowCapHemRight',
          from: '6',
          to: '3',
          kind: 'outline',
        },
        {
          id: 'lowCapHemLeft',
          from: '3',
          to: '7',
          kind: 'outline',
        },
      ],
      paths: [
        {
          id: 'lowCapSleeveCapCurve',
          d: bestLowCapCurve.path,
          kind: 'outline',
        },
      ],
      labels: [
        {
          id: 'lowCapSleeveFrontLabel',
          text: frontLabel,
          x: grainlineTop.x - horizontalDistanceMm * 0.58,
          y: sleeveCapPoint.y + Math.max(18, sleeveCapHeightMm * 0.16),
        },
        {
          id: 'lowCapSleeveBackLabel',
          text: backLabel,
          x: grainlineTop.x + horizontalDistanceMm * 0.58,
          y: sleeveCapPoint.y + Math.max(18, sleeveCapHeightMm * 0.16),
        },
      ],
      notes: [],
    };
  }

  const topGuideLeftPoint = {
    x: grainlineTop.x - 2.5 * MM_PER_CM,
    y: grainlineTop.y,
  };
  const topGuideRightPoint = {
    x: grainlineTop.x + 2.5 * MM_PER_CM,
    y: grainlineTop.y,
  };
  const sleeveCapPoint = {
    x: grainlineTop.x,
    y: grainlineTop.y + sleeveCapHeightMm,
  };
  const elbowPoint = {
    x: grainlineTop.x,
    y: grainlineTop.y + elbowHeightMm,
  };
  const upperArmRightPoint = {
    x: sleeveCapPoint.x + halfUpperArmWidthWithEaseMm,
    y: sleeveCapPoint.y,
  };
  const upperArmRightQuarterPoint = {
    x: upperArmRightPoint.x + (topGuideRightPoint.x - upperArmRightPoint.x) * 0.25,
    y: upperArmRightPoint.y + (topGuideRightPoint.y - upperArmRightPoint.y) * 0.25,
  };
  const upperArmLeftPoint = {
    x: sleeveCapPoint.x - halfUpperArmWidthWithEaseMm,
    y: sleeveCapPoint.y,
  };
  const upperArmLeftQuarterPoint = {
    x: upperArmLeftPoint.x + (topGuideLeftPoint.x - upperArmLeftPoint.x) * 0.25,
    y: upperArmLeftPoint.y + (topGuideLeftPoint.y - upperArmLeftPoint.y) * 0.25,
  };
  const topGuideLeftQuarterPoint = {
    x: topGuideLeftPoint.x + (upperArmLeftPoint.x - topGuideLeftPoint.x) * 0.25,
    y: topGuideLeftPoint.y + (upperArmLeftPoint.y - topGuideLeftPoint.y) * 0.25,
  };
  const topGuideRightQuarterPoint = {
    x: topGuideRightPoint.x + (upperArmRightPoint.x - topGuideRightPoint.x) * 0.25,
    y: topGuideRightPoint.y + (upperArmRightPoint.y - topGuideRightPoint.y) * 0.25,
  };
  const topRightToUpperArmRightVector = normalizeVector({
    x: topGuideRightPoint.x - upperArmRightPoint.x,
    y: topGuideRightPoint.y - upperArmRightPoint.y,
  });
  const topLeftToUpperArmLeftVector = normalizeVector({
    x: topGuideLeftPoint.x - upperArmLeftPoint.x,
    y: topGuideLeftPoint.y - upperArmLeftPoint.y,
  });
  const topLeftPerpendicularUpVector = pickPerpendicularVector(
    topLeftToUpperArmLeftVector,
    topGuideLeftQuarterPoint,
    frontHighCapGuideMm,
    'up',
  );
  const topRightPerpendicularUpVector = pickPerpendicularVector(
    topRightToUpperArmRightVector,
    topGuideRightQuarterPoint,
    backHighCapGuideMm,
    'up',
  );
  const upperArmRightQuarterDropPoint = {
    x: upperArmRightQuarterPoint.x + topRightToUpperArmRightVector.y * 0.7 * MM_PER_CM,
    y: upperArmRightQuarterPoint.y - topRightToUpperArmRightVector.x * 0.7 * MM_PER_CM,
  };
  const upperArmLeftQuarterDropPoint = {
    x: upperArmLeftQuarterPoint.x - topLeftToUpperArmLeftVector.y * 1.2 * MM_PER_CM,
    y: upperArmLeftQuarterPoint.y + topLeftToUpperArmLeftVector.x * 1.2 * MM_PER_CM,
  };
  const topLeftHighCapGuidePoint = {
    x: topGuideLeftQuarterPoint.x + topLeftPerpendicularUpVector.x * frontHighCapGuideMm,
    y: topGuideLeftQuarterPoint.y + topLeftPerpendicularUpVector.y * frontHighCapGuideMm,
  };
  const topRightHighCapGuidePoint = {
    x: topGuideRightQuarterPoint.x + topRightPerpendicularUpVector.x * backHighCapGuideMm,
    y: topGuideRightQuarterPoint.y + topRightPerpendicularUpVector.y * backHighCapGuideMm,
  };
  const leftCapStartTangent = normalizeVector(
    subtractPoints(upperArmLeftQuarterPoint, upperArmLeftPoint),
  );
  const leftCapQuarterTangent = normalizeVector(
    addPoints(
      normalizeVector(subtractPoints(upperArmLeftQuarterPoint, upperArmLeftPoint)),
      normalizeVector(
        subtractPoints(topLeftHighCapGuidePoint, upperArmLeftQuarterDropPoint),
      ),
    ),
  );
  const leftCapTopTangent = normalizeVector(
    subtractPoints(topLeftHighCapGuidePoint, upperArmLeftQuarterDropPoint),
  );
  const sleeveCapCrownTangent = { x: 1, y: 0 };
  const rightCapTopTangent = normalizeVector(
    subtractPoints(upperArmRightQuarterDropPoint, topRightHighCapGuidePoint),
  );
  const rightCapQuarterTangent = normalizeVector(
    addPoints(
      normalizeVector(
        subtractPoints(upperArmRightQuarterDropPoint, topRightHighCapGuidePoint),
      ),
      normalizeVector(subtractPoints(upperArmRightPoint, upperArmRightQuarterDropPoint)),
    ),
  );
  const rightCapEndTangent = normalizeVector(
    subtractPoints(upperArmRightPoint, upperArmRightQuarterDropPoint),
  );
  function buildSleeveCapCurve(strengthScale: number) {
    const sleeveCapStartControls = segmentControls(
      upperArmLeftPoint,
      upperArmLeftQuarterDropPoint,
      leftCapStartTangent,
      leftCapQuarterTangent,
      0.24 * strengthScale,
    );
    const sleeveCapLeftMidControls = segmentControls(
      upperArmLeftQuarterDropPoint,
      topLeftHighCapGuidePoint,
      leftCapQuarterTangent,
      leftCapTopTangent,
      0.3 * strengthScale,
    );
    const sleeveCapTopLeftControls = segmentControls(
      topLeftHighCapGuidePoint,
      grainlineTop,
      leftCapTopTangent,
      sleeveCapCrownTangent,
      0.34 * strengthScale,
    );
    const sleeveCapTopRightControls = segmentControls(
      grainlineTop,
      topRightHighCapGuidePoint,
      sleeveCapCrownTangent,
      rightCapTopTangent,
      0.34 * strengthScale,
    );
    const sleeveCapRightMidControls = segmentControls(
      topRightHighCapGuidePoint,
      upperArmRightQuarterDropPoint,
      rightCapTopTangent,
      rightCapQuarterTangent,
      0.3 * strengthScale,
    );
    const sleeveCapEndControls = segmentControls(
      upperArmRightQuarterDropPoint,
      upperArmRightPoint,
      rightCapQuarterTangent,
      rightCapEndTangent,
      0.24 * strengthScale,
    );
    const length =
      approximateCubicLength(
        upperArmLeftPoint,
        sleeveCapStartControls.control1,
        sleeveCapStartControls.control2,
        upperArmLeftQuarterDropPoint,
      ) +
      approximateCubicLength(
        upperArmLeftQuarterDropPoint,
        sleeveCapLeftMidControls.control1,
        sleeveCapLeftMidControls.control2,
        topLeftHighCapGuidePoint,
      ) +
      approximateCubicLength(
        topLeftHighCapGuidePoint,
        sleeveCapTopLeftControls.control1,
        sleeveCapTopLeftControls.control2,
        grainlineTop,
      ) +
      approximateCubicLength(
        grainlineTop,
        sleeveCapTopRightControls.control1,
        sleeveCapTopRightControls.control2,
        topRightHighCapGuidePoint,
      ) +
      approximateCubicLength(
        topRightHighCapGuidePoint,
        sleeveCapRightMidControls.control1,
        sleeveCapRightMidControls.control2,
        upperArmRightQuarterDropPoint,
      ) +
      approximateCubicLength(
        upperArmRightQuarterDropPoint,
        sleeveCapEndControls.control1,
        sleeveCapEndControls.control2,
        upperArmRightPoint,
      );

    const path = [
      `M ${upperArmLeftPoint.x} ${upperArmLeftPoint.y}`,
      `C ${sleeveCapStartControls.control1.x} ${sleeveCapStartControls.control1.y} ${sleeveCapStartControls.control2.x} ${sleeveCapStartControls.control2.y} ${upperArmLeftQuarterDropPoint.x} ${upperArmLeftQuarterDropPoint.y}`,
      `C ${sleeveCapLeftMidControls.control1.x} ${sleeveCapLeftMidControls.control1.y} ${sleeveCapLeftMidControls.control2.x} ${sleeveCapLeftMidControls.control2.y} ${topLeftHighCapGuidePoint.x} ${topLeftHighCapGuidePoint.y}`,
      `C ${sleeveCapTopLeftControls.control1.x} ${sleeveCapTopLeftControls.control1.y} ${sleeveCapTopLeftControls.control2.x} ${sleeveCapTopLeftControls.control2.y} ${grainlineTop.x} ${grainlineTop.y}`,
      `C ${sleeveCapTopRightControls.control1.x} ${sleeveCapTopRightControls.control1.y} ${sleeveCapTopRightControls.control2.x} ${sleeveCapTopRightControls.control2.y} ${topRightHighCapGuidePoint.x} ${topRightHighCapGuidePoint.y}`,
      `C ${sleeveCapRightMidControls.control1.x} ${sleeveCapRightMidControls.control1.y} ${sleeveCapRightMidControls.control2.x} ${sleeveCapRightMidControls.control2.y} ${upperArmRightQuarterDropPoint.x} ${upperArmRightQuarterDropPoint.y}`,
      `C ${sleeveCapEndControls.control1.x} ${sleeveCapEndControls.control1.y} ${sleeveCapEndControls.control2.x} ${sleeveCapEndControls.control2.y} ${upperArmRightPoint.x} ${upperArmRightPoint.y}`,
    ].join(' ');

    return { path, length };
  }

  let bestSleeveCapCurve = buildSleeveCapCurve(1);

  for (let strengthScale = 0.7; strengthScale <= 1.4; strengthScale += 0.01) {
    const candidateCurve = buildSleeveCapCurve(strengthScale);

    if (
      Math.abs(candidateCurve.length - armholeWidthMm) <
      Math.abs(bestSleeveCapCurve.length - armholeWidthMm)
    ) {
      bestSleeveCapCurve = candidateCurve;
    }
  }

  const sleeveCapPath = bestSleeveCapCurve.path;
  const grainlineBottom = {
    x: grainlineTop.x,
    y: grainlineTop.y + sleeveLengthWithEaseMm,
  };
  const elbowRightPoint = {
    x: upperArmRightPoint.x,
    y: elbowPoint.y,
  };
  const elbowLeftPoint = {
    x: upperArmLeftPoint.x,
    y: elbowPoint.y,
  };
  const rightHemLevelPoint = {
    x: upperArmRightPoint.x,
    y: grainlineBottom.y,
  };
  const leftHemLevelPoint = {
    x: upperArmLeftPoint.x,
    y: grainlineBottom.y,
  };

  return {
    units: 'mm',
    width: Math.max(armholeWidthMm * 2, 320),
    height: Math.max(sleeveLengthWithEaseMm + 120, 420),
    points: [
      { id: '1', x: grainlineTop.x, y: grainlineTop.y },
      { id: '2', x: sleeveCapPoint.x, y: sleeveCapPoint.y },
      { id: '3', x: elbowPoint.x, y: elbowPoint.y },
      { id: '4', x: grainlineBottom.x, y: grainlineBottom.y },
      { id: '5', x: upperArmRightPoint.x, y: upperArmRightPoint.y },
      { id: '5a', x: upperArmRightQuarterPoint.x, y: upperArmRightQuarterPoint.y },
      { id: '5b', x: upperArmRightQuarterDropPoint.x, y: upperArmRightQuarterDropPoint.y },
      { id: '6', x: upperArmLeftPoint.x, y: upperArmLeftPoint.y },
      { id: '6a', x: upperArmLeftQuarterPoint.x, y: upperArmLeftQuarterPoint.y },
      { id: '6b', x: upperArmLeftQuarterDropPoint.x, y: upperArmLeftQuarterDropPoint.y },
      { id: '12a', x: topGuideLeftQuarterPoint.x, y: topGuideLeftQuarterPoint.y },
      { id: '12b', x: topLeftHighCapGuidePoint.x, y: topLeftHighCapGuidePoint.y },
      { id: '7', x: elbowRightPoint.x, y: elbowRightPoint.y },
      { id: '8', x: rightHemLevelPoint.x, y: rightHemLevelPoint.y },
      { id: '9', x: elbowLeftPoint.x, y: elbowLeftPoint.y },
      { id: '10', x: leftHemLevelPoint.x, y: leftHemLevelPoint.y },
      { id: '11', x: topGuideRightPoint.x, y: topGuideRightPoint.y },
      { id: '11a', x: topGuideRightQuarterPoint.x, y: topGuideRightQuarterPoint.y },
      { id: '11b', x: topRightHighCapGuidePoint.x, y: topRightHighCapGuidePoint.y },
      { id: '12', x: topGuideLeftPoint.x, y: topGuideLeftPoint.y },
    ],
    markers: [],
    lines: [
      {
        id: 'sleeveGrainline',
        from: '1',
        to: '4',
        kind: 'grainline',
      },
      {
        id: 'upperArmConstructionRight',
        from: '2',
        to: '5',
        kind: 'hidden',
      },
      {
        id: 'upperArmConstructionLeft',
        from: '2',
        to: '6',
        kind: 'hidden',
      },
      {
        id: 'rightSleeveSideLine',
        from: '5',
        to: '8',
        kind: 'outline',
      },
      {
        id: 'leftSleeveSideLine',
        from: '6',
        to: '10',
        kind: 'outline',
      },
      {
        id: 'elbowGuideLeft',
        from: '9',
        to: '3',
        kind: 'hidden',
      },
      {
        id: 'elbowGuideRight',
        from: '3',
        to: '7',
        kind: 'hidden',
      },
      {
        id: 'sleeveHemLine',
        from: '10',
        to: '8',
        kind: 'outline',
      },
      {
        id: 'topGuideLeft',
        from: '12',
        to: '1',
        kind: 'hidden',
      },
      {
        id: 'topGuideRight',
        from: '1',
        to: '11',
        kind: 'hidden',
      },
      {
        id: 'topRightToUpperArmRightGuide',
        from: '11',
        to: '5',
        kind: 'hidden',
      },
      {
        id: 'topLeftToUpperArmLeftGuide',
        from: '12',
        to: '6',
        kind: 'hidden',
      },
      {
        id: 'rightQuarterDropGuide',
        from: '5a',
        to: '5b',
        kind: 'hidden',
      },
      {
        id: 'leftQuarterDropGuide',
        from: '6a',
        to: '6b',
        kind: 'hidden',
      },
      {
        id: 'topLeftHighCapGuide',
        from: '12a',
        to: '12b',
        kind: 'hidden',
      },
      {
        id: 'topRightHighCapGuide',
        from: '11a',
        to: '11b',
        kind: 'hidden',
      },
    ],
    paths: [
      {
        id: 'sleeveCapCurve',
        d: sleeveCapPath,
        kind: 'outline',
      },
    ],
    labels: [
      {
        id: 'sleeveFrontLabel',
        text: frontLabel,
        x: grainlineTop.x - halfUpperArmWidthWithEaseMm * 0.58,
        y: sleeveCapPoint.y + Math.max(18, sleeveCapHeightMm * 0.16),
      },
      {
        id: 'sleeveBackLabel',
        text: backLabel,
        x: grainlineTop.x + halfUpperArmWidthWithEaseMm * 0.58,
        y: sleeveCapPoint.y + Math.max(18, sleeveCapHeightMm * 0.16),
      },
    ],
    notes: [],
  };
}

export const bodiceWithoutDartsPattern: PatternDefinition = {
  id: 'bodiceWithoutDarts',
  category: 'bodices',
  supportedProfileTypes: ['women'],
  requiredMeasurements: [
    'backWaistLength',
    'bustCircumference',
    'armLength',
    'upperArmCircumference',
    'wristCircumference',
  ],
  calculate(profile, t, settings) {
    const movementEase = settings?.movementEase;
    const sleeveCap = settings?.sleeveCap;

    if (!movementEase || !sleeveCap) {
      return [];
    }

    return calculateBodiceWithoutDarts(profile, t, movementEase, sleeveCap);
  },
  buildPrintConfig(_profile, t, settings) {
    const sleeveTypeInstruction =
      settings?.sleeveCap
        ? t('pdfPrintingInstructionSleeveType')
            .replace(
              '{sleeveType}',
              settings.sleeveCap === 'high'
                ? t('highCapSleeve')
                : t('lowCapSleeve'),
            )
        : null;

    return {
      enabled: true,
      calibrationSquareMm: 40,
      calibrationLabel: t('pdfTestSquareLabel4x4'),
      pageMarginMm: 8,
      pageOverlapMm: 10,
      patternPaddingXMm: 18,
      patternPaddingBottomMm: 18,
      calibrationSquareTopMm: 12,
      calibrationSquareLeftMm: 18,
      firstPageInstructions: {
        title: t('pdfPrintingInstructionsTitle'),
        items: [
          t('pdfPrintingInstructionScale'),
          t('pdfPrintingInstructionMeasure'),
          t('pdfPrintingInstructionAssemble'),
          t('pdfPrintingInstructionNoSeamAllowance'),
          ...(sleeveTypeInstruction ? [sleeveTypeInstruction] : []),
        ],
        leftMm: 82,
        topMm: 14,
        widthMm: 108,
        lineHeightMm: 5.5,
      },
    };
  },
  buildDraft(profile, _t, settings) {
    const movementEase = settings?.movementEase;
    const sleeveCap = settings?.sleeveCap;

    if (!movementEase || !sleeveCap) {
      return createEmptyDraft();
    }

    const values = createCalculationValueMap(
      calculateBodiceWithoutDarts(profile, _t, movementEase, sleeveCap),
    );
    const easeEntry = easeNoDarts.entries.find((entry) => entry.ease === movementEase);

    if (!easeEntry) {
      return createEmptyDraft();
    }

    const backWaistLengthMm = (values.get('backWaistLength') ?? 0) * MM_PER_CM;
    const armholeDepthMm = (values.get('armholeDepth') ?? 0) * MM_PER_CM;
    const armholeWidthMm = (values.get('armholeWidth') ?? 0) * MM_PER_CM;
    const halfBustWithEaseMm = (values.get('halfBustWithEase') ?? 0) * MM_PER_CM;
    const backArmholeWidthMm = (values.get('backArmholeWidth') ?? 0) * MM_PER_CM;
    const frontArmholeWidthMm = (values.get('frontArmholeWidth') ?? 0) * MM_PER_CM;
    const shoulderWidthWithEaseMm =
      (values.get('shoulderWidthWithEase') ?? 0) * MM_PER_CM;
    const neckWidthMm = (values.get('neckWidth') ?? 0) * MM_PER_CM;
    const neckDepthMm = (values.get('neckDepth') ?? 0) * MM_PER_CM;
    const backNecklineCheckMm =
      (values.get('backNecklineCheck') ?? 0) * MM_PER_CM;
    const frontNecklineCheckMm =
      (values.get('frontNecklineCheck') ?? 0) * MM_PER_CM;
    const backInnerShoulderRiseMm =
      (values.get('backInnerShoulderRise') ?? 0) * MM_PER_CM;
    const frontInnerShoulderRiseMm =
      (values.get('frontInnerShoulderRise') ?? 0) * MM_PER_CM;
    const backOuterShoulderDropMm =
      (values.get('backOuterShoulderDrop') ?? 0) * MM_PER_CM;
    const frontOuterShoulderDropMm =
      (values.get('frontOuterShoulderDrop') ?? 0) * MM_PER_CM;
    const backNeckCurveGuideLengthMm =
      easeEntry.helperMeasurements.bodice.neckBack * MM_PER_CM;
    const frontNeckCurveGuideLengthMm =
      easeEntry.helperMeasurements.bodice.neckFront * MM_PER_CM;
    const backArmholeCurveGuideLengthMm =
      easeEntry.helperMeasurements.bodice.armholeBack * MM_PER_CM;
    const frontArmholeCurveGuideLengthMm =
      easeEntry.helperMeasurements.bodice.armholeFront * MM_PER_CM;
    const sleeveLengthWithEaseMm =
      (values.get('sleeveLengthWithEase') ?? 0) * MM_PER_CM;
    const sleeveCapHeightMm =
      (values.get('sleeveCapHeight') ?? 0) * MM_PER_CM;
    const elbowHeightMm = (values.get('elbowHeight') ?? 0) * MM_PER_CM;
    const halfUpperArmWidthWithEaseMm =
      ((values.get('upperArmWidthWithEase') ?? 0) * MM_PER_CM) / 2;
    const sleeveDraft = buildSleeveDraft({
      sleeveCap,
      armholeWidthMm: armholeWidthMm,
      sleeveBackArmholeWidthMm: (values.get('sleeveBackArmholeWidth') ?? 0) * MM_PER_CM,
      sleeveLengthWithEaseMm,
      sleeveCapHeightMm,
      elbowHeightMm,
      halfUpperArmWidthWithEaseMm,
      backHighCapGuideMm: easeEntry.helperMeasurements.sleeveHighCap.back * MM_PER_CM,
      frontHighCapGuideMm: easeEntry.helperMeasurements.sleeveHighCap.front * MM_PER_CM,
      backLowCapGuideMm: easeEntry.helperMeasurements.sleeveLowCap.back * MM_PER_CM,
      frontLowCapGuideMm: easeEntry.helperMeasurements.sleeveLowCap.front * MM_PER_CM,
      backLabel: _t('backSectionLabel'),
      frontLabel: _t('frontSectionLabel'),
    });
    const centerBackTop = { x: 180, y: 60 };
    const centerBackBottom = {
      x: centerBackTop.x,
      y: centerBackTop.y + backWaistLengthMm,
    };
    const armholeDepthPoint = {
      x: centerBackTop.x,
      y: centerBackTop.y + armholeDepthMm,
    };
    const bustLineEndPoint = {
      x: armholeDepthPoint.x - halfBustWithEaseMm,
      y: armholeDepthPoint.y,
    };
    const topRightPoint = {
      x: bustLineEndPoint.x,
      y: centerBackTop.y,
    };
    const bottomRightPoint = {
      x: bustLineEndPoint.x,
      y: centerBackBottom.y,
    };
    const bottomMidPoint = {
      x: (centerBackBottom.x + bottomRightPoint.x) / 2,
      y: centerBackBottom.y,
    };
    const upperMidPoint = {
      x: bottomMidPoint.x,
      y: armholeDepthPoint.y,
    };
    const backArmholePoint = {
      x: upperMidPoint.x + backArmholeWidthMm,
      y: upperMidPoint.y,
    };
    const backArmholeTopPoint = {
      x: backArmholePoint.x,
      y: centerBackTop.y,
    };
    const frontArmholePoint = {
      x: upperMidPoint.x - frontArmholeWidthMm,
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
      y: frontArmholeTopPoint.y + frontOuterShoulderDropMm,
    };
    const frontNeckWidthPoint = {
      x: topRightPoint.x + neckWidthMm,
      y: topRightPoint.y,
    };
    const raisedFrontInnerShoulderPoint = {
      x: frontNeckWidthPoint.x,
      y: frontNeckWidthPoint.y - frontInnerShoulderRiseMm,
    };
    const frontNeckDepthPoint = {
      x: raisedFrontInnerShoulderPoint.x,
      y: raisedFrontInnerShoulderPoint.y + neckDepthMm,
    };
    const frontNeckDepthHorizontalEndPoint = {
      x: topRightPoint.x,
      y: frontNeckDepthPoint.y,
    };
    const droppedBackOuterShoulderPoint = {
      x: backArmholeTopPoint.x,
      y: backArmholeTopPoint.y + backOuterShoulderDropMm,
    };
    const backArmholeShoulderMidPoint = {
      x: (backArmholePoint.x + droppedBackOuterShoulderPoint.x) / 2,
      y: (backArmholePoint.y + droppedBackOuterShoulderPoint.y) / 2,
    };
    const neckWidthPoint = {
      x: centerBackTop.x - neckWidthMm,
      y: centerBackTop.y,
    };
    const raisedBackInnerShoulderPoint = {
      x: neckWidthPoint.x,
      y: neckWidthPoint.y - backInnerShoulderRiseMm,
    };
    const frontShoulderSpanHeightMm =
      droppedFrontOuterShoulderPoint.y - raisedFrontInnerShoulderPoint.y;
    const frontShoulderSpanWidthSquared =
      shoulderWidthWithEaseMm * shoulderWidthWithEaseMm -
      frontShoulderSpanHeightMm * frontShoulderSpanHeightMm;
    const frontShoulderSpanWidthMm = Math.sqrt(
      Math.max(frontShoulderSpanWidthSquared, 0),
    );
    const calculatedFrontOuterShoulderPoint = {
      x: raisedFrontInnerShoulderPoint.x + frontShoulderSpanWidthMm,
      y: droppedFrontOuterShoulderPoint.y,
    };
    const minimumShoulderExtensionMm = MM_PER_CM;
    const minimumFrontOuterShoulderPoint = {
      x: droppedFrontOuterShoulderPoint.x + minimumShoulderExtensionMm,
      y: droppedFrontOuterShoulderPoint.y,
    };
    const useMinimumFrontShoulderExtension =
      calculatedFrontOuterShoulderPoint.x < minimumFrontOuterShoulderPoint.x;
    const effectiveFrontShoulderSpanWidthMm = Math.max(
      (useMinimumFrontShoulderExtension
        ? minimumFrontOuterShoulderPoint.x
        : calculatedFrontOuterShoulderPoint.x) -
        raisedFrontInnerShoulderPoint.x,
      0,
    );
    const frontOuterShoulderPoint = {
      x: useMinimumFrontShoulderExtension
        ? minimumFrontOuterShoulderPoint.x
        : calculatedFrontOuterShoulderPoint.x,
      y: droppedFrontOuterShoulderPoint.y,
    };
    const adjustedFrontShoulderLineLengthMm = Math.sqrt(
      effectiveFrontShoulderSpanWidthMm * effectiveFrontShoulderSpanWidthMm +
        frontShoulderSpanHeightMm * frontShoulderSpanHeightMm,
    );
    const frontShoulderExtensionExcessMm = Math.max(
      adjustedFrontShoulderLineLengthMm - shoulderWidthWithEaseMm,
      0,
    );
    const backShoulderSpanHeightMm =
      droppedBackOuterShoulderPoint.y - raisedBackInnerShoulderPoint.y;
    const backShoulderSpanWidthSquared =
      shoulderWidthWithEaseMm * shoulderWidthWithEaseMm -
      backShoulderSpanHeightMm * backShoulderSpanHeightMm;
    const backShoulderSpanWidthMm = Math.sqrt(
      Math.max(backShoulderSpanWidthSquared, 0),
    );
    const calculatedBackOuterShoulderPoint = {
      x: raisedBackInnerShoulderPoint.x - backShoulderSpanWidthMm,
      y: droppedBackOuterShoulderPoint.y,
    };
    const minimumBackOuterShoulderPoint = {
      x: droppedBackOuterShoulderPoint.x - minimumShoulderExtensionMm,
      y: droppedBackOuterShoulderPoint.y,
    };
    const useMinimumShoulderExtension =
      calculatedBackOuterShoulderPoint.x > minimumBackOuterShoulderPoint.x;
    const effectiveBackShoulderSpanWidthMm = Math.max(
      raisedBackInnerShoulderPoint.x -
        (useMinimumShoulderExtension
          ? minimumBackOuterShoulderPoint.x
          : calculatedBackOuterShoulderPoint.x),
      0,
    );
    const backOuterShoulderPoint = {
      x: useMinimumShoulderExtension
        ? minimumBackOuterShoulderPoint.x
        : calculatedBackOuterShoulderPoint.x,
      y: droppedBackOuterShoulderPoint.y,
    };
    const adjustedShoulderLineLengthMm = Math.sqrt(
      effectiveBackShoulderSpanWidthMm * effectiveBackShoulderSpanWidthMm +
        backShoulderSpanHeightMm * backShoulderSpanHeightMm,
    );
    const shoulderExtensionExcessMm = Math.max(
      adjustedShoulderLineLengthMm - shoulderWidthWithEaseMm,
      0,
    );
    const shoulderAdjustmentExcessMm = Math.max(
      shoulderExtensionExcessMm,
      frontShoulderExtensionExcessMm,
    );
    const backOuterShoulderGuideEndPoint = {
      x: Math.min(
        droppedBackOuterShoulderPoint.x - 4 * MM_PER_CM,
        backOuterShoulderPoint.x,
      ),
      y: droppedBackOuterShoulderPoint.y,
    };
    const frontOuterShoulderGuideEndPoint = {
      x: droppedFrontOuterShoulderPoint.x + 5 * MM_PER_CM,
      y: droppedFrontOuterShoulderPoint.y,
    };
    const backNeckCurveGuidePoint = {
      ...pointFromAngle(neckWidthPoint, 120, backNeckCurveGuideLengthMm),
    };
    const backArmholeCurveGuidePoint = {
      ...pointFromAngle(backArmholePoint, 50, backArmholeCurveGuideLengthMm),
    };
    const frontNeckCurveGuidePoint = {
      ...pointFromAngle(frontNeckDepthPoint, 50, frontNeckCurveGuideLengthMm),
    };
    const frontArmholeCurveGuidePoint = {
      ...pointFromAngle(frontArmholePoint, 120, frontArmholeCurveGuideLengthMm),
    };
    const backNecklineBlendBaseY =
      centerBackTop.y - backNeckCurveGuideLengthMm * 0.3;
    const backNecklineBlendPoint = {
      x: centerBackTop.x + (neckWidthPoint.x - centerBackTop.x) * 0.65,
      y: backNecklineBlendBaseY,
    };
    const backNecklineEndBlendPoint = {
      x: centerBackTop.x + (neckWidthPoint.x - centerBackTop.x) * 0.4,
      y: centerBackTop.y,
    };
    const backNecklineShoulderControlPoint = {
      x:
        raisedBackInnerShoulderPoint.x +
        (backNeckCurveGuidePoint.x - raisedBackInnerShoulderPoint.x) * 0.45,
      y:
        raisedBackInnerShoulderPoint.y +
        (backNeckCurveGuidePoint.y - raisedBackInnerShoulderPoint.y) * 0.2,
    };
    const backNecklineGuideVector = {
      x: backNecklineBlendPoint.x - backNeckCurveGuidePoint.x,
      y: backNecklineBlendPoint.y - backNeckCurveGuidePoint.y,
    };
    const incomingShoulderVector = normalizeVector({
      x: backNeckCurveGuidePoint.x - raisedBackInnerShoulderPoint.x,
      y: backNeckCurveGuidePoint.y - raisedBackInnerShoulderPoint.y,
    });
    const outgoingGuideVector = normalizeVector(backNecklineGuideVector);
    const joinTangentVector = normalizeVector({
      x: incomingShoulderVector.x + outgoingGuideVector.x,
      y: incomingShoulderVector.y + outgoingGuideVector.y,
    });

    function createBackNecklineControls(joinTangentLengthMm: number) {
      const segmentOneControl2 = {
        x: backNeckCurveGuidePoint.x - joinTangentVector.x * joinTangentLengthMm,
        y: backNeckCurveGuidePoint.y - joinTangentVector.y * joinTangentLengthMm,
      };
      const segmentTwoControl1 = {
        x: backNeckCurveGuidePoint.x + joinTangentVector.x * joinTangentLengthMm,
        y: backNeckCurveGuidePoint.y + joinTangentVector.y * joinTangentLengthMm,
      };
      const segmentTwoControl2 = {
        x:
          backNecklineBlendPoint.x +
          (backNecklineEndBlendPoint.x - backNecklineBlendPoint.x) * 0.65,
        y: backNecklineEndBlendPoint.y,
      };
      const curveLengthMm =
        approximateCubicLength(
          raisedBackInnerShoulderPoint,
          backNecklineShoulderControlPoint,
          segmentOneControl2,
          backNeckCurveGuidePoint,
        ) +
        approximateCubicLength(
          backNeckCurveGuidePoint,
          segmentTwoControl1,
          segmentTwoControl2,
          centerBackTop,
        );

      return {
        segmentOneControl2,
        segmentTwoControl1,
        segmentTwoControl2,
        curveLengthMm,
      };
    }

    let bestBackNecklineControls = createBackNecklineControls(0);

    for (
      let joinTangentLengthMm = 0;
      joinTangentLengthMm <= 60;
      joinTangentLengthMm += 0.25
    ) {
      const candidateControls = createBackNecklineControls(joinTangentLengthMm);

      if (
        Math.abs(candidateControls.curveLengthMm - backNecklineCheckMm) <
        Math.abs(bestBackNecklineControls.curveLengthMm - backNecklineCheckMm)
      ) {
        bestBackNecklineControls = candidateControls;
      }
    }

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
    function createFrontNecklineControls(preEndExtraRightMm: number) {
      const frontNecklinePreEndPoint = {
        x:
          frontNeckDepthHorizontalEndPoint.x +
          (frontNeckDepthPoint.x - frontNeckDepthHorizontalEndPoint.x) * 0.12 +
          preEndExtraRightMm,
        y: frontNeckDepthPoint.y - 0.1 * MM_PER_CM,
      };
      const preEndSegmentSpanX =
        frontNeckDepthHorizontalEndPoint.x - frontNecklinePreEndPoint.x;
      const frontNecklineStartTangent = normalizeVector(
        subtractPoints(frontNeckCurveGuidePoint, raisedFrontInnerShoulderPoint),
      );
      const frontNecklineGuideTangent = normalizeVector(
        addPoints(
          normalizeVector(
            subtractPoints(frontNeckCurveGuidePoint, raisedFrontInnerShoulderPoint),
          ),
          normalizeVector(
            subtractPoints(frontNecklinePreEndPoint, frontNeckCurveGuidePoint),
          ),
        ),
      );
      const firstSegmentControls = segmentControls(
        raisedFrontInnerShoulderPoint,
        frontNeckCurveGuidePoint,
        frontNecklineStartTangent,
        frontNecklineGuideTangent,
        0.22,
      );
      const secondSegmentLength = distanceBetweenPoints(
        frontNeckCurveGuidePoint,
        frontNeckDepthHorizontalEndPoint,
      );
      const secondSegmentHandleLength = secondSegmentLength * 0.2;
      const secondSegmentControls = {
        control1: addPoints(
          frontNeckCurveGuidePoint,
          scalePoint(frontNecklineGuideTangent, secondSegmentHandleLength),
        ),
        control2: {
          x: frontNecklinePreEndPoint.x + preEndSegmentSpanX * 0.28,
          y: frontNecklinePreEndPoint.y - preEndSegmentSpanX * 0.08,
        },
      };
      const curveLengthMm =
        approximateCubicLength(
          raisedFrontInnerShoulderPoint,
          firstSegmentControls.control1,
          firstSegmentControls.control2,
          frontNeckCurveGuidePoint,
        ) +
        approximateCubicLength(
          frontNeckCurveGuidePoint,
          secondSegmentControls.control1,
          secondSegmentControls.control2,
          frontNeckDepthHorizontalEndPoint,
        );

      return {
        frontNecklinePreEndPoint,
        firstSegmentControls,
        secondSegmentControls,
        curveLengthMm,
      };
    }

    let bestFrontNecklineControls = createFrontNecklineControls(1.5 * MM_PER_CM);

    for (
      let preEndExtraRightMm = 0.5 * MM_PER_CM;
      preEndExtraRightMm <= 2.5 * MM_PER_CM;
      preEndExtraRightMm += 0.25
    ) {
      const candidateControls = createFrontNecklineControls(preEndExtraRightMm);

      if (
        Math.abs(candidateControls.curveLengthMm - frontNecklineCheckMm) <
        Math.abs(
          bestFrontNecklineControls.curveLengthMm - frontNecklineCheckMm,
        )
      ) {
        bestFrontNecklineControls = candidateControls;
      }
    }

    const bodicePoints = [
        { id: '1', x: centerBackTop.x, y: centerBackTop.y },
        { id: '2', x: centerBackBottom.x, y: centerBackBottom.y },
        { id: '3', x: armholeDepthPoint.x, y: armholeDepthPoint.y },
        { id: '4', x: bustLineEndPoint.x, y: bustLineEndPoint.y },
        { id: '6', x: topRightPoint.x, y: topRightPoint.y },
        { id: '5', x: bottomRightPoint.x, y: bottomRightPoint.y },
        { id: '7', x: bottomMidPoint.x, y: bottomMidPoint.y },
        { id: '8', x: upperMidPoint.x, y: upperMidPoint.y },
        { id: '9', x: backArmholePoint.x, y: backArmholePoint.y },
        {
          id: '9a',
          x: backArmholeCurveGuidePoint.x,
          y: backArmholeCurveGuidePoint.y,
        },
        { id: '10', x: backArmholeTopPoint.x, y: backArmholeTopPoint.y },
        { id: '18', x: frontNeckWidthPoint.x, y: frontNeckWidthPoint.y },
        {
          id: '19',
          x: raisedFrontInnerShoulderPoint.x,
          y: raisedFrontInnerShoulderPoint.y,
        },
        {
          id: '19a',
          x: raisedFrontInnerShoulderPoint.x,
          y: topRightPoint.y,
        },
        {
          id: '20',
          x: frontNeckDepthPoint.x,
          y: frontNeckDepthPoint.y,
        },
        {
          id: '20a',
          x: frontNeckCurveGuidePoint.x,
          y: frontNeckCurveGuidePoint.y,
        },
        {
          id: '21',
          x: frontNeckDepthHorizontalEndPoint.x,
          y: frontNeckDepthHorizontalEndPoint.y,
        },
        {
          id: '15',
          x: droppedBackOuterShoulderPoint.x,
          y: droppedBackOuterShoulderPoint.y,
        },
        {
          id: '17',
          x: backArmholeShoulderMidPoint.x,
          y: backArmholeShoulderMidPoint.y,
        },
        {
          id: '16',
          x: backOuterShoulderPoint.x,
          y: backOuterShoulderPoint.y,
        },
        { id: '11', x: frontArmholePoint.x, y: frontArmholePoint.y },
        {
          id: '11a',
          x: frontArmholeCurveGuidePoint.x,
          y: frontArmholeCurveGuidePoint.y,
        },
        {
          id: '24',
          x: frontArmholeThirdPoint.x,
          y: frontArmholeThirdPoint.y,
        },
        { id: '12', x: frontArmholeTopPoint.x, y: frontArmholeTopPoint.y },
        {
          id: '22',
          x: droppedFrontOuterShoulderPoint.x,
          y: droppedFrontOuterShoulderPoint.y,
        },
        {
          id: 'frontOuterShoulderGuideEnd',
          x: frontOuterShoulderGuideEndPoint.x,
          y: frontOuterShoulderGuideEndPoint.y,
        },
        {
          id: '23',
          x: frontOuterShoulderPoint.x,
          y: frontOuterShoulderPoint.y,
        },
        { id: '13', x: neckWidthPoint.x, y: neckWidthPoint.y },
        {
          id: '13b',
          x: backNecklineBlendPoint.x,
          y: backNecklineBlendPoint.y,
        },
        {
          id: '13c',
          x: backNecklineEndBlendPoint.x,
          y: backNecklineEndBlendPoint.y,
        },
        {
          id: '14',
          x: raisedBackInnerShoulderPoint.x,
          y: raisedBackInnerShoulderPoint.y,
        },
        {
          id: '13a',
          x: backNeckCurveGuidePoint.x,
          y: backNeckCurveGuidePoint.y,
        },
        {
          id: 'frontNeckPreEnd',
          x: bestFrontNecklineControls.frontNecklinePreEndPoint.x,
          y: bestFrontNecklineControls.frontNecklinePreEndPoint.y,
        },
        {
          id: 'backOuterShoulderGuideEnd',
          x: backOuterShoulderGuideEndPoint.x,
          y: backOuterShoulderGuideEndPoint.y,
        },
      ];
    return {
      units: 'mm',
      width: 720,
      height: 420,
      points: bodicePoints,
      markers: [],
      lines: [
        {
          id: 'centerBackBaseLine',
          from: '1',
          to: '2',
          kind: 'fold',
          label: _t('cutOnFoldLabel'),
        },
        {
          id: 'armholeDepthLine',
          from: '3',
          to: '4',
          kind: 'construction',
        },
        {
          id: 'frontReferenceVerticalLine',
          from: '6',
          to: '21',
          kind: 'construction',
        },
        {
          id: 'rightVerticalLine',
          from: '21',
          to: '5',
          kind: 'fold',
          label: _t('cutOnFoldLabel'),
        },
        {
          id: 'frontNeckWidthReferenceLine',
          from: '6',
          to: '18',
          kind: 'construction',
        },
        {
          id: 'topHorizontalLine',
          from: '1',
          to: '19a',
          kind: 'construction',
        },
        {
          id: 'frontTopGuideLine',
          from: '19a',
          to: '6',
          kind: 'construction',
        },
        {
          id: 'bottomHorizontalLine',
          from: '2',
          to: '5',
          kind: 'outline',
        },
        {
          id: 'centerVerticalLine',
          from: '7',
          to: '8',
          kind: 'outline',
        },
        {
          id: 'backArmholeVerticalLine',
          from: '9',
          to: '10',
          kind: 'construction',
        },
        {
          id: 'backArmholeCurveGuideLine',
          from: '9',
          to: '9a',
          kind: 'construction',
        },
        {
          id: 'frontArmholeVerticalLine',
          from: '11',
          to: '12',
          kind: 'construction',
        },
        {
          id: 'frontArmholeCurveGuideLine',
          from: '11',
          to: '11a',
          kind: 'construction',
        },
        {
          id: 'frontOuterShoulderDropLine',
          from: '12',
          to: '22',
          kind: 'construction',
        },
        {
          id: 'frontOuterShoulderGuideLine',
          from: '22',
          to: 'frontOuterShoulderGuideEnd',
          kind: 'construction',
        },
        {
          id: 'frontShoulderLine',
          from: '19',
          to: '23',
          kind: 'outline',
        },
        {
          id: 'backOuterShoulderDropLine',
          from: '10',
          to: '15',
          kind: 'construction',
        },
        {
          id: 'backOuterShoulderGuideLine',
          from: '15',
          to: 'backOuterShoulderGuideEnd',
          kind: 'construction',
        },
        {
          id: 'backShoulderWidthGuideLine',
          from: '14',
          to: '16',
          kind: 'outline',
        },
        {
          id: 'backInnerShoulderRiseLine',
          from: '13',
          to: '14',
          kind: 'construction',
        },
        {
          id: 'backNeckCurveGuideLine',
          from: '13',
          to: '13a',
          kind: 'construction',
        },
        {
          id: 'frontInnerShoulderRiseLine',
          from: '18',
          to: '19',
          kind: 'construction',
        },
        {
          id: 'frontNeckDepthGuideLine',
          from: '19',
          to: '20',
          kind: 'construction',
        },
        {
          id: 'frontNeckDepthHorizontalGuideLine',
          from: '20',
          to: '21',
          kind: 'construction',
        },
        {
          id: 'frontNeckCurveGuideLine',
          from: '20',
          to: '20a',
          kind: 'construction',
        },
      ].map((line) =>
        line.kind === 'construction'
          ? { ...line, kind: 'hidden' as const }
          : {
              ...line,
              kind: line.kind as
                | 'outline'
                | 'construction'
                | 'hidden'
                | 'grainline'
                | 'fold'
                | undefined,
            },
      ),
      paths: [
        {
          id: 'backNecklineCurve',
          d: `M ${raisedBackInnerShoulderPoint.x} ${raisedBackInnerShoulderPoint.y} C ${backNecklineShoulderControlPoint.x} ${backNecklineShoulderControlPoint.y} ${bestBackNecklineControls.segmentOneControl2.x} ${bestBackNecklineControls.segmentOneControl2.y} ${backNeckCurveGuidePoint.x} ${backNeckCurveGuidePoint.y} C ${bestBackNecklineControls.segmentTwoControl1.x} ${bestBackNecklineControls.segmentTwoControl1.y} ${bestBackNecklineControls.segmentTwoControl2.x} ${bestBackNecklineControls.segmentTwoControl2.y} ${centerBackTop.x} ${centerBackTop.y}`,
          kind: 'outline',
        },
        {
          id: 'backArmholeCurve',
          d: `M ${backOuterShoulderPoint.x} ${backOuterShoulderPoint.y} C ${backArmholeCurveStartControls.control1.x} ${backArmholeCurveStartControls.control1.y} ${backArmholeCurveStartControls.control2.x} ${backArmholeCurveStartControls.control2.y} ${backArmholeShoulderMidPoint.x} ${backArmholeShoulderMidPoint.y} C ${backArmholeCurveMiddleControls.control1.x} ${backArmholeCurveMiddleControls.control1.y} ${backArmholeCurveMiddleControls.control2.x} ${backArmholeCurveMiddleControls.control2.y} ${backArmholeCurveGuidePoint.x} ${backArmholeCurveGuidePoint.y} C ${backArmholeCurveEndControls.control1.x} ${backArmholeCurveEndControls.control1.y} ${backArmholeCurveEndControls.control2.x} ${backArmholeCurveEndControls.control2.y} ${upperMidPoint.x} ${upperMidPoint.y}`,
          kind: 'outline',
        },
        {
          id: 'frontArmholeCurve',
          d: `M ${frontOuterShoulderPoint.x} ${frontOuterShoulderPoint.y} C ${frontArmholeCurveStartControls.control1.x} ${frontArmholeCurveStartControls.control1.y} ${frontArmholeCurveStartControls.control2.x} ${frontArmholeCurveStartControls.control2.y} ${frontArmholeThirdPoint.x} ${frontArmholeThirdPoint.y} C ${frontArmholeCurveMiddleControls.control1.x} ${frontArmholeCurveMiddleControls.control1.y} ${frontArmholeCurveMiddleControls.control2.x} ${frontArmholeCurveMiddleControls.control2.y} ${frontArmholeCurveGuidePoint.x} ${frontArmholeCurveGuidePoint.y} C ${frontArmholeCurveEndControls.control1.x} ${frontArmholeCurveEndControls.control1.y} ${frontArmholeCurveEndControls.control2.x} ${frontArmholeCurveEndControls.control2.y} ${upperMidPoint.x} ${upperMidPoint.y}`,
          kind: 'outline',
        },
        {
          id: 'frontNecklineCurve',
          d: `M ${raisedFrontInnerShoulderPoint.x} ${raisedFrontInnerShoulderPoint.y} C ${bestFrontNecklineControls.firstSegmentControls.control1.x} ${bestFrontNecklineControls.firstSegmentControls.control1.y} ${bestFrontNecklineControls.firstSegmentControls.control2.x} ${bestFrontNecklineControls.firstSegmentControls.control2.y} ${frontNeckCurveGuidePoint.x} ${frontNeckCurveGuidePoint.y} C ${bestFrontNecklineControls.secondSegmentControls.control1.x} ${bestFrontNecklineControls.secondSegmentControls.control1.y} ${bestFrontNecklineControls.secondSegmentControls.control2.x} ${bestFrontNecklineControls.secondSegmentControls.control2.y} ${frontNeckDepthHorizontalEndPoint.x} ${frontNeckDepthHorizontalEndPoint.y}`,
          kind: 'outline',
        },
      ],
      labels: [
        {
          id: 'bodiceBackLabel',
          text: _t('backSectionLabel'),
          x: centerBackTop.x + (upperMidPoint.x - centerBackTop.x) * 0.38,
          y: centerBackTop.y + armholeDepthMm * 0.4,
        },
        {
          id: 'bodiceFrontLabel',
          text: _t('frontSectionLabel'),
          x:
            upperMidPoint.x +
            (frontNeckDepthHorizontalEndPoint.x - upperMidPoint.x) * 0.38 -
            5 * MM_PER_CM,
          y: centerBackTop.y + armholeDepthMm * 0.4,
        },
      ],
      notes: [
        ...(shoulderAdjustmentExcessMm > 0
          ? [
              {
                id: 'sleeveLengthAdjustment',
                text: _t('bodiceShoulderExtensionAdjustment').replace(
                  '{value}',
                  (shoulderAdjustmentExcessMm / MM_PER_CM).toFixed(1),
                ),
                severity: 'info' as const,
              },
            ]
          : []),
        ...(shoulderAdjustmentExcessMm > MM_PER_CM
          ? [
              {
                id: 'lowCapRecommendation',
                text: _t('bodiceLowCapSleeveRecommendation'),
                severity: 'warning' as const,
              },
            ]
          : []),
      ],
      supplementalDrafts: [
        {
          id: 'sleeveDraft',
          title:
            sleeveCap === 'high'
              ? _t('highCapSleeve')
              : _t('lowCapSleeve'),
          draft: sleeveDraft,
        },
      ],
    };
  },
};
