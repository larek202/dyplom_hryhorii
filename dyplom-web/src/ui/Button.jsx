import { Button as MuiButton } from '@mui/material';

/** Обёртка над MUI Button; остальные пропсы — как у MuiButton. */
export default function Button({ variant = 'contained', color = 'primary', size = 'medium', ...props }) {
  return <MuiButton variant={variant} color={color} size={size} {...props} />;
}
