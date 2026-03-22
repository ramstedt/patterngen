import type { Profile } from '../../../types/measurements';
import { formatMeasurement } from '../../measurements';
import type { PatternCalculation, PatternDraft, Translate } from '../types';

type Point = { x: number; y: number };
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

function quadraticPath(start: Point, control: Point, end: Point) {
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

function cubicPath(start: Point, control1: Point, control2: Point, end: Point) {
  return `M ${start.x} ${start.y} C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}`;
}

function easeOutQuadratic(value: number) {
  return 1 - (1 - value) * (1 - value);
}

function waistlineYAtX({
  x,
  flatStartX,
  end,
  baselineY,
}: {
  x: number;
  flatStartX: number;
  end: Point;
  baselineY: number;
}) {
  if (x <= flatStartX) {
    return baselineY;
  }

  if (x >= end.x) {
    return end.y;
  }

  const t = (x - flatStartX) / (end.x - flatStartX);
  const easedT = easeOutQuadratic(t);

  return baselineY + (end.y - baselineY) * easedT;
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
    throw new Error('Hip height cannot exceed skirt length for straight skirt draft.');
  }

  if (hipDepthMm > skirtLengthMm) {
    throw new Error('Hip depth cannot exceed skirt length for straight skirt draft.');
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
  const dimensionOffsetMm = 16;
  const dimensionLabelGapMm = 28;
  const grainlineInsetY = 22;
  const arrowSizeMm = 7;

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

  const leftCurvePath = [
    quadraticPath(
      seatCenterPoint,
      { x: sideLineX - lowerCurveOffsetMm, y: seatMarkerY - lowerCurveLiftMm },
      leftHipPoint,
    ),
    `Q ${leftHipPoint.x - upperCurveOffsetMm} ${leftWaistPoint.y + upperCurveDropMm} ${leftWaistPoint.x} ${leftWaistPoint.y}`,
  ].join(' ');

  const rightCurvePath = [
    quadraticPath(
      seatCenterPoint,
      { x: sideLineX + lowerCurveOffsetMm, y: seatMarkerY - lowerCurveLiftMm },
      rightHipPoint,
    ),
    `Q ${rightHipPoint.x + upperCurveOffsetMm} ${rightWaistPoint.y + upperCurveDropMm} ${rightWaistPoint.x} ${rightWaistPoint.y}`,
  ].join(' ');

  const rightWaistCurveStartX = lineX - 40;
  const rightWaistCurveMeetX = lineX - (lineX - rightWaistPoint.x) / 2;
  const rightWaistCurvePath = [
    `M ${lineX} ${loweredBackWaistY}`,
    `L ${rightWaistCurveStartX} ${loweredBackWaistY}`,
    `Q ${rightWaistCurveStartX - backDartPlacementMm / 6} ${loweredBackWaistY} ${rightWaistCurveMeetX} ${startY}`,
    `Q ${rightWaistPoint.x + 24} ${rightWaistPoint.y + 2} ${rightWaistPoint.x} ${rightWaistPoint.y}`,
  ].join(' ');

  const leftWaistCurveMeetX = leftX + (leftWaistPoint.x - leftX) / 2;
  const leftWaistCurveStart = { x: leftWaistCurveMeetX, y: startY };
  const leftWaistCurveControl1 = {
    x: leftWaistCurveMeetX + frontDartPlacementMm / 5,
    y: startY,
  };
  const leftWaistCurveControl2 = {
    x: leftWaistPoint.x - 24,
    y: leftWaistPoint.y + 2,
  };
  const leftWaistCurvePath = [
    `M ${leftX} ${startY}`,
    `L ${leftWaistCurveMeetX} ${startY}`,
    cubicPath(
      leftWaistCurveStart,
      leftWaistCurveControl1,
      leftWaistCurveControl2,
      leftWaistPoint,
    ),
  ].join(' ');

  const frontDartTopY = waistlineYAtX({
    x: frontDartX,
    flatStartX: leftWaistCurveMeetX,
    end: leftWaistPoint,
    baselineY: startY,
  });
  const frontDartLeftTopY = waistlineYAtX({
    x: frontDartLeftX,
    flatStartX: leftWaistCurveMeetX,
    end: leftWaistPoint,
    baselineY: startY,
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
      { id: 'waistMiddle', x: sideLineX, y: startY - raisedWaistDotMm },
      { id: 'sideLineTop', x: sideLineX, y: seatMarkerY },
      { id: 'sideLineBottom', x: sideLineX, y: endY },
      { id: 'backDartTop', x: backDartX, y: startY },
      { id: 'backDartBottom', x: backDartX, y: backDartBottomY },
      { id: 'frontDartTop', x: frontDartX, y: frontDartTopY },
      { id: 'frontDartBottom', x: frontDartX, y: frontDartBottomY },
      { id: 'backDartWidthLeft', x: backDartX - halfBackDartWidthMm, y: startY },
      { id: 'backDartWidthRight', x: backDartX + halfBackDartWidthMm, y: startY },
      { id: 'frontDartWidthLeft', x: frontDartLeftX, y: frontDartLeftTopY },
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
        kind: 'construction',
      },
      {
        id: 'hipHeightMarker',
        from: 'hipMarkerStart',
        to: 'hipMarkerEnd',
        kind: 'outline',
      },
      {
        id: 'seatHeightMarker',
        from: 'seatMarkerStart',
        to: 'seatMarkerEnd',
        kind: 'outline',
      },
      {
        id: 'backDartGuide',
        from: 'backDartTop',
        to: 'backDartBottom',
        kind: 'construction',
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
        kind: 'construction',
      },
      {
        id: 'lengthMeasureLower',
        from: 'lengthMeasureLowerTextGap',
        to: 'lengthMeasureBottom',
        kind: 'construction',
      },
      {
        id: 'widthMeasureLeftLine',
        from: 'widthMeasureLeft',
        to: 'widthMeasureLeftTextGap',
        kind: 'construction',
      },
      {
        id: 'widthMeasureRightLine',
        from: 'widthMeasureRightTextGap',
        to: 'widthMeasureRight',
        kind: 'construction',
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
        id: 'groundLineLengthLabel',
        text: `${formatMeasurement(skirtLengthCm)} cm`,
        x: lengthMeasureX,
        y: centerY,
        rotate: 90,
      },
      {
        id: 'bottomWidthLabel',
        text: `${formatMeasurement(bottomWidthMm / 10)} cm`,
        x: widthCenterX,
        y: widthMeasureY + 4,
      },
      {
        id: 'hipLineLabel',
        text: t('hipLine'),
        x: lineX + 52,
        y: hipMarkerY,
      },
      {
        id: 'seatLineLabel',
        text: t('seatLine'),
        x: lineX + 52,
        y: seatMarkerY,
      },
      {
        id: 'waistLineLabel',
        text: t('waistLine'),
        x: lineX + 52,
        y: startY,
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
  };
}
