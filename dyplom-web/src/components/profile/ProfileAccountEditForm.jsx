import { useEffect, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { Button, Input } from '../../ui';

/**
 * Formularz edycji imienia, nazwiska i e-maila.
 * @param {{
 *   initialFirstName?: string;
 *   initialLastName?: string;
 *   initialEmail?: string;
 *   onSubmit: (values: { firstName: string; lastName: string; email: string }) => void | Promise<void>;
 *   onCancel: () => void;
 *   saving?: boolean;
 *   errorText?: string;
 * }} props
 */
export default function ProfileAccountEditForm({
  initialFirstName = '',
  initialLastName = '',
  initialEmail = '',
  onSubmit,
  onCancel,
  saving = false,
  errorText = '',
}) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);

  useEffect(() => {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setEmail(initialEmail);
  }, [initialFirstName, initialLastName, initialEmail]);

  async function handleSubmit(e) {
    e.preventDefault();
    await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    });
  }

  return (
    <Stack component="form" spacing={2.25} onSubmit={handleSubmit} noValidate>
      {errorText ? (
        <Alert severity="error" role="alert">
          {errorText}
        </Alert>
      ) : null}

      <Input
        label="Imię"
        name="firstName"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        autoComplete="given-name"
        margin="none"
        disabled={saving}
      />
      <Input
        label="Nazwisko"
        name="lastName"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        autoComplete="family-name"
        margin="none"
        disabled={saving}
      />
      <Input
        label="E-mail"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        margin="none"
        disabled={saving}
        required
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1, alignItems: { xs: 'stretch', sm: 'flex-start' } }}>
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          sx={{ fontWeight: 700, px: { sm: 3 }, width: { xs: '100%', sm: 'auto' } }}
        >
          {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </Button>
        <Button
          type="button"
          variant="outlined"
          onClick={onCancel}
          disabled={saving}
          sx={{ fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}
        >
          Anuluj
        </Button>
      </Stack>
    </Stack>
  );
}
