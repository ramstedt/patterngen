import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { PatternDraft } from '../../lib/patterns';

type PatternDraftPreviewProps = {
  draft: PatternDraft;
};

function getStrokeStyle(kind: PatternDraft['lines'][number]['kind']) {
  if (kind === 'construction') {
    return { stroke: '#757575', strokeWidth: 1, strokeDasharray: '4 4' };
  }

  if (kind === 'grainline') {
    return { stroke: '#757575', strokeWidth: 1, strokeDasharray: '6 5' };
  }

  return { stroke: '#111111', strokeWidth: 1.4, strokeDasharray: undefined };
}

export function PatternDraftPreview({ draft }: PatternDraftPreviewProps) {
  const points = new Map(draft.points.map((point) => [point.id, point]));

  return (
    <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant='h6'>Draft</Typography>
      <Box
        sx={{
          mt: 2,
          border: 1,
          borderColor: 'divider',
          overflow: 'auto',
          p: 2,
          bgcolor: 'background.paper',
        }}
      >
        <svg
          viewBox={`0 0 ${draft.width} ${draft.height}`}
          role='img'
          aria-label='Pattern draft preview'
          style={{
            display: 'block',
            width: 'auto',
            maxWidth: '100%',
            height: 'min(420px, 70vh)',
          }}
        >
          <rect
            x='0'
            y='0'
            width={draft.width}
            height={draft.height}
            fill='rgba(255, 255, 255, 0.92)'
          />

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
