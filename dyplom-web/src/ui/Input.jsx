import { forwardRef } from 'react';
import { TextField } from '@mui/material';

/** Pole tekstowe (MUI TextField, wariant outlined). */
const Input = forwardRef(function Input(
  { label, error, helperText, fullWidth = true, size = 'medium', margin = 'normal', ...props },
  ref
) {
  return (
    <TextField
      ref={ref}
      label={label}
      error={Boolean(error)}
      helperText={helperText ?? (typeof error === 'string' ? error : undefined)}
      fullWidth={fullWidth}
      size={size}
      margin={margin}
      variant="outlined"
      {...props}
    />
  );
});

export default Input;
