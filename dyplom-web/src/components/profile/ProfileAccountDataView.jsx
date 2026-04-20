import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import { Button } from '../../ui';

/**
 * Tylko do odczytu: imię, nazwisko, e-mail + przejście do edycji.
 * @param {{ firstName?: string; lastName?: string; email?: string; disabled?: boolean }} props
 */
export default function ProfileAccountDataView({ firstName = '', lastName = '', email = '', disabled = false }) {
  const empty = '—';

  return (
    <Stack spacing={2.5}>
      <Stack spacing={2}>
        <ReadRow label="Imię" value={firstName.trim() || empty} />
        <ReadRow label="Nazwisko" value={lastName.trim() || empty} />
        <ReadRow label="E-mail" value={email.trim() || empty} />
      </Stack>

      <Box sx={{ pt: 0.5 }}>
        <Button
          component={RouterLink}
          to="/profile/edit"
          variant="outlined"
          disabled={disabled}
          sx={{ fontWeight: 700 }}
        >
          Edytuj dane
        </Button>
      </Box>
    </Stack>
  );
}

function ReadRow({ label, value }) {
  return (
    <Box
      sx={{
        py: 1.25,
        px: 1.5,
        borderRadius: 2,
        bgcolor: (t) => t.palette.action.hover,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.35 }}>
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}
