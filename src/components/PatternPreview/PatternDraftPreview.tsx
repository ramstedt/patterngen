import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import type { PatternDraft } from '../../lib/patterns';

type PatternDraftPreviewProps = {
  draft: PatternDraft;
};

type PreviewPoint = { x: number; y: number };
type PreviewSegment = { from: PreviewPoint; to: PreviewPoint };

function expandBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  x: number,
  y: number,
) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function estimateLabelBounds(label: PatternDraft['labels'][number]) {
  const fontSize = label.id.endsWith('VimLabel') ? 8 : 16;
  const width = label.text.length * fontSize * 0.52;
  const height = fontSize;

  if (label.rotate === 90) {
    return {
      minX: label.x - height / 2,
      minY: label.y - width / 2,
      maxX: label.x + height / 2,
      maxY: label.y + width / 2,
    };
  }

  return {
    minX: label.x - width / 2,
    minY: label.y - height / 2,
    maxX: label.x + width / 2,
    maxY: label.y + height / 2,
  };
}

function getPointAtFraction(from: PreviewPoint, to: PreviewPoint, fraction: number) {
  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
  };
}

function orientation(a: PreviewPoint, b: PreviewPoint, c: PreviewPoint) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

  if (Math.abs(value) < 0.0001) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function onSegment(a: PreviewPoint, b: PreviewPoint, c: PreviewPoint) {
  return (
    b.x <= Math.max(a.x, c.x) + 0.0001 &&
    b.x >= Math.min(a.x, c.x) - 0.0001 &&
    b.y <= Math.max(a.y, c.y) + 0.0001 &&
    b.y >= Math.min(a.y, c.y) - 0.0001
  );
}

function segmentsIntersect(first: PreviewSegment, second: PreviewSegment) {
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
  const segments: PreviewSegment[] = [];

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
  from: PreviewPoint,
  to: PreviewPoint,
  fraction: number,
  pointsTowardStart: boolean,
  arrowLength = 10,
  arrowHalfWidth = 4,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / length, y: dy / length };
  const perpendicular = { x: -unit.y, y: unit.x };
  const tip = getPointAtFraction(from, to, fraction);
  const direction = pointsTowardStart ? -1 : 1;
  const base = {
    x: tip.x - unit.x * arrowLength * direction,
    y: tip.y - unit.y * arrowLength * direction,
  };

  return [
    {
      from: tip,
      to: {
        x: base.x + perpendicular.x * arrowHalfWidth,
        y: base.y + perpendicular.y * arrowHalfWidth,
      },
    },
    {
      from: tip,
      to: {
        x: base.x - perpendicular.x * arrowHalfWidth,
        y: base.y - perpendicular.y * arrowHalfWidth,
      },
    },
  ];
}

function getResolvedGrainlineArrowSegments(
  draft: PatternDraft,
  points: Map<string, PatternDraft['points'][number]>,
  line: PatternDraft['lines'][number],
  from: PreviewPoint,
  to: PreviewPoint,
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

function getVisibleDraftBounds(
  draft: PatternDraft,
  points: Map<string, PatternDraft['points'][number]>,
) {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (const line of draft.lines) {
    if (line.kind === 'hidden') continue;

    const from = points.get(line.from);
    const to = points.get(line.to);

    if (!from || !to) continue;

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
    if (path.kind === 'hidden') continue;

    const values = path.d.match(/-?\d+(?:\.\d+)?/g) ?? [];

    for (let index = 0; index + 1 < values.length; index += 2) {
      expandBounds(bounds, Number(values[index]), Number(values[index + 1]));
    }
  }

  for (const label of draft.labels) {
    const labelBounds = estimateLabelBounds(label);
    expandBounds(bounds, labelBounds.minX, labelBounds.minY);
    expandBounds(bounds, labelBounds.maxX, labelBounds.maxY);
  }

  for (const marker of draft.markers ?? []) {
    const point = points.get(marker.pointId);

    if (!point) continue;

    expandBounds(bounds, point.x - marker.radius, point.y - marker.radius);
    expandBounds(bounds, point.x + marker.radius, point.y + marker.radius);
  }

  if (!Number.isFinite(bounds.minX)) {
    return { minX: 0, minY: 0, maxX: draft.width, maxY: draft.height };
  }

  return bounds;
}

function getStrokeStyle(kind: PatternDraft['lines'][number]['kind']) {
  if (kind === 'construction') {
    return { stroke: '#757575', strokeWidth: 1, strokeDasharray: '4 4' };
  }

  if (kind === 'grainline') {
    return { stroke: '#757575', strokeWidth: 1, strokeDasharray: undefined };
  }

  if (kind === 'fold') {
    return { stroke: '#111111', strokeWidth: 1.4, strokeDasharray: undefined };
  }

  return { stroke: '#111111', strokeWidth: 1.4, strokeDasharray: undefined };
}

function getFoldArrowSegments(
  draft: PatternDraft,
  points: Map<string, PatternDraft['points'][number]>,
  line: PatternDraft['lines'][number],
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / length, y: dy / length };
  const basePerpendicular = { x: -unit.y, y: unit.x };
  const bounds = getVisibleDraftBounds(draft, points);
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
    Math.hypot(positiveCandidate.x - boundsCenter.x, positiveCandidate.y - boundsCenter.y) <
    Math.hypot(negativeCandidate.x - boundsCenter.x, negativeCandidate.y - boundsCenter.y)
      ? basePerpendicular
      : { x: -basePerpendicular.x, y: -basePerpendicular.y };
  const sideOffset = 20;
  const textOffset = 10;
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
      ...buildGrainlineArrowSegmentsAtFraction(topBracket, topAnchor, 1, false, 3.5, 1.5),
      ...buildGrainlineArrowSegmentsAtFraction(bottomBracket, bottomAnchor, 1, false, 3.5, 1.5),
    ],
    label: {
      x: lineMidpoint.x + perpendicular.x * textOffset,
      y: lineMidpoint.y + perpendicular.y * textOffset,
      rotate: 90,
      text: line.label ?? 'Cut On Fold',
    },
  };
}

function getLabelFontSize(labelId: string) {
  if (labelId.endsWith('VimLabel')) {
    return 8;
  }

  return 16;
}

function createPreviewFrame(draft: PatternDraft) {
  const previewPadding = 24;
  const bounds = getVisibleDraftBounds(
    draft,
    new Map(draft.points.map((point) => [point.id, point])),
  );
  const width = bounds.maxX - bounds.minX + previewPadding * 2;
  const height = bounds.maxY - bounds.minY + previewPadding * 2;

  return {
    width,
    height,
    viewBox: [
      bounds.minX - previewPadding,
      bounds.minY - previewPadding,
      width,
      height,
    ].join(' '),
  };
}

function renderDraftSvg(draft: PatternDraft, viewBox: string) {
  const points = new Map(draft.points.map((point) => [point.id, point]));
  return (
    <svg
      viewBox={viewBox}
      role='img'
      aria-label='Pattern draft preview'
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        height: 'auto',
        maxHeight: '420px',
        margin: '0 auto',
      }}
    >
      <g opacity={draft.baseOpacity ?? 1}>
        {draft.lines.map((line) => {
          if (line.kind === 'hidden') return null;

          const from = points.get(line.from);
          const to = points.get(line.to);

          if (!from || !to) return null;

          const style = getStrokeStyle(line.kind);
          const foldAnnotation =
            line.kind === 'fold'
              ? getFoldArrowSegments(draft, points, line, from, to)
              : null;

          return (
            <g key={line.id}>
              <line
                x1={
                  line.kind === 'grainline'
                    ? getResolvedGrainlineArrowSegments(draft, points, line, from, to)
                        .visibleLine.from.x
                    : from.x
                }
                y1={
                  line.kind === 'grainline'
                    ? getResolvedGrainlineArrowSegments(draft, points, line, from, to)
                        .visibleLine.from.y
                    : from.y
                }
                x2={
                  line.kind === 'grainline'
                    ? getResolvedGrainlineArrowSegments(draft, points, line, from, to)
                        .visibleLine.to.x
                    : to.x
                }
                y2={
                  line.kind === 'grainline'
                    ? getResolvedGrainlineArrowSegments(draft, points, line, from, to)
                        .visibleLine.to.y
                    : to.y
                }
                strokeLinecap='round'
                vectorEffect='non-scaling-stroke'
                {...style}
              />
              {line.kind === 'grainline'
                ? getResolvedGrainlineArrowSegments(draft, points, line, from, to)
                    .arrowSegments.map((arrowSegment, index) => (
                    <line
                      key={`${line.id}-arrow-${index}`}
                      x1={arrowSegment.from.x}
                      y1={arrowSegment.from.y}
                      x2={arrowSegment.to.x}
                      y2={arrowSegment.to.y}
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                      strokeLinecap='round'
                      vectorEffect='non-scaling-stroke'
                    />
                  ))
                : null}
              {foldAnnotation
                ? foldAnnotation.bracketSegments.map((segment, index) => (
                    <line
                      key={`${line.id}-fold-bracket-${index}`}
                      x1={segment.from.x}
                      y1={segment.from.y}
                      x2={segment.to.x}
                      y2={segment.to.y}
                      stroke={style.stroke}
                      strokeWidth={1}
                      strokeLinecap='round'
                      vectorEffect='non-scaling-stroke'
                    />
                  ))
                : null}
              {foldAnnotation
                ? foldAnnotation.arrowSegments.map((arrowSegment, index) => (
                    <line
                      key={`${line.id}-fold-arrow-${index}`}
                      x1={arrowSegment.from.x}
                      y1={arrowSegment.from.y}
                      x2={arrowSegment.to.x}
                      y2={arrowSegment.to.y}
                      stroke={style.stroke}
                      strokeWidth={1}
                      strokeLinecap='round'
                      vectorEffect='non-scaling-stroke'
                    />
                  ))
                : null}
              {foldAnnotation ? (
                <text
                  x={foldAnnotation.label.x}
                  y={foldAnnotation.label.y}
                  transform={`rotate(${foldAnnotation.label.rotate} ${foldAnnotation.label.x} ${foldAnnotation.label.y})`}
                  fill='#1C1C1C'
                  fontSize={13}
                  fontWeight={600}
                  textAnchor='middle'
                  dominantBaseline='middle'
                >
                  {foldAnnotation.label.text}
                </text>
              ) : null}
            </g>
          );
        })}

        {draft.paths.map((path) => {
          if (path.kind === 'hidden') return null;

          const style = getStrokeStyle(path.kind);

          return (
            <path
              key={path.id}
              d={path.d}
              fill='none'
              strokeLinecap='round'
              vectorEffect='non-scaling-stroke'
              {...style}
            />
          );
        })}

        {draft.labels.map((label) => (
          <text
            key={label.id}
            x={label.x}
            y={label.y}
            transform={
              label.rotate
                ? `rotate(${label.rotate} ${label.x} ${label.y})`
                : undefined
            }
            fill='#1C1C1C'
            fontSize={getLabelFontSize(label.id)}
            textAnchor='middle'
            dominantBaseline='middle'
          >
            {label.text}
          </text>
        ))}

        {(draft.markers ?? []).map((marker) => {
          const point = points.get(marker.pointId);

          if (!point) return null;

          return (
            <circle
              key={marker.id}
              cx={point.x}
              cy={point.y}
              r={marker.radius}
              fill={marker.fill}
              vectorEffect='non-scaling-stroke'
            />
          );
        })}
      </g>
    </svg>
  );
}

export function PatternDraftPreview({ draft }: PatternDraftPreviewProps) {
  const previewFrame = createPreviewFrame(draft);

  return (
    <Box
      sx={{
        mt: { xs: 2, sm: 3 },
      }}
    >
      <Box
        sx={{
          overflowX: { xs: 'hidden', sm: 'auto' },
          p: 0,
        }}
      >
        {renderDraftSvg(
          draft,
          previewFrame.viewBox,
        )}
      </Box>
      {draft.notes?.length ? (
        <Box sx={{ mt: 2 }}>
          {draft.notes.map((note) => (
            <Alert key={note.id} severity={note.severity ?? 'info'} sx={{ mt: 1 }}>
              {note.text}
            </Alert>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
