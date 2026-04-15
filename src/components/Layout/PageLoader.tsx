import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress size={28} />
    </Box>
  );
}
