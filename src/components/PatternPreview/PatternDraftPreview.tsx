import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { PatternDraft } from '../../lib/patterns';

type PatternDraftPreviewProps = {
  draft: PatternDraft;
};

function getStrokeStyle(kind: PatternDraft['lines'][number]['kind']) {
  if (kind === 'seamAllowance') {
    return { stroke: '#111111', strokeWidth: 2, strokeDasharray: undefined };
  }

  if (kind === 'seam') {
    return { stroke: '#616161', strokeWidth: 1.1, strokeDasharray: undefined };
  }

  if (kind === 'construction') {
    return { stroke: '#757575', strokeWidth: 1, strokeDasharray: '4 4' };
  }

  if (kind === 'grainline') {
    return { stroke: '#757575', strokeWidth: 1, strokeDasharray: '6 5' };
  }

  if (kind === 'guide') {
    return { stroke: '#9e9e9e', strokeWidth: 0.9, strokeDasharray: undefined };
  }

  return { stroke: '#111111', strokeWidth: 1.4, strokeDasharray: undefined };
}

function isDartLine(id: string) {
  return id.includes('Dart');
}

function getLineStyle(line: PatternDraft['lines'][number]) {
  const baseStyle = getStrokeStyle(line.kind);

  if (isDartLine(line.id)) {
    return { ...baseStyle, strokeWidth: 1 };
  }

  return baseStyle;
}

function getLabelFill(kind: PatternDraft['labels'][number]['kind']) {
  if (kind === 'guide') {
    return '#757575';
  }

  return 'rgba(0, 0, 0, 0.87)';
}

function getStrokeGeometry(kind: PatternDraft['lines'][number]['kind']) {
  if (kind === 'grainline' || kind === 'guide' || kind === 'construction') {
    return {
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      strokeMiterlimit: undefined,
    };
  }

  return {
    strokeLinecap: 'butt' as const,
    strokeLinejoin: 'miter' as const,
    strokeMiterlimit: 10,
  };
}

export function PatternDraftPreview({ draft }: PatternDraftPreviewProps) {
  const points = new Map(draft.points.map((point) => [point.id, point]));
  const backDartGuide = draft.lines.find((line) => line.id === 'backDartGuide');
  const visibleLines = draft.lines.filter((line) => line.id !== 'backDartGuide');

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
        <svg
          viewBox={`0 0 ${draft.width} ${draft.height}`}
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
            x='0'
            y='0'
            width={draft.width}
            height={draft.height}
            fill='rgba(255, 255, 255, 0.92)'
          />

          {visibleLines.map((line) => {
            if (line.kind === 'hidden') return null;

            const from = points.get(line.from);
            const to = points.get(line.to);

            if (!from || !to) return null;

            const style = getLineStyle(line);
            const geometry = getStrokeGeometry(line.kind);

            return (
              <line
                key={line.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                vectorEffect='non-scaling-stroke'
                {...geometry}
                {...style}
              />
            );
          })}

          {draft.paths.map((path) => {
            if (path.kind === 'hidden') return null;

            const style = getStrokeStyle(path.kind);
            const geometry = getStrokeGeometry(path.kind);

            return (
              <path
                key={path.id}
                d={path.d}
                fill='none'
                vectorEffect='non-scaling-stroke'
                {...geometry}
                {...style}
              />
            );
          })}

          {backDartGuide ? (() => {
            if (backDartGuide.kind === 'hidden') return null;

            const from = points.get(backDartGuide.from);
            const to = points.get(backDartGuide.to);

            if (!from || !to) return null;

            const style = getLineStyle(backDartGuide);
            const geometry = getStrokeGeometry(backDartGuide.kind);

            return (
              <line
                key={backDartGuide.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                vectorEffect='non-scaling-stroke'
                {...geometry}
                {...style}
              />
            );
          })() : null}

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
              fill={getLabelFill(label.kind)}
              fontSize='16'
              textAnchor='middle'
              dominantBaseline='middle'
            >
              {label.text}
            </text>
          ))}
        </svg>
      </Box>
    </Box>
  );
}
