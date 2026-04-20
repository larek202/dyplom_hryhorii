import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * Nagłówek sekcji w sidebarze (np. MENU, KONTO) — subtelny, z lekkim akcentem z lewej.
 */
export default function SidebarSectionLabel({ children, sx: sxProp }) {
  return (
    <Box sx={{ px: 2, pt: 2.75, pb: 1, ...sxProp }}>
      <Typography
        component="div"
        variant="overline"
        sx={(theme) => ({
          display: 'block',
          fontWeight: 600,
          fontSize: '0.625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: alpha(theme.palette.text.secondary, 0.92),
          pl: 1.25,
          py: 0.5,
          borderLeft: `2px solid ${alpha(theme.palette.primary.main, 0.45)}`,
          borderRadius: '0 4px 4px 0',
          bgcolor: alpha(theme.palette.primary.main, 0.025),
        })}
      >
        {children}
      </Typography>
    </Box>
  );
}
