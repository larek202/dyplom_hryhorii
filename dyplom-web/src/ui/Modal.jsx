import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Button from './Button.jsx';

/**
 * Okno dialogowe (MUI Dialog).
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} [title]
 * @param {import('react').ReactNode} children — treść
 * @param {import('react').ReactNode} [actions] — własne przyciski; domyślnie „Zamknij”
 */
export default function Modal({ open, onClose, title, children, actions }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        {actions ?? (
          <Button variant="text" onClick={onClose}>
            Zamknij
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
