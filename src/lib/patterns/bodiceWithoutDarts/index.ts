import { calculateBodiceWithoutDarts } from './calculations';
import easeNoDarts from '../../../data/easeNoDarts.json';
import type { PatternDefinition } from '../types';

const MM_PER_CM = 10;
type Point = { x: number; y: number };

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

export const bodiceWithoutDartsPattern: PatternDefinition = {
  id: 'bodiceWithoutDarts',
  category: 'bodices',
  supportedProfileTypes: ['women'],
  requiredMeasurements: ['backWaistLength', 'bustCircumference'],
  calculate(profile, t, settings) {
    const movementEase = settings?.movementEase;

    if (!movementEase) {
      return [];
    }

    return calculateBodiceWithoutDarts(profile, t, movementEase);
  },
  buildPrintConfig(_profile, t) {
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

    if (!movementEase) {
      return createEmptyDraft();
    }

    const values = createCalculationValueMap(
      calculateBodiceWithoutDarts(profile, _t, movementEase),
    );
    const easeEntry = easeNoDarts.entries.find((entry) => entry.ease === movementEase);

    if (!easeEntry) {
      return createEmptyDraft();
    }

    const backWaistLengthMm = (values.get('backWaistLength') ?? 0) * MM_PER_CM;
    const armholeDepthMm = (values.get('armholeDepth') ?? 0) * MM_PER_CM;
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

    return {
      units: 'mm',
      width: 720,
      height: 420,
      points: [
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
      ],
      markers: [],
      lines: [
        {
          id: 'centerBackBaseLine',
          from: '1',
          to: '2',
          kind: 'outline',
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
          kind: 'outline',
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
      labels: [],
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
    };
  },
};
