import { useCallback, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

const DEFAULT_MESSAGE = 'Czy na pewno chcesz usunąć?';

/**
 * Dialog potwierdzenia (PL). `ask()` zwraca obietnicę z wartością boolean.
 * @param {string} [initialMessage] — domyślna treść przy `ask()` bez argumentów
 */
export function useConfirm(initialMessage = DEFAULT_MESSAGE) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const resolveRef = useRef(null);

  const ask = useCallback(
    (customMessage) => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setMessage((customMessage && String(customMessage).trim()) || initialMessage);
        setOpen(true);
      });
    },
    [initialMessage],
  );

  const finish = useCallback((value) => {
    setOpen(false);
    const r = resolveRef.current;
    resolveRef.current = null;
    r?.(value);
  }, []);

  const dialog = (
    <Dialog open={open} onClose={() => finish(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Potwierdzenie</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => finish(false)} color="inherit">
          Nie
        </Button>
        <Button onClick={() => finish(true)} variant="contained" color="primary">
          Tak
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { ask, dialog };
}
