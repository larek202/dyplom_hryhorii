import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { fetchFavorites, removeFavorite } from '../api/favorites.js';
import { getApiBaseUrl } from '../api/client';
import { getUiErrorMessage } from '../services/api.js';
import EventCard from '../components/events/EventCard';
import EventGridSkeleton from '../components/events/EventGridSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import '../components/events/events.css';

export default function FavoritesPage() {
  const [retryKey, setRetryKey] = useState(0);
  const [removingId, setRemovingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [state, setState] = useState({
    loading: true,
    error: null,
    events: null,
  });

  const handleRemoveFromFavorites = useCallback(async (eventId) => {
    const ok = window.confirm('Czy na pewno chcesz usunąć to wydarzenie z ulubionych?');
    if (!ok) return;
    setActionError('');
    setRemovingId(eventId);
    try {
      const data = await removeFavorite(eventId);
      if (Array.isArray(data?.events)) {
        setState((s) => ({ ...s, events: data.events }));
      } else {
        setState((s) => ({
          ...s,
          events: (s.events ?? []).filter((ev) => String(ev._id || ev.id) !== eventId),
        }));
      }
    } catch (e) {
      setActionError(getUiErrorMessage(e));
    } finally {
      setRemovingId(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const data = await fetchFavorites();
        const events = Array.isArray(data?.events) ? data.events : [];
        if (!cancelled) setState({ loading: false, error: null, events });
      } catch (e) {
        if (!cancelled) {
          setState({ loading: false, error: getUiErrorMessage(e), events: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  if (state.loading) {
    return (
      <>
        <header className="mm-page-header">
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 0 }}>
              
              <h1 className="mm-page-title" style={{ margin: 0 }}>
                Ulubione
              </h1>
              
            </Stack>
            <Typography className="mm-page-sub">Twoje zapisane wydarzenia.</Typography>
          </Stack>
        </header>
        <EventGridSkeleton count={6} />
      </>
    );
  }

  if (state.error) {
    return (
      <>
        <header className="mm-page-header">
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 0 }}>
              
              <h1 className="mm-page-title" style={{ margin: 0 }}>
                Ulubione
              </h1>
              
            </Stack>
            <Typography className="mm-page-sub">Twoje zapisane wydarzenia.</Typography>
          </Stack>
        </header>
        <ErrorState
          title="Błąd ładowania danych"
          message={state.error}
          hint={`Sprawdź, czy backend jest uruchomiony (${getApiBaseUrl()}).`}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </>
    );
  }

  const events = state.events ?? [];
  const count = events.length;

  return (
    <>
      <header className="mm-page-header">
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 0 }}>
            <h1 className="mm-page-title" style={{ margin: 0 }}>
              Ulubione ({count})
            </h1>
            </Stack>
          <Typography className="mm-page-sub">Twoje zapisane wydarzenia.</Typography>
        </Stack>
      </header>
      {actionError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      ) : null}
      {events.length === 0 ? (
        <Box className="mm-empty-state">
          <Typography variant="h6" component="p" sx={{ mb: 1 }}>
            Nie masz jeszcze ulubionych wydarzeń
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Przeglądaj wydarzenia i oznaczaj te, które chcesz mieć pod ręką.
          </Typography>
          <Button component={RouterLink} to="/events" variant="contained" color="primary">
            Przejdź do wydarzeń
          </Button>
        </Box>
      ) : (
        <div className="mm-event-grid">
          {events.map((ev) => {
            const eid = String(ev._id || ev.id || '');
            return (
              <EventCard
                key={eid}
                event={ev}
                onRemoveFromFavorites={handleRemoveFromFavorites}
                removeFavoriteBusy={removingId === eid}
                favoriteBadge
              />
            );
          })}
        </div>
      )}
    </>
  );
}
