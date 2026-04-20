import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { updateProfile } from '../api/auth.js';
import ProfileAccountEditForm from '../components/profile/ProfileAccountEditForm.jsx';
import PageLoader from '../components/feedback/PageLoader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getUiErrorMessage } from '../services/api.js';

const paperCardSx = (theme) => ({
  borderRadius: 3,
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
});

const sectionTitleSx = {
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

export default function ProfileAccountEditPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  async function handleSubmit(values) {
    setErrorText('');
    setSaving(true);
    try {
      const name = [values.firstName, values.lastName].filter(Boolean).join(' ').trim();
      await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        name,
      });
      await refreshUser();
      navigate('/profile', { replace: true, state: { profileSaved: true } });
    } catch (err) {
      setErrorText(getUiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate('/profile', { replace: false });
  }

  if (authLoading) {
    return <PageLoader label="Ładowanie" />;
  }

  if (!user) {
    return null;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 640, width: '100%', mx: 'auto', pb: 4 }}>
      <Typography
        component={RouterLink}
        to="/profile"
        variant="body2"
        sx={{
          color: 'primary.main',
          textDecoration: 'none',
          fontWeight: 600,
          alignSelf: 'flex-start',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        ← Wróć do profilu
      </Typography>

      <Box component="header">
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
          Edytuj dane konta
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.65 }}>
          Zaktualizuj imię, nazwisko lub adres e-mail. Zmiany zapiszesz dopiero po kliknięciu „Zapisz zmiany”.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={(t) => ({
          p: { xs: 2.5, sm: 3 },
          ...paperCardSx(t),
        })}
      >
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={sectionTitleSx}>Formularz</Typography>
          <Typography variant="h6" fontWeight={800} sx={{ mt: 0.75, letterSpacing: '-0.02em' }}>
            Twoje dane
          </Typography>
        </Box>

        <ProfileAccountEditForm
          initialFirstName={user.firstName ?? ''}
          initialLastName={user.lastName ?? ''}
          initialEmail={user.email ?? ''}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          saving={saving}
          errorText={errorText}
        />
      </Paper>
    </Stack>
  );
}
