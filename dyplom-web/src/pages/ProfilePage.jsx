import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  Chip,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { changePassword, updateNotifications, updateProfile, uploadProfileAvatarImage } from '../api/auth.js';
import ProfileAccountDataView from '../components/profile/ProfileAccountDataView.jsx';
import { fetchBookings } from '../api/bookings.js';
import { fetchFavorites } from '../api/favorites.js';
import PageLoader from '../components/feedback/PageLoader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getUiErrorMessage } from '../services/api.js';
import { getUserInitials } from '../utils/userInitials.js';
import { Button, Input, Modal } from '../ui';
import '../components/events/events.css';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const paperCardSx = (theme) => ({
  borderRadius: 3,
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
});

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileAlert, setProfileAlert] = useState({ severity: 'success', text: '' });

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFormError, setPasswordFormError] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [bookingsCount, setBookingsCount] = useState(null);
  const [favoritesCount, setFavoritesCount] = useState(null);

  useEffect(() => {
    if (!user) return;
    setEmailNotifications(user.emailEnabled !== false);
  }, [user]);

  useEffect(() => {
    if (location.state?.profileSaved) {
      setProfileAlert({ severity: 'success', text: 'Dane konta zostały zaktualizowane.' });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    setStatsLoading(true);
    setStatsError('');
    (async () => {
      try {
        const [bData, fData] = await Promise.all([fetchBookings(), fetchFavorites()]);
        if (cancelled) return;
        const bookings = Array.isArray(bData?.bookings) ? bData.bookings : [];
        const events = Array.isArray(fData?.events) ? fData.events : [];
        setBookingsCount(bookings.length);
        setFavoritesCount(events.length);
      } catch (e) {
        if (!cancelled) {
          setStatsError(getUiErrorMessage(e));
          setBookingsCount(null);
          setFavoritesCount(null);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function buildAvatarProfilePayload(avatarUrl) {
    const fn = String(user?.firstName ?? '').trim();
    const ln = String(user?.lastName ?? '').trim();
    const em = String(user?.email ?? '').trim();
    return {
      firstName: fn,
      lastName: ln,
      email: em,
      name: [fn, ln].filter(Boolean).join(' ').trim(),
      avatar: avatarUrl,
    };
  }

  async function handleAvatarFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setProfileAlert({ severity: 'success', text: '' });
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileAlert({ severity: 'error', text: 'Wybierz plik graficzny (JPG, PNG, GIF lub WebP).' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setProfileAlert({ severity: 'error', text: 'Zdjęcie może mieć maks. 5 MB.' });
      return;
    }
    const emailTrim = String(user?.email ?? '').trim();
    if (!emailTrim) {
      setProfileAlert({
        severity: 'error',
        text: 'Uzupełnij adres e-mail w danych konta przed zmianą zdjęcia.',
      });
      return;
    }
    setAvatarUploading(true);
    try {
      const avatarUrl = await uploadProfileAvatarImage([file]);
      if (!avatarUrl) {
        setProfileAlert({ severity: 'error', text: 'Nie udało się uzyskać adresu zdjęcia. Spróbuj ponownie.' });
        return;
      }
      await updateProfile(buildAvatarProfilePayload(avatarUrl));
      await refreshUser();
      setProfileAlert({ severity: 'success', text: 'Zdjęcie profilowe zostało zaktualizowane.' });
    } catch (err) {
      setProfileAlert({ severity: 'error', text: getUiErrorMessage(err) });
    } finally {
      setAvatarUploading(false);
    }
  }

  function openPasswordModal() {
    setPasswordFormError('');
    setNewPassword('');
    setRepeatPassword('');
    setPasswordOpen(true);
  }

  function closePasswordModal() {
    setPasswordOpen(false);
    setPasswordFormError('');
    setNewPassword('');
    setRepeatPassword('');
  }

  async function handleEmailNotificationsChange(_e, checked) {
    const prev = emailNotifications;
    setProfileAlert((a) => ({ ...a, text: '' }));
    setEmailNotifications(checked);
    setNotificationsSaving(true);
    try {
      await updateNotifications({ emailEnabled: checked });
      await refreshUser();
    } catch (err) {
      setEmailNotifications(prev);
      setProfileAlert({ severity: 'error', text: getUiErrorMessage(err) });
    } finally {
      setNotificationsSaving(false);
    }
  }

  async function handleSavePassword() {
    setPasswordFormError('');
    if (newPassword.length < 6) {
      setPasswordFormError('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }
    if (newPassword !== repeatPassword) {
      setPasswordFormError('Hasła muszą być takie same.');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(newPassword);
      closePasswordModal();
      setProfileAlert({ severity: 'success', text: 'Hasło zostało zmienione.' });
    } catch (err) {
      setPasswordFormError(getUiErrorMessage(err));
    } finally {
      setPasswordSaving(false);
    }
  }

  if (authLoading) {
    return <PageLoader label="Ładowanie profilu" />;
  }

  if (!user) {
    return (
      <Stack spacing={2}>
        <header className="mm-page-header">
          <h1 className="mm-page-title">Profil</h1>
        </header>
        <Alert severity="info">Zaloguj się, aby zobaczyć profil.</Alert>
      </Stack>
    );
  }

  const roleStr = user.role != null && user.role !== '' ? String(user.role) : 'user';
  const isOrganizer = roleStr === 'organizer';
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Użytkownik';

  const sectionTitleSx = {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'text.secondary',
  };

  const statMiniCardSx = {
    flex: 1,
    minWidth: 0,
    borderRadius: 2,
    border: 1,
    borderColor: 'divider',
    bgcolor: (t) => alpha(t.palette.grey[50], 0.8),
    transition: 'border-color 0.2s, box-shadow 0.2s',
    '&:hover': {
      borderColor: 'primary.light',
      boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.12)}`,
    },
  };

  return (
    <Stack spacing={3} component="div" sx={{ maxWidth: 1080, width: '100%', mx: 'auto', pb: 2 }}>
      <Box component="header">
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, letterSpacing: '-0.03em', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}
        >
          Profil
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mt: 1.25, maxWidth: 560, lineHeight: 1.65, fontSize: { xs: '0.9375rem', sm: '1rem' } }}
        >
          Zarządzaj danymi konta, bezpieczeństwem i powiadomieniami — wszystko w jednym, przejrzystym widoku.
        </Typography>
      </Box>

      {profileAlert.text ? (
        <Alert severity={profileAlert.severity} onClose={() => setProfileAlert((a) => ({ ...a, text: '' }))}>
          {profileAlert.text}
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
        {/* Lewa kolumna — użytkownik */}
        <Paper
          elevation={0}
          sx={(t) => ({
            width: '100%',
            flex: { md: '0 0 320px' },
            p: { xs: 2.5, sm: 3 },
            ...paperCardSx(t),
          })}
        >
          <Stack spacing={2.5} alignItems="center">
            <Avatar
              src={user.avatar?.trim() ? user.avatar : undefined}
              alt=""
              sx={{
                width: 112,
                height: 112,
                bgcolor: 'primary.main',
                fontWeight: 700,
                fontSize: '2.25rem',
                boxShadow: (t) => `0 8px 24px ${alpha(t.palette.primary.main, 0.35)}`,
              }}
            >
              {getUserInitials(user)}
            </Avatar>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarFileChange}
            />
            <Button
              type="button"
              variant="outlined"
              size="small"
              disabled={avatarUploading || notificationsSaving}
              onClick={() => avatarInputRef.current?.click()}
              sx={{ fontWeight: 600 }}
            >
              {avatarUploading ? 'Przesyłanie…' : user.avatar ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
            </Button>
            <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ lineHeight: 1.5 }}>
              JPG, PNG, GIF lub WebP · maks. 5 MB
            </Typography>

            <Divider flexItem sx={{ borderColor: 'divider' }} />

            <Typography variant="h6" component="p" fontWeight={800} textAlign="center" sx={{ letterSpacing: '-0.03em' }}>
              {displayName}
            </Typography>

            <Chip
              label={isOrganizer ? 'Organizator' : 'Użytkownik'}
              color={isOrganizer ? 'primary' : 'default'}
              size="small"
              sx={{ fontWeight: 700 }}
            />

            {isOrganizer ? (
              <Button
                component={RouterLink}
                to="/organizer"
                variant="contained"
                fullWidth
                disabled={avatarUploading || notificationsSaving}
                sx={{ fontWeight: 700, py: 1.1 }}
              >
                Panel organizatora
              </Button>
            ) : null}

            <Box sx={{ width: '100%', pt: 0.5 }}>
              <Typography sx={{ ...sectionTitleSx, mb: 1.5 }}>Aktywność</Typography>
              {statsError ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  {statsError}
                </Alert>
              ) : null}
              <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}>
                <Card elevation={0} sx={statMiniCardSx}>
                  <CardActionArea
                    component={RouterLink}
                    to="/bookings"
                    aria-label="Rezerwacje — przejdź do listy"
                    sx={{ borderRadius: 2, py: 1.5, px: 1.25 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                          color: 'primary.main',
                        }}
                      >
                        <EventAvailableOutlinedIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>
                          Rezerwacje
                        </Typography>
                        <Typography variant="h6" component="p" fontWeight={800} lineHeight={1.2}>
                          {statsLoading ? '…' : bookingsCount ?? '—'}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardActionArea>
                </Card>
                <Card elevation={0} sx={statMiniCardSx}>
                  <CardActionArea
                    component={RouterLink}
                    to="/favorites"
                    aria-label="Ulubione — przejdź do listy"
                    sx={{ borderRadius: 2, py: 1.5, px: 1.25 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: (t) => alpha(t.palette.error.main, 0.08),
                          color: 'error.main',
                        }}
                      >
                        <BookmarkBorderOutlinedIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>
                          Ulubione
                        </Typography>
                        <Typography variant="h6" component="p" fontWeight={800} lineHeight={1.2}>
                          {statsLoading ? '…' : favoritesCount ?? '—'}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* Prawa kolumna — dwie karty */}
        <Stack spacing={3} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Paper
            elevation={0}
            component={Stack}
            spacing={2.5}
            sx={(t) => ({
              p: { xs: 2.5, sm: 3 },
              ...paperCardSx(t),
            })}
          >
            <Box>
              <Typography sx={sectionTitleSx}>Dane konta</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ mt: 0.75, letterSpacing: '-0.02em' }}>
                Dane konta
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                Imię, nazwisko i adres e-mail widoczne w aplikacji oraz przy kontakcie z organizatorami.
              </Typography>
            </Box>

            <ProfileAccountDataView
              firstName={user.firstName ?? ''}
              lastName={user.lastName ?? ''}
              email={user.email ?? ''}
              disabled={avatarUploading || notificationsSaving}
            />

            {user.role !== 'organizer' ? (
              <>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                    Chcesz tworzyć własne wydarzenia? Zarejestruj konto organizatora.
                  </Typography>
                  <Button
                    component={RouterLink}
                    to="/organizer/register"
                    variant="outlined"
                    fullWidth
                    disabled={avatarUploading || notificationsSaving}
                    sx={{ fontWeight: 700 }}
                  >
                    Zostań organizatorem
                  </Button>
                </Box>
              </>
            ) : null}
          </Paper>

          <Paper
            elevation={0}
            component={Stack}
            spacing={2.5}
            sx={(t) => ({
              p: { xs: 2.5, sm: 3 },
              ...paperCardSx(t),
            })}
          >
            <Box>
              <Typography sx={sectionTitleSx}>Bezpieczeństwo</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ mt: 0.75, letterSpacing: '-0.02em' }}>
                Bezpieczeństwo i powiadomienia
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                Hasło logowania oraz zgoda na wiadomości e-mail z serwisu.
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                  py: 1,
                  px: { xs: 0, sm: 0.5 },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Hasło
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Zmień hasło używane do logowania.
                  </Typography>
                </Box>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={openPasswordModal}
                  disabled={avatarUploading || notificationsSaving}
                  sx={{ fontWeight: 700, flexShrink: 0 }}
                >
                  Zmień hasło
                </Button>
              </Box>

              <Divider />

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications}
                      onChange={handleEmailNotificationsChange}
                      disabled={notificationsSaving || avatarUploading}
                      inputProps={{ 'aria-label': 'Powiadomienia e-mail' }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} component="span" display="block">
                        Powiadomienia e-mail
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Przypomnienia i informacje o rezerwacjach oraz wydarzeniach.
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', m: 0, gap: 1 }}
                />
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Stack>

      <Modal
        open={passwordOpen}
        onClose={closePasswordModal}
        title="Zmień hasło"
        actions={
          <>
            <Button variant="text" onClick={closePasswordModal} disabled={passwordSaving}>
              Anuluj
            </Button>
            <Button variant="contained" onClick={handleSavePassword} disabled={passwordSaving}>
              {passwordSaving ? 'Zapisywanie…' : 'Zapisz hasło'}
            </Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {passwordFormError ? (
            <Alert severity="error" role="alert">
              {passwordFormError}
            </Alert>
          ) : null}
          <Input
            label="Nowe hasło"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            margin="none"
            disabled={passwordSaving}
          />
          <Input
            label="Powtórz hasło"
            name="repeatPassword"
            type="password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            autoComplete="new-password"
            margin="none"
            disabled={passwordSaving}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
