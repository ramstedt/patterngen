import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { PatternDraft } from '../../lib/patterns';

type PatternDraftPreviewProps = {
  draft: PatternDraft;
};

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
    return { stroke: '#757575', strokeWidth: 1, strokeDasharray: '6 5' };
  }

  return { stroke: '#111111', strokeWidth: 1.4, strokeDasharray: undefined };
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

function renderDraftSvg(draft: PatternDraft, viewBox: string, frameWidth: number, frameHeight: number) {
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
      <rect
        x={Number(viewBox.split(' ')[0])}
        y={Number(viewBox.split(' ')[1])}
        width={frameWidth}
        height={frameHeight}
        fill='rgba(255, 255, 255, 0.92)'
      />

      <g opacity={draft.baseOpacity ?? 1}>
        {draft.lines.map((line) => {
          if (line.kind === 'hidden') return null;

          const from = points.get(line.from);
          const to = points.get(line.to);

          if (!from || !to) return null;

          const style = getStrokeStyle(line.kind);

          return (
            <line
              key={line.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeLinecap='round'
              vectorEffect='non-scaling-stroke'
              {...style}
            />
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
            fill='rgba(0, 0, 0, 0.87)'
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
        pt: { xs: 0, sm: 3 },
        borderTop: { xs: 0, sm: 1 },
        borderColor: 'divider',
      }}
    >
      <Typography variant='h6'>Draft</Typography>
      <Box
        sx={{
          mt: 2,
          border: { xs: 0, sm: 1 },
          borderColor: 'divider',
          overflowX: { xs: 'hidden', sm: 'auto' },
          p: { xs: 0, sm: 2 },
          bgcolor: 'background.paper',
        }}
      >
        {renderDraftSvg(
          draft,
          previewFrame.viewBox,
          previewFrame.width,
          previewFrame.height,
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
