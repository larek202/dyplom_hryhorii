import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Stack, Typography } from '@mui/material';
import { getOrganizerProfileByUserId } from '../api/organizer.js';
import { getApiBaseUrl } from '../api/client';
import OrganizationProfileCard from '../components/organizer/OrganizationProfileCard.jsx';
import ErrorState from '../components/feedback/ErrorState.jsx';
import PageLoader from '../components/feedback/PageLoader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getUiErrorMessage } from '../services/api.js';
import { Button } from '../ui';
import '../components/events/events.css';

export default function OrganizerPublicProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [retryKey, setRetryKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState(null);

  const isOwnProfile = useMemo(() => {
    if (!user?.id || !userId) return false;
    return String(user.id) === String(userId);
  }, [user?.id, userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError('Brak identyfikatora organizatora.');
      setOrganization(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await getOrganizerProfileByUserId(userId);
        const org = data?.organization ?? null;
        if (!cancelled) setOrganization(org);
      } catch (e) {
        if (!cancelled) {
          setError(getUiErrorMessage(e));
          setOrganization(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, retryKey]);

  if (loading) {
    return <PageLoader label="Ładowanie profilu organizatora" />;
  }

  if (error || !organization) {
    return (
      <Stack spacing={2}>
        <Typography
          component={RouterLink}
          to="/events"
          variant="body2"
          sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
        >
          ← Wszystkie wydarzenia
        </Typography>
        <header className="mm-page-header">
          <h1 className="mm-page-title">Organizator</h1>
        </header>
        <ErrorState
          title="Nie udało się wczytać profilu"
          message={error || 'Brak danych organizacji.'}
          hint={`Sprawdź, czy backend jest uruchomiony (${getApiBaseUrl()}).`}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
      <Typography
        component={RouterLink}
        to="/events"
        variant="body2"
        sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
      >
        ← Wszystkie wydarzenia
      </Typography>

      <header className="mm-page-header">
        <h1 className="mm-page-title">Organizator</h1>
      </header>

      <OrganizationProfileCard organization={organization} />

      {isOwnProfile ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignSelf: 'flex-start' }}>
          <Button component={RouterLink} to="/organizer" variant="outlined">
            Panel organizatora
          </Button>
          <Button component={RouterLink} to="/organizer/profile/edit" variant="outlined">
            Edytuj profil
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
