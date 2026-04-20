import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Stack } from '@mui/material';
import AuthPublicHomeButton from '../components/auth/AuthPublicHomeButton.jsx';
import { Button, Input } from '../ui';
import { useAuth } from '../context/AuthContext.jsx';
import { safeReturnPath } from '../auth/routeAccess.js';
import { apiRequest, setStoredToken, ApiError, getUiErrorMessage } from '../services/api.js';

const WRONG_CREDENTIALS_MSG = 'Nieprawidłowy login lub hasło';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      if (data?.token) {
        setStoredToken(data.token);
        await refreshUser();
        navigate(safeReturnPath(location.state?.from), { replace: true });
      } else {
        setError(WRONG_CREDENTIALS_MSG);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(WRONG_CREDENTIALS_MSG);
      } else {
        setError(getUiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className="mm-auth-heading">Logowanie</h1>
        <p className="muted">Wpisz e-mail i hasło do konta MoveMint.</p>
      </div>

      {error ? (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      ) : null}

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
        autoComplete="current-password"
        margin="none"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        required
      />

      <Button type="submit" disabled={loading} fullWidth>
        {loading ? 'Logowanie…' : 'Zaloguj się'}
      </Button>

      <p className="muted" style={{ fontSize: 14, textAlign: 'center', marginTop: 8 }}>
        Nie masz konta?{' '}
        <Link to="/register" state={location.state} style={{ fontWeight: 600 }}>
          Zarejestruj się
        </Link>
      </p>

      <AuthPublicHomeButton />
    </Stack>
  );
}
