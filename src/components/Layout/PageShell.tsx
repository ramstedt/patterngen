import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

interface PageShellProps {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function PageShell({ kicker, title, description, children }: PageShellProps) {
  return (
    <Paper
      variant='outlined'
      sx={{
        p: { xs: 0, sm: 2.5, md: 3 },
        bgcolor: 'background.paper',
        border: 1,
        borderColor: '#D9D9D9',
        boxShadow: 'none',
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 0 },
          pb: { xs: 2, md: 0 },
          display: 'grid',
          gap: { xs: 2.5, md: 4 },
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(220px, 320px) minmax(0, 1fr)',
          },
          alignItems: 'start',
        }}
      >
        <Box>
          <Typography variant='overline' color='secondary.main'>
            {kicker}
          </Typography>
          <Typography variant='h6' sx={{ mt: 0.75 }}>
            {title}
          </Typography>
          <Typography
            color='text.secondary'
            sx={{ mt: 1, lineHeight: 1.8 }}
          >
            {description}
          </Typography>
        </Box>

        {children}
      </Box>
    </Paper>
  );
}
