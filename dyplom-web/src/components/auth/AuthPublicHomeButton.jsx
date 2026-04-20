import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';

/**
 * Przejście do publicznej części aplikacji (lista wydarzeń) bez logowania.
 */
export default function AuthPublicHomeButton() {
  return (
    <Button
      component={RouterLink}
      to="/events"
      variant="outlined"
      color="inherit"
      fullWidth
      sx={{ fontWeight: 600 }}
      aria-label="Powrót do listy wydarzeń bez logowania"
    >
      Wróć na stronę główną
    </Button>
  );
}
