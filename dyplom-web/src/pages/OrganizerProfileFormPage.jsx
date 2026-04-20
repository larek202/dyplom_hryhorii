import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, Navigate, useMatch, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PageLoader from '../components/feedback/PageLoader.jsx';
import {
  getOrganizerProfile,
  registerOrganizer,
  updateOrganizerProfile,
  uploadOrganizerLogo,
} from '../api/organizer.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError, getUiErrorMessage } from '../services/api.js';
import { organizationToForm } from '../utils/organizationForm.js';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const emptyForm = {
  name: '',
  description: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  city: '',
  address: '',
  facebook: '',
  instagram: '',
};

/**
 * Rejestracja organizatora (`/organizer/register`) lub edycja profilu (`/organizer/profile/edit`).
 */
export default function OrganizerProfileFormPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  const isEditMode = Boolean(useMatch({ path: '/organizer/profile/edit', end: true }));

  const [form, setForm] = useState(emptyForm);
  const [remoteLogoUrl, setRemoteLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoObjectUrl, setLogoObjectUrl] = useState('');
  const [loadProfile, setLoadProfile] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const backTo = isEditMode ? '/organizer' : '/profile';
  const loginFrom = isEditMode ? '/organizer/profile/edit' : '/organizer/register';

  const logoDisplaySrc = useMemo(() => {
    if (logoObjectUrl) return logoObjectUrl;
    if (remoteLogoUrl && /^https?:\/\//i.test(remoteLogoUrl)) return remoteLogoUrl;
    return '';
  }, [logoObjectUrl, remoteLogoUrl]);

  useEffect(() => {
    if (!isEditMode) return undefined;
    let cancelled = false;
    setLoadProfile(true);
    setError('');
    (async () => {
      try {
        const data = await getOrganizerProfile();
        const org = data?.organization;
        if (cancelled || !org) return;
        setForm(organizationToForm(org));
        setRemoteLogoUrl(String(org.logoUrl || '').trim());
      } catch (e) {
        if (!cancelled) setError(getUiErrorMessage(e));
      } finally {
        if (!cancelled) setLoadProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditMode]);

  const setField = useCallback((key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }, []);

  const revokeBlob = useCallback(() => {
    if (logoObjectUrl && logoObjectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(logoObjectUrl);
    }
    setLogoObjectUrl('');
  }, [logoObjectUrl]);

  const handleLogoChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      setError('');
      revokeBlob();
      setLogoFile(null);
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setError('Wybierz plik graficzny (JPG, PNG, GIF lub WebP).');
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        setError('Logo może mieć maks. 5 MB.');
        return;
      }
      setLogoFile(file);
      setLogoObjectUrl(URL.createObjectURL(file));
    },
    [revokeBlob],
  );

  const clearLogo = useCallback(() => {
    revokeBlob();
    setLogoFile(null);
    setRemoteLogoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [revokeBlob]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Podaj nazwę organizatora.');
      return;
    }
    setSubmitting(true);
    try {
      const bodyBase = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        website: form.website.trim() || undefined,
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined,
        facebook: form.facebook.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
      };

      if (isEditMode) {
        let logoUrlForPut;
        if (logoFile) {
          logoUrlForPut = await uploadOrganizerLogo([logoFile]);
          if (!logoUrlForPut) {
            setError('Nie udało się uzyskać adresu logo po przesłaniu. Spróbuj ponownie.');
            setSubmitting(false);
            return;
          }
        } else {
          logoUrlForPut = remoteLogoUrl.trim();
        }
        await updateOrganizerProfile({
          ...bodyBase,
          logoUrl: logoUrlForPut === '' ? '' : logoUrlForPut || undefined,
        });
        await refreshUser();
        navigate('/organizer', { replace: true });
      } else {
        let logoUrl;
        if (logoFile) {
          logoUrl = await uploadOrganizerLogo([logoFile]);
          if (!logoUrl) {
            setError('Nie udało się uzyskać adresu logo po przesłaniu. Spróbuj ponownie.');
            setSubmitting(false);
            return;
          }
        }
        await registerOrganizer({
          ...bodyBase,
          logoUrl: logoUrl || undefined,
        });
        await refreshUser();
        navigate('/organizer', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { replace: false, state: { from: loginFrom } });
        return;
      }
      setError(getUiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isEditMode && loadProfile) {
    return <PageLoader label="Ładowanie profilu organizatora" />;
  }

  const role = user?.role != null && user.role !== '' ? String(user.role) : 'user';
  if (!isEditMode && !authLoading && role === 'organizer') {
    return <Navigate to="/organizer" replace />;
  }

  return (
    <Box component="main" sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography
        component={RouterLink}
        to={backTo}
        variant="body2"
        sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600, display: 'inline-block', mb: 2 }}
      >
        {isEditMode ? '← Panel organizatora' : '← Profil'}
      </Typography>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Stack spacing={2} component="form" onSubmit={handleSubmit} noValidate>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
              {isEditMode ? 'Edytuj profil organizatora' : 'Zostań organizatorem'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode
                ? 'Zaktualizuj dane organizacji i zapisz zmiany.'
                : 'Uzupełnij dane organizacji. Po zatwierdzeniu otrzymasz dostęp do panelu organizatora.'}
            </Typography>
          </Box>

          {error ? (
            <Alert severity="error" role="alert" onClose={() => setError('')}>
              {error}
            </Alert>
          ) : null}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Nazwa organizatora"
                name="name"
                value={form.name}
                onChange={setField('name')}
                required
                fullWidth
                disabled={submitting}
                autoComplete="organization"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Opis"
                name="description"
                value={form.description}
                onChange={setField('description')}
                fullWidth
                multiline
                minRows={3}
                disabled={submitting}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="E-mail kontaktowy"
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={setField('contactEmail')}
                fullWidth
                disabled={submitting}
                autoComplete="email"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Telefon"
                name="contactPhone"
                type="tel"
                value={form.contactPhone}
                onChange={setField('contactPhone')}
                fullWidth
                disabled={submitting}
                autoComplete="tel"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Strona WWW"
                name="website"
                value={form.website}
                onChange={setField('website')}
                fullWidth
                disabled={submitting}
                placeholder="https://…"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Miasto"
                name="city"
                value={form.city}
                onChange={setField('city')}
                fullWidth
                disabled={submitting}
                autoComplete="address-level2"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Adres"
                name="address"
                value={form.address}
                onChange={setField('address')}
                fullWidth
                disabled={submitting}
                autoComplete="street-address"
                placeholder="Ulica, numer…"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Facebook"
                name="facebook"
                value={form.facebook}
                onChange={setField('facebook')}
                fullWidth
                disabled={submitting}
                placeholder="https://facebook.com/…"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Instagram"
                name="instagram"
                value={form.instagram}
                onChange={setField('instagram')}
                fullWidth
                disabled={submitting}
                placeholder="https://instagram.com/…"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Logo (opcjonalnie)
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  hidden
                  onChange={handleLogoChange}
                />
                <Button type="button" variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={submitting}>
                  Wybierz plik
                </Button>
                {logoFile || remoteLogoUrl ? (
                  <Button type="button" color="inherit" onClick={clearLogo} disabled={submitting}>
                    Usuń logo
                  </Button>
                ) : null}
              </Stack>
              {logoDisplaySrc ? (
                <Box
                  component="img"
                  src={logoDisplaySrc}
                  alt="Podgląd logo"
                  sx={{ mt: 2, maxWidth: 200, maxHeight: 120, objectFit: 'contain', borderRadius: 1, border: 1, borderColor: 'divider' }}
                />
              ) : null}
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? 'Zapisywanie…' : isEditMode ? 'Zapisz zmiany' : 'Wyślij zgłoszenie'}
            </Button>
            <Button type="button" component={RouterLink} to={backTo} variant="outlined" disabled={submitting}>
              Anuluj
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
