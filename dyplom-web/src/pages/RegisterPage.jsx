import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Stack } from '@mui/material';
import AuthPublicHomeButton from '../components/auth/AuthPublicHomeButton.jsx';
import { Button, Input } from '../ui';
import { useAuth } from '../context/AuthContext.jsx';
import { safeReturnPath } from '../auth/routeAccess.js';
import { apiRequest, setStoredToken, getUiErrorMessage } from '../services/api.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordsMismatch =
    Boolean(password) && Boolean(confirmPassword) && password !== confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Uzupełnij imię i nazwisko.');
      return;
    }
    if (passwordsMismatch) {
      return;
    }
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        },
      });
      if (data?.token) {
        setStoredToken(data.token);
        await refreshUser();
        navigate(safeReturnPath(location.state?.from), { replace: true });
      } else {
        setError('Coś poszło nie tak');
      }
    } catch (err) {
      setError(getUiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className="mm-auth-heading">Rejestracja</h1>
        <p className="muted">Uzupełnij dane, aby założyć konto MoveMint.</p>
      </div>

      {error ? (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      ) : null}

      <Input
        label="Imię"
        name="given-name"
        autoComplete="given-name"
        margin="none"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        disabled={loading}
        required
      />
      <Input
        label="Nazwisko"
        name="family-name"
        autoComplete="family-name"
        margin="none"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        disabled={loading}
        required
      />
      <Input
        label="E-mail"
        type="email"
        name="email"
        autoComplete="email"
        margin="none"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        required
      />
      <Input
        label="Hasło"
        type="password"
        name="password"
        autoComplete="new-password"
        margin="none"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        required
      />
      <Input
        label="Potwierdź hasło"
        type="password"
        name="confirm-password"
        autoComplete="new-password"
        margin="none"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        disabled={loading}
        required
        error={passwordsMismatch ? 'Hasła muszą być takie same.' : ''}
      />

      <Button type="submit" disabled={loading} fullWidth>
        {loading ? 'Rejestrowanie…' : 'Zarejestruj się'}
      </Button>

      <p className="muted" style={{ fontSize: 14, textAlign: 'center', marginTop: 8 }}>
        Masz już konto?{' '}
        <Link to="/login" state={location.state} style={{ fontWeight: 600 }}>
          Zaloguj się
        </Link>
      </p>

      <AuthPublicHomeButton />
    </Stack>
  );
}
