import type { PatternDraft, PatternPrintConfig } from '../patterns';

type PrintLineStyle = {
  strokeWidthMm: number;
  strokeColor: [number, number, number];
  dashPatternMm?: number[];
};

type PrintLabelStyle = {
  fontSizePt: number;
  fontName: 'F1' | 'F2';
};

type FoldAnnotationStyle = {
  strokeWidthMm: number;
};

type PdfObject = {
  id: number;
  body: string;
};

type PdfPathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'Q'; x1: number; y1: number; x: number; y: number }
  | {
      type: 'C';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x: number;
      y: number;
    }
  | { type: 'Z' };

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const DEFAULT_PAGE_MARGIN_MM = 8;
const DEFAULT_PAGE_OVERLAP_MM = 10;
const DEFAULT_PATTERN_PADDING_X_MM = 18;
const DEFAULT_PATTERN_PADDING_BOTTOM_MM = 18;
const DEFAULT_CALIBRATION_SQUARE_MM = 40;
const DEFAULT_CALIBRATION_LABEL = 'test square';
const CALIBRATION_LABEL_GAP_MM = 8;
const DEFAULT_CALIBRATION_TOP_MM = 12;
const DEFAULT_CALIBRATION_LEFT_MM = 18;
const DEFAULT_INSTRUCTIONS_LEFT_MM = 82;
const DEFAULT_INSTRUCTIONS_TOP_MM = 14;
const DEFAULT_INSTRUCTIONS_WIDTH_MM = 108;
const DEFAULT_INSTRUCTIONS_LINE_HEIGHT_MM = 5.5;

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type TilingArea = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type ResolvedFirstPageInstructions = {
  title?: string;
  items: string[];
  leftMm: number;
  topMm: number;
  widthMm: number;
  lineHeightMm: number;
};

type PdfPoint = {
  x: number;
  y: number;
};

type PdfSegment = {
  from: PdfPoint;
  to: PdfPoint;
};

const SUPPLEMENTAL_DRAFT_GAP_MM = 50;

function mmToPt(value: number) {
  return value * MM_TO_PT;
}

function translatePathData(pathData: string, offsetX: number, offsetY: number) {
  return parsePathData(pathData)
    .map((command) => {
      if (command.type === 'M' || command.type === 'L') {
        return `${command.type} ${formatNumber(command.x + offsetX)} ${formatNumber(command.y + offsetY)}`;
      }

      if (command.type === 'Q') {
        return `Q ${formatNumber(command.x1 + offsetX)} ${formatNumber(command.y1 + offsetY)} ${formatNumber(command.x + offsetX)} ${formatNumber(command.y + offsetY)}`;
      }

      if (command.type === 'C') {
        return `C ${formatNumber(command.x1 + offsetX)} ${formatNumber(command.y1 + offsetY)} ${formatNumber(command.x2 + offsetX)} ${formatNumber(command.y2 + offsetY)} ${formatNumber(command.x + offsetX)} ${formatNumber(command.y + offsetY)}`;
      }

      return 'Z';
    })
    .join(' ');
}

function prefixDraftId(prefix: string, id: string) {
  return `${prefix}${id}`;
}

function translateDraftForPdf(
  draft: PatternDraft,
  prefix: string,
  offsetX: number,
  offsetY: number,
): PatternDraft {
  return {
    ...draft,
    points: draft.points.map((point) => ({
      id: prefixDraftId(prefix, point.id),
      x: point.x + offsetX,
      y: point.y + offsetY,
    })),
    markers:
      draft.markers?.map((marker) => ({
        ...marker,
        id: prefixDraftId(prefix, marker.id),
        pointId: prefixDraftId(prefix, marker.pointId),
      })) ?? [],
    lines: draft.lines.map((line) => ({
      ...line,
      id: prefixDraftId(prefix, line.id),
      from: prefixDraftId(prefix, line.from),
      to: prefixDraftId(prefix, line.to),
    })),
    paths: draft.paths.map((path) => ({
      ...path,
      id: prefixDraftId(prefix, path.id),
      d: translatePathData(path.d, offsetX, offsetY),
    })),
    labels: draft.labels.map((label) => ({
      ...label,
      id: prefixDraftId(prefix, label.id),
      x: label.x + offsetX,
      y: label.y + offsetY,
    })),
    notes: draft.notes?.map((note) => ({
      ...note,
      id: prefixDraftId(prefix, note.id),
    })),
    supplementalDrafts: [],
  };
}

function mergeDrafts(
  baseDraft: PatternDraft,
  additionalDraft: PatternDraft,
): PatternDraft {
  return {
    ...baseDraft,
    width: Math.max(baseDraft.width, additionalDraft.width),
    height: Math.max(baseDraft.height, additionalDraft.height),
    points: [...baseDraft.points, ...additionalDraft.points],
    markers: [...(baseDraft.markers ?? []), ...(additionalDraft.markers ?? [])],
    lines: [...baseDraft.lines, ...additionalDraft.lines],
    paths: [...baseDraft.paths, ...additionalDraft.paths],
    labels: [...baseDraft.labels, ...additionalDraft.labels],
    notes: [...(baseDraft.notes ?? []), ...(additionalDraft.notes ?? [])],
  };
}

function positionSupplementalDraftBelow(
  mainBounds: Bounds,
  currentBottom: number,
  supplementalDraft: PatternDraft,
  index: number,
) {
  const supplementalBounds = getDraftContentBounds(supplementalDraft);
  const offsetX = mainBounds.minX - supplementalBounds.minX;
  const offsetY =
    currentBottom + SUPPLEMENTAL_DRAFT_GAP_MM - supplementalBounds.minY;

  return translateDraftForPdf(
    supplementalDraft,
    `supp-${index}-`,
    offsetX,
    offsetY,
  );
}

function composeDraftForPdf(draft: PatternDraft): PatternDraft {
  if (!draft.supplementalDrafts?.length) {
    return draft;
  }

  const mainDraft = translateDraftForPdf(draft, 'main-', 0, 0);
  const mainBounds = getDraftContentBounds(mainDraft);
  let currentBottom = mainBounds.maxY;
  let composedDraft: PatternDraft = {
    ...mainDraft,
    supplementalDrafts: [],
  };

  for (let index = 0; index < draft.supplementalDrafts.length; index += 1) {
    const supplementalDraft = draft.supplementalDrafts[index]
      .draft as PatternDraft;
    const translatedSupplementalDraft = positionSupplementalDraftBelow(
      mainBounds,
      currentBottom,
      supplementalDraft,
      index,
    );
    const translatedSupplementalBounds = getDraftContentBounds(
      translatedSupplementalDraft,
    );

    currentBottom = translatedSupplementalBounds.maxY;
    composedDraft = mergeDrafts(composedDraft, {
      ...translatedSupplementalDraft,
      height: currentBottom + SUPPLEMENTAL_DRAFT_GAP_MM,
    });
  }

  return composedDraft;
}

function resolvePrintConfig(printConfig?: PatternPrintConfig) {
  const calibrationSquareMm =
    printConfig?.calibrationSquareMm ?? DEFAULT_CALIBRATION_SQUARE_MM;
  const calibrationSquareTopMm =
    printConfig?.calibrationSquareTopMm ?? DEFAULT_CALIBRATION_TOP_MM;
  const firstPageInstructions = printConfig?.firstPageInstructions
    ? {
        title: printConfig.firstPageInstructions.title,
        items: printConfig.firstPageInstructions.items ?? [],
        leftMm:
          printConfig.firstPageInstructions.leftMm ??
          DEFAULT_INSTRUCTIONS_LEFT_MM,
        topMm:
          printConfig.firstPageInstructions.topMm ??
          DEFAULT_INSTRUCTIONS_TOP_MM,
        widthMm:
          printConfig.firstPageInstructions.widthMm ??
          DEFAULT_INSTRUCTIONS_WIDTH_MM,
        lineHeightMm:
          printConfig.firstPageInstructions.lineHeightMm ??
          DEFAULT_INSTRUCTIONS_LINE_HEIGHT_MM,
      }
    : undefined;

  return {
    enabled: printConfig?.enabled ?? true,
    calibrationSquareMm,
    calibrationLabel:
      printConfig?.calibrationLabel ?? DEFAULT_CALIBRATION_LABEL,
    pageMarginMm: printConfig?.pageMarginMm ?? DEFAULT_PAGE_MARGIN_MM,
    pageOverlapMm: printConfig?.pageOverlapMm ?? DEFAULT_PAGE_OVERLAP_MM,
    patternPaddingXMm:
      printConfig?.patternPaddingXMm ?? DEFAULT_PATTERN_PADDING_X_MM,
    patternPaddingBottomMm:
      printConfig?.patternPaddingBottomMm ?? DEFAULT_PATTERN_PADDING_BOTTOM_MM,
    firstPageTopReservedMm: printConfig?.firstPageTopReservedMm,
    calibrationSquareTopMm,
    calibrationSquareLeftMm:
      printConfig?.calibrationSquareLeftMm ?? DEFAULT_CALIBRATION_LEFT_MM,
    firstPageInstructions,
  };
}

function getTileCount(totalSize: number, tileSize: number, overlap: number) {
  if (totalSize <= tileSize) {
    return 1;
  }

  return Math.ceil((totalSize - tileSize) / (tileSize - overlap)) + 1;
}

function escapePdfText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function formatNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

function getLineStyle(
  kind: PatternDraft['lines'][number]['kind'],
): PrintLineStyle {
  if (kind === 'construction') {
    return {
      strokeWidthMm: 0.25,
      strokeColor: [0.45, 0.45, 0.45],
      dashPatternMm: [2.6, 2.2],
    };
  }

  if (kind === 'grainline') {
    return {
      strokeWidthMm: 0.3,
      strokeColor: [0.35, 0.35, 0.35],
    };
  }

  if (kind === 'fold') {
    return {
      strokeWidthMm: 0.45,
      strokeColor: [0.05, 0.05, 0.05],
    };
  }

  return {
    strokeWidthMm: 0.45,
    strokeColor: [0.05, 0.05, 0.05],
  };
}

function getPointAtFraction(from: PdfPoint, to: PdfPoint, fraction: number) {
  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
  };
}

function orientation(a: PdfPoint, b: PdfPoint, c: PdfPoint) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

  if (Math.abs(value) < 0.0001) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function onSegment(a: PdfPoint, b: PdfPoint, c: PdfPoint) {
  return (
    b.x <= Math.max(a.x, c.x) + 0.0001 &&
    b.x >= Math.min(a.x, c.x) - 0.0001 &&
    b.y <= Math.max(a.y, c.y) + 0.0001 &&
    b.y >= Math.min(a.y, c.y) - 0.0001
  );
}

function segmentsIntersect(first: PdfSegment, second: PdfSegment) {
  const o1 = orientation(first.from, first.to, second.from);
  const o2 = orientation(first.from, first.to, second.to);
  const o3 = orientation(second.from, second.to, first.from);
  const o4 = orientation(second.from, second.to, first.to);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  if (o1 === 0 && onSegment(first.from, second.from, first.to)) return true;
  if (o2 === 0 && onSegment(first.from, second.to, first.to)) return true;
  if (o3 === 0 && onSegment(second.from, first.from, second.to)) return true;
  if (o4 === 0 && onSegment(second.from, first.to, second.to)) return true;

  return false;
}

function getVisibleLineSegments(
  draft: PatternDraft,
  points: Map<string, PatternDraft['points'][number]>,
  excludedLineId?: string,
) {
  const segments: PdfSegment[] = [];

  for (const line of draft.lines) {
    if (line.kind === 'hidden' || line.id === excludedLineId) continue;

    const from = points.get(line.from);
    const to = points.get(line.to);

    if (!from || !to) continue;

    segments.push({ from, to });
  }

  return segments;
}

function buildGrainlineArrowSegmentsAtFraction(
  from: PdfPoint,
  to: PdfPoint,
  fraction: number,
  pointsTowardStart: boolean,
  arrowLengthMm = 3.5,
  arrowHalfWidthMm = 1.5,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / length, y: dy / length };
  const perpendicular = { x: -unit.y, y: unit.x };
  const tip = getPointAtFraction(from, to, fraction);
  const direction = pointsTowardStart ? -1 : 1;
  const base = {
    x: tip.x - unit.x * arrowLengthMm * direction,
    y: tip.y - unit.y * arrowLengthMm * direction,
  };

  return [
    {
      from: tip,
      to: {
        x: base.x + perpendicular.x * arrowHalfWidthMm,
        y: base.y + perpendicular.y * arrowHalfWidthMm,
      },
    },
    {
      from: tip,
      to: {
        x: base.x - perpendicular.x * arrowHalfWidthMm,
        y: base.y - perpendicular.y * arrowHalfWidthMm,
      },
    },
  ];
}

function getResolvedGrainlineArrowSegments(
  draft: PatternDraft,
  points: Map<string, PatternDraft['points'][number]>,
  line: PatternDraft['lines'][number],
  from: PdfPoint,
  to: PdfPoint,
) {
  const candidateFractions = {
    top: [0.25, 0.19, 0.31, 0.14, 0.36, 0.09, 0.41],
    bottom: [0.75, 0.81, 0.69, 0.86, 0.64, 0.91, 0.59],
  };
  const visibleSegments = getVisibleLineSegments(draft, points, line.id);

  const resolveArrow = (fractions: number[], pointsTowardStart: boolean) => {
    for (const fraction of fractions) {
      const arrowSegments = buildGrainlineArrowSegmentsAtFraction(
        from,
        to,
        fraction,
        pointsTowardStart,
      );

      if (
        !arrowSegments.some((arrowSegment) =>
          visibleSegments.some((segment) =>
            segmentsIntersect(arrowSegment, segment),
          ),
        )
      ) {
        return { fraction, segments: arrowSegments };
      }
    }

    return {
      fraction: fractions[0],
      segments: buildGrainlineArrowSegmentsAtFraction(
        from,
        to,
        fractions[0],
        pointsTowardStart,
      ),
    };
  };

  const topArrow = resolveArrow(candidateFractions.top, true);
  const bottomArrow = resolveArrow(candidateFractions.bottom, false);

  return {
    visibleLine: {
      from: getPointAtFraction(from, to, topArrow.fraction),
      to: getPointAtFraction(from, to, bottomArrow.fraction),
    },
    arrowSegments: [...topArrow.segments, ...bottomArrow.segments],
  };
}

function getVisibleDraftBoundsForFoldPlacement(
  draft: PatternDraft,
  points: Map<string, PatternDraft['points'][number]>,
) {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (const line of draft.lines) {
    if (line.kind === 'hidden') {
      continue;
    }

    const from = points.get(line.from);
    const to = points.get(line.to);

    if (!from || !to) {
      continue;
    }

    expandBounds(bounds, from.x, from.y);
    expandBounds(bounds, to.x, to.y);

    if (line.kind === 'grainline') {
      const resolvedGrainline = getResolvedGrainlineArrowSegments(
        draft,
        points,
        line,
        from,
        to,
      );
      expandBounds(
        bounds,
        resolvedGrainline.visibleLine.from.x,
        resolvedGrainline.visibleLine.from.y,
      );
      expandBounds(
        bounds,
        resolvedGrainline.visibleLine.to.x,
        resolvedGrainline.visibleLine.to.y,
      );
      for (const arrowSegment of resolvedGrainline.arrowSegments) {
        expandBounds(bounds, arrowSegment.from.x, arrowSegment.from.y);
        expandBounds(bounds, arrowSegment.to.x, arrowSegment.to.y);
      }
    }
  }

  for (const path of draft.paths) {
    if (path.kind === 'hidden') {
      continue;
    }

    for (const command of parsePathData(path.d)) {
      if (command.type === 'M' || command.type === 'L') {
        expandBounds(bounds, command.x, command.y);
        continue;
      }

      if (command.type === 'Q') {
        expandBounds(bounds, command.x1, command.y1);
        expandBounds(bounds, command.x, command.y);
        continue;
      }

      if (command.type === 'C') {
        expandBounds(bounds, command.x1, command.y1);
        expandBounds(bounds, command.x2, command.y2);
        expandBounds(bounds, command.x, command.y);
      }
    }
  }

  for (const label of draft.labels) {
    const style = getLabelStyle(label.id);
    const widthMm = estimateTextWidthMm(label.text, style.fontSizePt);
    const heightMm = style.fontSizePt / MM_TO_PT;

    if (label.rotate === 90) {
      expandBounds(bounds, label.x - heightMm / 2, label.y - widthMm / 2);
      expandBounds(bounds, label.x + heightMm / 2, label.y + widthMm / 2);
      continue;
    }

    expandBounds(bounds, label.x - widthMm / 2, label.y - heightMm / 2);
    expandBounds(bounds, label.x + widthMm / 2, label.y + heightMm / 2);
  }

  for (const marker of draft.markers ?? []) {
    const point = points.get(marker.pointId);

    if (!point) {
      continue;
    }

    expandBounds(bounds, point.x - marker.radius, point.y - marker.radius);
    expandBounds(bounds, point.x + marker.radius, point.y + marker.radius);
  }

  if (!Number.isFinite(bounds.minX)) {
    return { minX: 0, minY: 0, maxX: draft.width, maxY: draft.height };
  }

  return bounds;
}

function getResolvedFoldAnnotation(
  draft: PatternDraft,
  points: Map<string, PatternDraft['points'][number]>,
  line: PatternDraft['lines'][number],
  from: PdfPoint,
  to: PdfPoint,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / length, y: dy / length };
  const basePerpendicular = { x: -unit.y, y: unit.x };
  const bounds = getVisibleDraftBoundsForFoldPlacement(draft, points);
  const boundsCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const lineMidpoint = getPointAtFraction(from, to, 0.5);
  const positiveCandidate = {
    x: lineMidpoint.x + basePerpendicular.x * 20,
    y: lineMidpoint.y + basePerpendicular.y * 20,
  };
  const negativeCandidate = {
    x: lineMidpoint.x - basePerpendicular.x * 20,
    y: lineMidpoint.y - basePerpendicular.y * 20,
  };
  const perpendicular =
    Math.hypot(
      positiveCandidate.x - boundsCenter.x,
      positiveCandidate.y - boundsCenter.y,
    ) <
    Math.hypot(
      negativeCandidate.x - boundsCenter.x,
      negativeCandidate.y - boundsCenter.y,
    )
      ? basePerpendicular
      : { x: -basePerpendicular.x, y: -basePerpendicular.y };
  const sideOffset = 20;
  const textOffset = 20;
  const topAnchor = getPointAtFraction(from, to, 0.18);
  const bottomAnchor = getPointAtFraction(from, to, 0.82);
  const topBracket = {
    x: topAnchor.x + perpendicular.x * sideOffset,
    y: topAnchor.y + perpendicular.y * sideOffset,
  };
  const bottomBracket = {
    x: bottomAnchor.x + perpendicular.x * sideOffset,
    y: bottomAnchor.y + perpendicular.y * sideOffset,
  };

  return {
    bracketSegments: [
      { from: topBracket, to: bottomBracket },
      { from: topBracket, to: topAnchor },
      { from: bottomBracket, to: bottomAnchor },
    ],
    arrowSegments: [
      ...buildGrainlineArrowSegmentsAtFraction(
        topBracket,
        topAnchor,
        1,
        false,
        3.5,
        1.5,
      ),
      ...buildGrainlineArrowSegmentsAtFraction(
        bottomBracket,
        bottomAnchor,
        1,
        false,
        3.5,
        1.5,
      ),
    ],
    label: {
      x: lineMidpoint.x + perpendicular.x * textOffset,
      y: lineMidpoint.y + perpendicular.y * textOffset,
      rotate: perpendicular.x < 0 ? 90 : -90,
      text: line.label ?? 'Cut On Fold',
    },
  };
}

function getLabelStyle(labelId: string): PrintLabelStyle {
  if (labelId === 'pageTitle') {
    return { fontSizePt: 12, fontName: 'F2' };
  }

  if (labelId === 'pageMeta') {
    return { fontSizePt: 8.5, fontName: 'F1' };
  }

  if (labelId === 'pageNumber') {
    return { fontSizePt: 9, fontName: 'F2' };
  }

  if (labelId === 'testSquareLabel') {
    return { fontSizePt: 10, fontName: 'F2' };
  }

  if (labelId === 'firstPageInstructionsTitle') {
    return { fontSizePt: 11, fontName: 'F2' };
  }

  if (labelId === 'firstPageInstructionsItem') {
    return { fontSizePt: 9, fontName: 'F1' };
  }

  if (labelId === 'foldInstructionLabel') {
    return { fontSizePt: 24, fontName: 'F2' };
  }

  if (labelId.endsWith('VimLabel')) {
    return { fontSizePt: 6.5, fontName: 'F2' };
  }

  return { fontSizePt: 24, fontName: 'F1' };
}

function getFoldAnnotationStyle(): FoldAnnotationStyle {
  return {
    strokeWidthMm: 0.25,
  };
}

function estimateTextWidthMm(text: string, fontSizePt: number) {
  const averageGlyphWidthPt = fontSizePt * 0.52;
  return (averageGlyphWidthPt * text.length) / MM_TO_PT;
}

function wrapTextToWidth(text: string, widthMm: number, fontSizePt: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [''];
  }

  const lines: string[] = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const nextLine = `${currentLine} ${words[index]}`;

    if (estimateTextWidthMm(nextLine, fontSizePt) <= widthMm) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = words[index];
  }

  lines.push(currentLine);

  return lines;
}

function getWrappedInstructionLines(
  instructions?: ResolvedFirstPageInstructions,
) {
  if (!instructions || instructions.items.length === 0) {
    return [];
  }

  const itemStyle = getLabelStyle('firstPageInstructionsItem');

  return instructions.items.flatMap((item) => {
    const wrappedLines = wrapTextToWidth(
      item,
      instructions.widthMm - 6,
      itemStyle.fontSizePt,
    );

    return wrappedLines.map((line, lineIndex) =>
      lineIndex === 0 ? `- ${line}` : `  ${line}`,
    );
  });
}

function getFirstPageReservedHeightMm({
  calibrationSquareTopMm,
  calibrationSquareMm,
  instructions,
  explicitReservedHeightMm,
}: {
  calibrationSquareTopMm: number;
  calibrationSquareMm: number;
  instructions?: ResolvedFirstPageInstructions;
  explicitReservedHeightMm?: number;
}) {
  const calibrationBottom =
    calibrationSquareTopMm +
    calibrationSquareMm +
    CALIBRATION_LABEL_GAP_MM +
    10;
  let reservedHeight = calibrationBottom;

  if (instructions) {
    const wrappedLines = getWrappedInstructionLines(instructions);
    const titleHeight = instructions.title ? 7 : 0;
    const instructionsBottom =
      instructions.topMm +
      titleHeight +
      wrappedLines.length * instructions.lineHeightMm +
      4;

    reservedHeight = Math.max(reservedHeight, instructionsBottom);
  }

  return Math.max(reservedHeight, explicitReservedHeightMm ?? 0);
}

function expandBounds(bounds: Bounds, x: number, y: number) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .replaceAll(/[^a-z0-9]+/gi, '-')
    .replaceAll(/^-+|-+$/g, '')
    .toLowerCase();
}

function topMmToPdfY(yMm: number) {
  return mmToPt(A4_HEIGHT_MM - yMm);
}

function rectBottomMmToPdfY(topY: number, height: number) {
  return mmToPt(A4_HEIGHT_MM - topY - height);
}

function convertQuadraticToCubic(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
) {
  return {
    x1: start.x + (2 / 3) * (control.x - start.x),
    y1: start.y + (2 / 3) * (control.y - start.y),
    x2: end.x + (2 / 3) * (control.x - end.x),
    y2: end.y + (2 / 3) * (control.y - end.y),
    x: end.x,
    y: end.y,
  };
}

function tokenizePathData(pathData: string) {
  return Array.from(
    pathData.matchAll(/[MLCQZHVAmlcqzhva]|-?\d*\.?\d+(?:e[-+]?\d+)?/g),
    (match) => match[0],
  );
}

function parsePathData(pathData: string): PdfPathCommand[] {
  const tokens = tokenizePathData(pathData);
  const commands: PdfPathCommand[] = [];
  let index = 0;
  let command = '';

  while (index < tokens.length) {
    const token = tokens[index];

    if (/^[A-Za-z]$/.test(token)) {
      command = token;
      index += 1;
    }

    if (command === 'M') {
      const x = Number(tokens[index]);
      const y = Number(tokens[index + 1]);
      commands.push({ type: 'M', x, y });
      index += 2;
      command = 'L';
      continue;
    }

    if (command === 'L') {
      const x = Number(tokens[index]);
      const y = Number(tokens[index + 1]);
      commands.push({ type: 'L', x, y });
      index += 2;
      continue;
    }

    if (command === 'Q') {
      const x1 = Number(tokens[index]);
      const y1 = Number(tokens[index + 1]);
      const x = Number(tokens[index + 2]);
      const y = Number(tokens[index + 3]);
      commands.push({ type: 'Q', x1, y1, x, y });
      index += 4;
      continue;
    }

    if (command === 'C') {
      const x1 = Number(tokens[index]);
      const y1 = Number(tokens[index + 1]);
      const x2 = Number(tokens[index + 2]);
      const y2 = Number(tokens[index + 3]);
      const x = Number(tokens[index + 4]);
      const y = Number(tokens[index + 5]);
      commands.push({ type: 'C', x1, y1, x2, y2, x, y });
      index += 6;
      continue;
    }

    if (command === 'Z') {
      commands.push({ type: 'Z' });
      command = '';
      continue;
    }

    throw new Error(`Unsupported SVG path command "${command}" in PDF export.`);
  }

  return commands;
}

function getDraftContentBounds(draft: PatternDraft) {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
  const points = new Map(draft.points.map((point) => [point.id, point]));

  for (const line of draft.lines) {
    if (line.kind === 'hidden') {
      continue;
    }

    const from = points.get(line.from);
    const to = points.get(line.to);

    if (!from || !to) {
      continue;
    }

    expandBounds(bounds, from.x, from.y);
    expandBounds(bounds, to.x, to.y);

    if (line.kind === 'grainline') {
      const resolvedGrainline = getResolvedGrainlineArrowSegments(
        draft,
        points,
        line,
        from,
        to,
      );
      expandBounds(
        bounds,
        resolvedGrainline.visibleLine.from.x,
        resolvedGrainline.visibleLine.from.y,
      );
      expandBounds(
        bounds,
        resolvedGrainline.visibleLine.to.x,
        resolvedGrainline.visibleLine.to.y,
      );
      for (const arrowSegment of resolvedGrainline.arrowSegments) {
        expandBounds(bounds, arrowSegment.from.x, arrowSegment.from.y);
        expandBounds(bounds, arrowSegment.to.x, arrowSegment.to.y);
      }
    }

    if (line.kind === 'fold') {
      const foldAnnotation = getResolvedFoldAnnotation(
        draft,
        points,
        line,
        from,
        to,
      );
      for (const segment of [
        ...foldAnnotation.bracketSegments,
        ...foldAnnotation.arrowSegments,
      ]) {
        expandBounds(bounds, segment.from.x, segment.from.y);
        expandBounds(bounds, segment.to.x, segment.to.y);
      }

      const widthMm = estimateTextWidthMm(
        foldAnnotation.label.text,
        getLabelStyle('foldInstructionLabel').fontSizePt,
      );
      const heightMm =
        getLabelStyle('foldInstructionLabel').fontSizePt / MM_TO_PT;
      expandBounds(
        bounds,
        foldAnnotation.label.x - heightMm / 2,
        foldAnnotation.label.y - widthMm / 2,
      );
      expandBounds(
        bounds,
        foldAnnotation.label.x + heightMm / 2,
        foldAnnotation.label.y + widthMm / 2,
      );
    }
  }

  for (const path of draft.paths) {
    if (path.kind === 'hidden') {
      continue;
    }

    for (const command of parsePathData(path.d)) {
      if (command.type === 'M' || command.type === 'L') {
        expandBounds(bounds, command.x, command.y);
        continue;
      }

      if (command.type === 'Q') {
        expandBounds(bounds, command.x1, command.y1);
        expandBounds(bounds, command.x, command.y);
        continue;
      }

      if (command.type === 'C') {
        expandBounds(bounds, command.x1, command.y1);
        expandBounds(bounds, command.x2, command.y2);
        expandBounds(bounds, command.x, command.y);
      }
    }
  }

  for (const label of draft.labels) {
    const style = getLabelStyle(label.id);
    const widthMm = estimateTextWidthMm(label.text, style.fontSizePt);
    const heightMm = style.fontSizePt / MM_TO_PT;

    if (label.rotate === 90) {
      expandBounds(bounds, label.x - heightMm / 2, label.y - widthMm / 2);
      expandBounds(bounds, label.x + heightMm / 2, label.y + widthMm / 2);
      continue;
    }

    expandBounds(bounds, label.x - widthMm / 2, label.y - heightMm / 2);
    expandBounds(bounds, label.x + widthMm / 2, label.y + heightMm / 2);
  }

  for (const marker of draft.markers ?? []) {
    const point = points.get(marker.pointId);

    if (!point) {
      continue;
    }

    expandBounds(bounds, point.x - marker.radius, point.y - marker.radius);
    expandBounds(bounds, point.x + marker.radius, point.y + marker.radius);
  }

  if (!Number.isFinite(bounds.minX)) {
    return { minX: 0, minY: 0, maxX: draft.width, maxY: draft.height };
  }

  return bounds;
}

function lineCommand(
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  return [
    `${formatNumber(mmToPt(from.x))} ${formatNumber(topMmToPdfY(from.y))} m`,
    `${formatNumber(mmToPt(to.x))} ${formatNumber(topMmToPdfY(to.y))} l`,
    'S',
  ].join('\n');
}

function pathCommand(pathData: string, offsetX: number, offsetY: number) {
  const commands = parsePathData(pathData);
  const parts: string[] = [];
  let currentPoint = { x: 0, y: 0 };
  let subpathStart = { x: 0, y: 0 };

  for (const command of commands) {
    if (command.type === 'M') {
      currentPoint = { x: command.x + offsetX, y: command.y + offsetY };
      subpathStart = currentPoint;
      parts.push(
        `${formatNumber(mmToPt(currentPoint.x))} ${formatNumber(topMmToPdfY(currentPoint.y))} m`,
      );
      continue;
    }

    if (command.type === 'L') {
      currentPoint = { x: command.x + offsetX, y: command.y + offsetY };
      parts.push(
        `${formatNumber(mmToPt(currentPoint.x))} ${formatNumber(topMmToPdfY(currentPoint.y))} l`,
      );
      continue;
    }

    if (command.type === 'Q') {
      const cubic = convertQuadraticToCubic(
        currentPoint,
        { x: command.x1 + offsetX, y: command.y1 + offsetY },
        { x: command.x + offsetX, y: command.y + offsetY },
      );
      currentPoint = { x: cubic.x, y: cubic.y };
      parts.push(
        [
          `${formatNumber(mmToPt(cubic.x1))} ${formatNumber(topMmToPdfY(cubic.y1))}`,
          `${formatNumber(mmToPt(cubic.x2))} ${formatNumber(topMmToPdfY(cubic.y2))}`,
          `${formatNumber(mmToPt(cubic.x))} ${formatNumber(topMmToPdfY(cubic.y))} c`,
        ].join(' '),
      );
      continue;
    }

    if (command.type === 'C') {
      currentPoint = { x: command.x + offsetX, y: command.y + offsetY };
      parts.push(
        [
          `${formatNumber(mmToPt(command.x1 + offsetX))} ${formatNumber(topMmToPdfY(command.y1 + offsetY))}`,
          `${formatNumber(mmToPt(command.x2 + offsetX))} ${formatNumber(topMmToPdfY(command.y2 + offsetY))}`,
          `${formatNumber(mmToPt(currentPoint.x))} ${formatNumber(topMmToPdfY(currentPoint.y))} c`,
        ].join(' '),
      );
      continue;
    }

    currentPoint = subpathStart;
    parts.push('h');
  }

  parts.push('S');

  return parts.join('\n');
}

function textCommand({
  text,
  x,
  y,
  rotate,
  style,
  align = 'left',
}: {
  text: string;
  x: number;
  y: number;
  rotate?: number;
  style: PrintLabelStyle;
  align?: 'left' | 'center';
}) {
  const escapedText = escapePdfText(text);
  const textWidthMm = estimateTextWidthMm(text, style.fontSizePt);
  const alignedX = align === 'center' ? x - textWidthMm / 2 : x;
  const centeredY = y + style.fontSizePt / MM_TO_PT / 3;
  const pdfX = mmToPt(alignedX);
  const pdfY = topMmToPdfY(centeredY);
  const textHeightMm = style.fontSizePt / MM_TO_PT;

  if (rotate === 90) {
    const centeredPdfY =
      align === 'center' ? topMmToPdfY(centeredY + textWidthMm / 2) : pdfY;
    const centeredPdfX =
      align === 'center' ? mmToPt(x + textHeightMm / 2 + 8) : pdfX;

    return [
      'BT',
      `/${style.fontName} ${formatNumber(style.fontSizePt)} Tf`,
      '0 g',
      `0 1 -1 0 ${formatNumber(centeredPdfX)} ${formatNumber(centeredPdfY)} Tm`,
      `(${escapedText}) Tj`,
      'ET',
    ].join('\n');
  }

  if (rotate === -90) {
    const centeredPdfY =
      align === 'center' ? topMmToPdfY(centeredY - textWidthMm / 2) : pdfY;
    const centeredPdfX =
      align === 'center' ? mmToPt(x - textHeightMm / 2 - 8) : pdfX;

    return [
      'BT',
      `/${style.fontName} ${formatNumber(style.fontSizePt)} Tf`,
      '0 g',
      `0 -1 1 0 ${formatNumber(centeredPdfX)} ${formatNumber(centeredPdfY)} Tm`,
      `(${escapedText}) Tj`,
      'ET',
    ].join('\n');
  }

  return [
    'BT',
    `/${style.fontName} ${formatNumber(style.fontSizePt)} Tf`,
    '0 g',
    `1 0 0 1 ${formatNumber(pdfX)} ${formatNumber(pdfY)} Tm`,
    `(${escapedText}) Tj`,
    'ET',
  ].join('\n');
}

function drawRectOutline(x: number, y: number, width: number, height: number) {
  return `${formatNumber(mmToPt(x))} ${formatNumber(rectBottomMmToPdfY(y, height))} ${formatNumber(mmToPt(width))} ${formatNumber(mmToPt(height))} re S`;
}

function drawAlignmentMarks(
  innerX: number,
  innerY: number,
  innerWidth: number,
  innerHeight: number,
) {
  const tickLength = 5;
  const centerX = innerX + innerWidth / 2;
  const centerY = innerY + innerHeight / 2;

  const marks = [
    lineCommand(
      { x: centerX, y: innerY - tickLength },
      { x: centerX, y: innerY },
    ),
    lineCommand(
      { x: centerX, y: innerY + innerHeight },
      { x: centerX, y: innerY + innerHeight + tickLength },
    ),
    lineCommand(
      { x: innerX - tickLength, y: centerY },
      { x: innerX, y: centerY },
    ),
    lineCommand(
      { x: innerX + innerWidth, y: centerY },
      { x: innerX + innerWidth + tickLength, y: centerY },
    ),
    lineCommand(
      { x: innerX - tickLength, y: innerY - tickLength },
      { x: innerX, y: innerY },
    ),
    lineCommand(
      { x: innerX + innerWidth + tickLength, y: innerY - tickLength },
      { x: innerX + innerWidth, y: innerY },
    ),
    lineCommand(
      { x: innerX - tickLength, y: innerY + innerHeight + tickLength },
      { x: innerX, y: innerY + innerHeight },
    ),
    lineCommand(
      {
        x: innerX + innerWidth + tickLength,
        y: innerY + innerHeight + tickLength,
      },
      { x: innerX + innerWidth, y: innerY + innerHeight },
    ),
  ];

  return marks.join('\n');
}

function createPdfDocument(objects: PdfObject[]) {
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets[object.id] = pdf.length;
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let id = 1; id <= objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function encodePdfBytes(content: string) {
  const bytes = new Uint8Array(content.length);

  for (let index = 0; index < content.length; index += 1) {
    bytes[index] = content.charCodeAt(index) & 0xff;
  }

  return bytes;
}

type PatternPdfPage = {
  tileOriginX: number;
  tileOriginY: number;
};

function areasIntersect(left: TilingArea, right: TilingArea) {
  return (
    left.minX < right.maxX &&
    left.maxX > right.minX &&
    left.minY < right.maxY &&
    left.maxY > right.minY
  );
}

function getTiledPages({
  contentArea,
  firstPageExtraArea,
  pageWidth,
  pageHeight,
  pageOverlap,
}: {
  contentArea: TilingArea;
  firstPageExtraArea?: TilingArea;
  pageWidth: number;
  pageHeight: number;
  pageOverlap: number;
}) {
  const tileStepX = pageWidth - pageOverlap;
  const tileStepY = pageHeight - pageOverlap;
  const tilingWidth = Math.max(contentArea.maxX, firstPageExtraArea?.maxX ?? 0);
  const tilingHeight = Math.max(
    contentArea.maxY,
    firstPageExtraArea?.maxY ?? 0,
  );
  const columnCount = getTileCount(tilingWidth, pageWidth, pageOverlap);
  const rowCount = getTileCount(tilingHeight, pageHeight, pageOverlap);
  const pages: PatternPdfPage[] = [];

  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const tileOriginX = column * tileStepX;
      const tileOriginY = row * tileStepY;
      const tileArea = {
        minX: tileOriginX,
        minY: tileOriginY,
        maxX: tileOriginX + pageWidth,
        maxY: tileOriginY + pageHeight,
      };
      const intersectsPattern = areasIntersect(tileArea, contentArea);
      const intersectsFirstPageExtra =
        row === 0 &&
        column === 0 &&
        firstPageExtraArea !== undefined &&
        areasIntersect(tileArea, firstPageExtraArea);

      if (!intersectsPattern && !intersectsFirstPageExtra) {
        continue;
      }

      pages.push({ tileOriginX, tileOriginY });
    }
  }

  return {
    pages,
    columnCount,
    rowCount,
  };
}

export function downloadPatternPdf({
  draft,
  profileName,
  patternLabel,
  printConfig,
}: {
  draft: PatternDraft;
  profileName: string;
  patternLabel: string;
  printConfig?: PatternPrintConfig;
}) {
  if (draft.units !== 'mm') {
    throw new Error('Only millimeter drafts are supported for PDF export.');
  }

  const printableDraft = composeDraftForPdf(draft);

  const resolvedPrintConfig = resolvePrintConfig(printConfig);

  if (!resolvedPrintConfig.enabled) {
    throw new Error('PDF export is not enabled for this pattern.');
  }

  const innerX = resolvedPrintConfig.pageMarginMm;
  const innerY = resolvedPrintConfig.pageMarginMm;
  const innerWidth = A4_WIDTH_MM - resolvedPrintConfig.pageMarginMm * 2;
  const innerHeight = A4_HEIGHT_MM - resolvedPrintConfig.pageMarginMm * 2;
  const contentBounds = getDraftContentBounds(printableDraft);
  const contentWidth = contentBounds.maxX - contentBounds.minX;
  const contentHeight = contentBounds.maxY - contentBounds.minY;
  const patternOffsetX = resolvedPrintConfig.patternPaddingXMm;
  const wrappedInstructionLines = getWrappedInstructionLines(
    resolvedPrintConfig.firstPageInstructions,
  );
  const patternOffsetY = getFirstPageReservedHeightMm({
    calibrationSquareTopMm: resolvedPrintConfig.calibrationSquareTopMm,
    calibrationSquareMm: resolvedPrintConfig.calibrationSquareMm,
    instructions: resolvedPrintConfig.firstPageInstructions,
    explicitReservedHeightMm: resolvedPrintConfig.firstPageTopReservedMm,
  });
  const tiledPages = getTiledPages({
    contentArea: {
      minX: patternOffsetX,
      minY: patternOffsetY,
      maxX: patternOffsetX + contentWidth,
      maxY:
        patternOffsetY +
        contentHeight +
        resolvedPrintConfig.patternPaddingBottomMm,
    },
    firstPageExtraArea: {
      minX: 0,
      minY: 0,
      maxX: innerWidth,
      maxY: patternOffsetY,
    },
    pageWidth: innerWidth,
    pageHeight: innerHeight,
    pageOverlap: resolvedPrintConfig.pageOverlapMm,
  });
  const pageCount = tiledPages.pages.length;

  const points = new Map(
    printableDraft.points.map((point) => [point.id, point]),
  );
  const objects: PdfObject[] = [];
  let nextObjectId = 1;

  const catalogId = nextObjectId++;
  const pagesId = nextObjectId++;
  const fontRegularId = nextObjectId++;
  const fontBoldId = nextObjectId++;
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    pageObjectIds.push(nextObjectId++);
    contentObjectIds.push(nextObjectId++);
  }

  objects.push({
    id: catalogId,
    body: `<< /Type /Catalog /Pages ${pagesId} 0 R >>`,
  });

  objects.push({
    id: pagesId,
    body: `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`,
  });

  objects.push({
    id: fontRegularId,
    body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  });

  objects.push({
    id: fontBoldId,
    body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  });

  const pageTitle = `${patternLabel} - ${profileName}`;
  const pageMeta =
    `${tiledPages.columnCount} columns x ${tiledPages.rowCount} rows` +
    ` (${pageCount} A4 pages total) at 100%`;

  for (let pageIndex = 0; pageIndex < tiledPages.pages.length; pageIndex += 1) {
    const page = tiledPages.pages[pageIndex];
    const pageId = pageObjectIds[pageIndex];
    const contentId = contentObjectIds[pageIndex];
    const draftOffsetX =
      innerX + patternOffsetX - page.tileOriginX - contentBounds.minX;
    const draftOffsetY =
      innerY + patternOffsetY - page.tileOriginY - contentBounds.minY;
    const streamParts: string[] = [];

    streamParts.push('q');
    streamParts.push('1 J');
    streamParts.push('1 j');
    streamParts.push(`${formatNumber(mmToPt(0.1))} w`);
    streamParts.push('0 G');
    streamParts.push(drawRectOutline(innerX, innerY, innerWidth, innerHeight));
    streamParts.push(
      drawAlignmentMarks(innerX, innerY, innerWidth, innerHeight),
    );

    streamParts.push(
      textCommand({
        text: pageTitle,
        x: innerX + 4,
        y: innerY - 2.2,
        style: getLabelStyle('pageTitle'),
      }),
    );
    streamParts.push(
      textCommand({
        text: pageMeta,
        x: innerX + 4,
        y: A4_HEIGHT_MM - 4.5,
        style: getLabelStyle('pageMeta'),
      }),
    );
    streamParts.push(
      textCommand({
        text: `${pageIndex + 1} / ${pageCount}`,
        x: A4_WIDTH_MM - 28,
        y: A4_HEIGHT_MM - 4.5,
        style: getLabelStyle('pageNumber'),
      }),
    );

    streamParts.push('q');
    streamParts.push(
      `${formatNumber(mmToPt(innerX))} ${formatNumber(rectBottomMmToPdfY(innerY, innerHeight))} ${formatNumber(mmToPt(innerWidth))} ${formatNumber(mmToPt(innerHeight))} re W n`,
    );

    if (pageIndex === 0) {
      streamParts.push('0 G');
      streamParts.push(`${formatNumber(mmToPt(0.45))} w`);
      streamParts.push(
        drawRectOutline(
          resolvedPrintConfig.calibrationSquareLeftMm,
          resolvedPrintConfig.calibrationSquareTopMm,
          resolvedPrintConfig.calibrationSquareMm,
          resolvedPrintConfig.calibrationSquareMm,
        ),
      );
      streamParts.push(
        textCommand({
          text: resolvedPrintConfig.calibrationLabel,
          x: resolvedPrintConfig.calibrationSquareLeftMm,
          y:
            resolvedPrintConfig.calibrationSquareTopMm +
            resolvedPrintConfig.calibrationSquareMm +
            6,
          style: getLabelStyle('testSquareLabel'),
        }),
      );

      if (resolvedPrintConfig.firstPageInstructions) {
        const instructions = resolvedPrintConfig.firstPageInstructions;

        if (instructions.title) {
          streamParts.push(
            textCommand({
              text: instructions.title,
              x: instructions.leftMm,
              y: instructions.topMm,
              style: getLabelStyle('firstPageInstructionsTitle'),
            }),
          );
        }

        const instructionsStartY =
          instructions.topMm + (instructions.title ? 7 : 0);

        for (
          let lineIndex = 0;
          lineIndex < wrappedInstructionLines.length;
          lineIndex += 1
        ) {
          streamParts.push(
            textCommand({
              text: wrappedInstructionLines[lineIndex],
              x: instructions.leftMm,
              y: instructionsStartY + lineIndex * instructions.lineHeightMm,
              style: getLabelStyle('firstPageInstructionsItem'),
            }),
          );
        }
      }
    }

    for (const line of printableDraft.lines) {
      if (line.kind === 'hidden') {
        continue;
      }

      const from = points.get(line.from);
      const to = points.get(line.to);

      if (!from || !to) {
        continue;
      }

      const style = getLineStyle(line.kind);
      streamParts.push('q');
      streamParts.push(`${formatNumber(mmToPt(style.strokeWidthMm))} w`);
      streamParts.push(
        `${style.strokeColor.map((value) => formatNumber(value)).join(' ')} RG`,
      );
      streamParts.push(
        style.dashPatternMm
          ? `[${style.dashPatternMm.map((value) => formatNumber(mmToPt(value))).join(' ')}] 0 d`
          : '[] 0 d',
      );
      streamParts.push(
        lineCommand(
          line.kind === 'grainline'
            ? getResolvedGrainlineArrowSegments(
                printableDraft,
                points,
                line,
                { x: from.x + draftOffsetX, y: from.y + draftOffsetY },
                { x: to.x + draftOffsetX, y: to.y + draftOffsetY },
              ).visibleLine.from
            : { x: from.x + draftOffsetX, y: from.y + draftOffsetY },
          line.kind === 'grainline'
            ? getResolvedGrainlineArrowSegments(
                printableDraft,
                points,
                line,
                { x: from.x + draftOffsetX, y: from.y + draftOffsetY },
                { x: to.x + draftOffsetX, y: to.y + draftOffsetY },
              ).visibleLine.to
            : { x: to.x + draftOffsetX, y: to.y + draftOffsetY },
        ),
      );
      if (line.kind === 'grainline') {
        for (const arrowSegment of getResolvedGrainlineArrowSegments(
          printableDraft,
          points,
          line,
          { x: from.x + draftOffsetX, y: from.y + draftOffsetY },
          { x: to.x + draftOffsetX, y: to.y + draftOffsetY },
        ).arrowSegments) {
          streamParts.push(lineCommand(arrowSegment.from, arrowSegment.to));
        }
      }
      if (line.kind === 'fold') {
        const foldAnnotation = getResolvedFoldAnnotation(
          printableDraft,
          points,
          line,
          { x: from.x, y: from.y },
          { x: to.x, y: to.y },
        );
        const foldAnnotationStyle = getFoldAnnotationStyle();
        const foldLabelStyle = getLabelStyle('foldInstructionLabel');

        streamParts.push('q');
        streamParts.push(
          `${formatNumber(mmToPt(foldAnnotationStyle.strokeWidthMm))} w`,
        );
        streamParts.push(
          `${style.strokeColor.map((value) => formatNumber(value)).join(' ')} RG`,
        );
        streamParts.push('[] 0 d');
        for (const segment of foldAnnotation.bracketSegments) {
          streamParts.push(
            lineCommand(
              {
                x: segment.from.x + draftOffsetX,
                y: segment.from.y + draftOffsetY,
              },
              {
                x: segment.to.x + draftOffsetX,
                y: segment.to.y + draftOffsetY,
              },
            ),
          );
        }
        for (const arrowSegment of foldAnnotation.arrowSegments) {
          streamParts.push(
            lineCommand(
              {
                x: arrowSegment.from.x + draftOffsetX,
                y: arrowSegment.from.y + draftOffsetY,
              },
              {
                x: arrowSegment.to.x + draftOffsetX,
                y: arrowSegment.to.y + draftOffsetY,
              },
            ),
          );
        }
        streamParts.push('Q');
        streamParts.push(
          textCommand({
            text: foldAnnotation.label.text,
            x: foldAnnotation.label.x + draftOffsetX,
            y: foldAnnotation.label.y + draftOffsetY,
            rotate: foldAnnotation.label.rotate,
            style: foldLabelStyle,
            align: 'center',
          }),
        );
      }
      streamParts.push('Q');
    }

    for (const path of printableDraft.paths) {
      if (path.kind === 'hidden') {
        continue;
      }

      const style = getLineStyle(path.kind);
      streamParts.push('q');
      streamParts.push(`${formatNumber(mmToPt(style.strokeWidthMm))} w`);
      streamParts.push(
        `${style.strokeColor.map((value) => formatNumber(value)).join(' ')} RG`,
      );
      streamParts.push(
        style.dashPatternMm
          ? `[${style.dashPatternMm.map((value) => formatNumber(mmToPt(value))).join(' ')}] 0 d`
          : '[] 0 d',
      );
      streamParts.push(pathCommand(path.d, draftOffsetX, draftOffsetY));
      streamParts.push('Q');
    }

    for (const label of printableDraft.labels) {
      streamParts.push(
        textCommand({
          text: label.text,
          x: label.x + draftOffsetX,
          y: label.y + draftOffsetY,
          rotate: label.rotate,
          style: getLabelStyle(label.id),
          align: 'center',
        }),
      );
    }

    streamParts.push('Q');
    streamParts.push('Q');

    const contentStream = streamParts.join('\n');

    objects.push({
      id: contentId,
      body: `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
    });

    objects.push({
      id: pageId,
      body: [
        '<<',
        '/Type /Page',
        `/Parent ${pagesId} 0 R`,
        `/MediaBox [0 0 ${formatNumber(mmToPt(A4_WIDTH_MM))} ${formatNumber(mmToPt(A4_HEIGHT_MM))}]`,
        `/Contents ${contentId} 0 R`,
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >>`,
        '>>',
      ].join('\n'),
    });
  }

  const pdf = createPdfDocument(
    objects.sort((left, right) => left.id - right.id),
  );
  const blob = new Blob([encodePdfBytes(pdf)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const patternPart = sanitizeFileNamePart(patternLabel) || 'pattern';
  const profilePart = sanitizeFileNamePart(profileName) || 'profile';

  link.href = url;
  link.download = `${patternPart}-${profilePart}-a4.pdf`;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
