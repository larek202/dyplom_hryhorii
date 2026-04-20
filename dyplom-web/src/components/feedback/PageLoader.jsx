import { Box, CircularProgress } from '@mui/material';

/**
 * Wyrównany loader strony (PL).
 * @param {{ label?: string }} props
 */
export default function PageLoader({ label = 'Ładowanie…' }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      py={6}
      minHeight="42vh"
    >
      <CircularProgress aria-label={label} />
    </Box>
  );
}
