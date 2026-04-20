import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Stack, Typography } from '@mui/material';
import { getOrganizerProfile } from '../api/organizer.js';
import { getApiBaseUrl } from '../api/client';
import OrganizationProfileCard from '../components/organizer/OrganizationProfileCard.jsx';
import ErrorState from '../components/feedback/ErrorState.jsx';
import PageLoader from '../components/feedback/PageLoader.jsx';
import { getUiErrorMessage } from '../services/api.js';
import { Button } from '../ui';
import '../components/events/events.css';

export default function OrganizerProfileViewPage() {
  const [retryKey, setRetryKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await getOrganizerProfile();
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
  }, [retryKey]);

  if (loading) {
    return <PageLoader label="Ładowanie profilu organizatora" />;
  }

  if (error || !organization) {
    return (
      <Stack spacing={2}>
        <Typography
          component={RouterLink}
          to="/organizer"
          variant="body2"
          sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
        >
          ← Panel organizatora
        </Typography>
        <header className="mm-page-header">
          <h1 className="mm-page-title">Profil organizacji</h1>
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
        to="/organizer"
        variant="body2"
        sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
      >
        ← Panel organizatora
      </Typography>

      <header className="mm-page-header">
        <h1 className="mm-page-title">Profil organizacji</h1>
      </header>

      <OrganizationProfileCard organization={organization} />

      <Button component={RouterLink} to="/organizer/profile/edit" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
        Edytuj profil
      </Button>
    </Stack>
  );
}
