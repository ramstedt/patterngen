import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { alpha } from '@mui/material/styles';
import { Footer } from '../Footer/Footer';
import { AppHeader } from './AppHeader';

export function AppLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Grid background */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(${alpha('#8a4e33', 0.06)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha('#8a4e33', 0.06)} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage:
            'linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.06) 38%, rgba(0,0,0,0))',
        }}
      />

      <AppHeader />

      <Container
        maxWidth='lg'
        sx={{ py: 4, px: { xs: 0, sm: 3 }, flexGrow: 1 }}
      >
        <Outlet />
      </Container>

      <Footer />
    </Box>
  );
}
