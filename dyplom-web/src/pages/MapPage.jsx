import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fetchEvents } from '../api/events.js';
import { getApiBaseUrl } from '../api/client';
import ErrorState from '../components/feedback/ErrorState';
import PageSkeleton from '../components/feedback/PageSkeleton.jsx';
import EventsMapPanel from '../components/map/EventsMapPanel.jsx';
import MapEventListCard from '../components/map/MapEventListCard.jsx';
import MapEventsFilters from '../components/map/MapEventsFilters.jsx';
import { getUiErrorMessage } from '../services/api.js';
import { shouldHideEventFromMainList } from '../utils/eventListing.js';
import '../components/events/events.css';

const DESKTOP_PANEL_HEIGHT = 620;

const GOOGLE_MAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const EMPTY_MAP_FILTERS = { city: '', category: [], date: '' };

function buildMapQuery(events) {
  if (!events?.length) return '';
  const withCoords = events.find(
    (e) =>
      e.location != null &&
      typeof e.location.latitude === 'number' &&
      typeof e.location.longitude === 'number' &&
      !Number.isNaN(e.location.latitude) &&
      !Number.isNaN(e.location.longitude),
  );
  if (withCoords) {
    return `${withCoords.location.latitude},${withCoords.location.longitude}`;
  }
  const cities = [...new Set(events.map((e) => (e.city || '').trim()).filter(Boolean))];
  if (cities.length) return cities.join(' ');
  return '';
}

export default function MapPage() {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });
  const [draftFilters, setDraftFilters] = useState(EMPTY_MAP_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_MAP_FILTERS);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [focusRequest, setFocusRequest] = useState({ id: null, nonce: 0 });
  const listItemRefs = useRef(/** @type {Map<string, HTMLElement | null>} */ (new Map()));

  const requestParams = useMemo(() => {
    const categoryList = Array.isArray(appliedFilters.category)
      ? appliedFilters.category.map((x) => String(x).trim()).filter(Boolean)
      : [];
    return {
      limit: 100,
      city: appliedFilters.city.trim() || undefined,
      category: categoryList.length === 1 ? categoryList[0] : undefined,
      categories: categoryList.length > 1 ? categoryList : undefined,
      date: appliedFilters.date.trim() || undefined,
    };
  }, [appliedFilters]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const data = await fetchEvents(requestParams);
        if (!cancelled) setState({ loading: false, error: null, data });
      } catch (e) {
        if (!cancelled) {
          setState({ loading: false, error: getUiErrorMessage(e), data: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestParams, retryKey]);

  const rawEvents = useMemo(() => {
    const list = Array.isArray(state.data?.events) ? state.data.events : [];
    return list.filter((ev) => !shouldHideEventFromMainList(ev));
  }, [state.data]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const clearFilters = useCallback(() => {
    setDraftFilters({ ...EMPTY_MAP_FILTERS });
    setAppliedFilters({ ...EMPTY_MAP_FILTERS });
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    const ids = new Set(rawEvents.map((e) => String(e._id || e.id)));
    if (!ids.has(selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [rawEvents, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    const el = listItemRefs.current.get(selectedEventId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedEventId]);

  const handleMarkerSelect = useCallback((id) => {
    setSelectedEventId(String(id));
  }, []);

  const handleCardSelect = useCallback((id) => {
    const sid = String(id);
    setSelectedEventId(sid);
    setFocusRequest((r) => ({ id: sid, nonce: r.nonce + 1 }));
  }, []);

  const mapQuery = useMemo(() => (rawEvents.length ? buildMapQuery(rawEvents) : ''), [rawEvents]);

  const embedUrl = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&hl=pl&z=11&output=embed`
    : '';
  const openGoogleMapsUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`
    : 'https://www.google.com/maps/';

  const hasEmbedFallback = Boolean(embedUrl);
  const count = rawEvents.length;
  const hasFilterApplied =
    appliedFilters.city.trim() ||
    (Array.isArray(appliedFilters.category) && appliedFilters.category.length > 0) ||
    appliedFilters.date.trim();

  if (state.loading) {
    return (
      <Stack spacing={3} sx={{ maxWidth: 1280, mx: 'auto', pb: 2, width: '100%', minWidth: 0 }}>
        <Box component="header">
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
            Mapa wydarzeń
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Ładowanie wydarzeń… skrypt mapy ładuje się równolegle.
          </Typography>
        </Box>
        <MapEventsFilters
          values={draftFilters}
          onChange={setDraftFilters}
          onSubmit={applyFilters}
          onClear={clearFilters}
          disabled
        />
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2.5, lg: 3 },
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 13fr) minmax(300px, 7fr)' },
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: { xs: 320, sm: 420, lg: DESKTOP_PANEL_HEIGHT },
              minHeight: { xs: 280, sm: 380 },
              borderRadius: 3,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
              boxShadow: (t) => `0 4px 24px ${alpha(t.palette.common.black, 0.06)}`,
              bgcolor: 'background.paper',
              position: 'relative',
            }}
          >
            {GOOGLE_MAP_KEY ? (
              <EventsMapPanel
                events={[]}
                selectedEventId={null}
                onMarkerSelect={() => {}}
                focusRequest={{ id: null, nonce: 0 }}
              />
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', minHeight: { xs: 280, sm: 380 }, gap: 1.5 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary">
                  Ładowanie mapy…
                </Typography>
              </Stack>
            )}
          </Box>
          <Stack spacing={2} sx={{ height: { lg: DESKTOP_PANEL_HEIGHT }, minHeight: 0 }}>
            <PageSkeleton showTitle={false} tableHeight={56} />
            <PageSkeleton showTitle={false} tableHeight={420} />
          </Stack>
        </Box>
      </Stack>
    );
  }

  if (state.error || state.data === null) {
    return (
      <Stack spacing={2.5} sx={{ maxWidth: 1280, mx: 'auto' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
            Mapa wydarzeń
          </Typography>
        </Box>
        <ErrorState
          title="Błąd ładowania danych"
          message={state.error || 'Coś poszło nie tak'}
          hint={`Sprawdź, czy backend jest uruchomiony (${getApiBaseUrl()}).`}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1280, mx: 'auto', pb: 2, width: '100%', minWidth: 0 }}>
      <Box component="header">
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, letterSpacing: '-0.03em', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}
        >
          Mapa wydarzeń
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mt: 1.25, maxWidth: 640, lineHeight: 1.65, fontSize: { xs: '0.9375rem', sm: '1rem' } }}
        >
          Przeglądaj wydarzenia na mapie i na liście obok. Kliknij pinezkę, aby podświetlić kartę — kliknij kartę, aby
          wyśrodkować mapę na wydarzeniu.
        </Typography>
      </Box>

      <MapEventsFilters
        values={draftFilters}
        onChange={setDraftFilters}
        onSubmit={applyFilters}
        onClear={clearFilters}
      />

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2.5, lg: 3 },
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 13fr) minmax(300px, 7fr)' },
          alignItems: 'stretch',
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: { xs: 320, sm: 420, lg: DESKTOP_PANEL_HEIGHT },
            minHeight: { xs: 280, sm: 380 },
            borderRadius: 3,
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            boxShadow: (t) => `0 4px 24px ${alpha(t.palette.common.black, 0.06)}`,
            bgcolor: 'background.paper',
          }}
        >
          {GOOGLE_MAP_KEY ? (
            <EventsMapPanel
              events={rawEvents}
              selectedEventId={selectedEventId}
              onMarkerSelect={handleMarkerSelect}
              focusRequest={focusRequest}
            />
          ) : hasEmbedFallback ? (
            <Box
              component="iframe"
              title="Mapa wydarzeń"
              src={embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              sx={{
                width: '100%',
                height: '100%',
                border: 0,
                display: 'block',
                minHeight: { xs: 280, sm: 380 },
              }}
            />
          ) : (
            <Stack spacing={2} alignItems="flex-start" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Nie można wyświetlić mapy — brak klucza Google Maps lub lokalizacji przy wydarzeniach.
              </Typography>
              <Button href={openGoogleMapsUrl} target="_blank" rel="noopener noreferrer" variant="contained">
                Otwórz w Google Maps
              </Button>
            </Stack>
          )}
        </Box>

        <Stack
          spacing={2}
          sx={{
            height: { lg: DESKTOP_PANEL_HEIGHT },
            minHeight: 0,
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.12em' }}>
              Lista wydarzeń
            </Typography>
            <Stack direction="row" alignItems="baseline" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
              <Typography variant="h6" component="h2" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                Wydarzenia w widoku
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                (
                {count}{' '}
                {count === 1
                  ? 'pozycja'
                  : count % 10 >= 2 &&
                      count % 10 <= 4 &&
                      (count % 100 < 10 || count % 100 >= 20)
                    ? 'pozycje'
                    : 'pozycji'}
                )
              </Typography>
            </Stack>
            {hasFilterApplied ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Uwzględniono filtry — wyniki z API są już przefiltrowane.
              </Typography>
            ) : null}
          </Box>

          {count === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                bgcolor: (t) => alpha(t.palette.grey[50], 0.8),
              }}
            >
              <MapOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                Brak wydarzeń do pokazania
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                {hasFilterApplied
                  ? 'Spróbuj zmienić filtry lub wyczyścić je, aby zobaczyć więcej wyników.'
                  : 'Obecnie nie ma aktywnych wydarzeń spełniających kryteria (np. zakończone wcześniej niż 12 h temu są ukryte).'}
              </Typography>
              {hasFilterApplied ? (
                <Button variant="outlined" onClick={clearFilters} sx={{ fontWeight: 700 }}>
                  Wyczyść filtry
                </Button>
              ) : (
                <Button component={RouterLink} to="/events" variant="contained" sx={{ fontWeight: 700 }}>
                  Przejdź do listy wydarzeń
                </Button>
              )}
            </Paper>
          ) : (
            <Box
              sx={{
                flex: { lg: 1 },
                minHeight: 0,
                maxHeight: { xs: 'min(52vh, 440px)', sm: 'min(48vh, 480px)', lg: 'none' },
                overflowY: 'auto',
                overflowX: 'hidden',
                pr: { lg: 0.5 },
                mr: { lg: -0.5 },
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <Stack spacing={1.25}>
                {rawEvents.map((event) => {
                  const id = String(event._id || event.id);
                  const selected = selectedEventId === id;
                  return (
                    <Box
                      key={id}
                      ref={(el) => {
                        if (el) listItemRefs.current.set(id, el);
                        else listItemRefs.current.delete(id);
                      }}
                    >
                      <MapEventListCard
                        event={event}
                        selected={selected}
                        onSelect={() => handleCardSelect(id)}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
