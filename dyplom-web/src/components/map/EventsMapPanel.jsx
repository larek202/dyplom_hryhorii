import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, IconButton, Snackbar, Typography } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_PLACES_SCRIPT_ID } from '../events/googleMapsLoaderId.js';
import { buildGoogleMapsSearchQuery } from '../../utils/eventAddress.js';
import { GDANSK_CENTER, GEOLOCATION_GET_OPTIONS } from '../../constants/mapDefaults.js';
import { delay, nominatimForwardGeocode } from '../../utils/nominatimGeocode.js';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MAP_OPTIONS = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
};

const NOMINATIM_MAX_UNIQUE = 28;
const NOMINATIM_GAP_MS = 1100;

/** @typedef {'pending' | 'granted' | 'denied'} UserGeoState */

function hasDbCoords(event) {
  const loc = event?.location;
  if (!loc) return false;
  const { latitude: lat, longitude: lng } = loc;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  );
}

function eventMarkerKey(event) {
  return String(event?._id ?? event?.id ?? '');
}

function EventsMapPanelGoogle({ events, selectedEventId = null, onMarkerSelect, focusRequest }) {
  const mapRef = useRef(/** @type {google.maps.Map | null} */ (null));
  const hasPannedGrantedInitialRef = useRef(false);
  const [mapBootstrap, setMapBootstrap] = useState(0);
  const [userGeo, setUserGeo] = useState(/** @type {UserGeoState} */ ('pending'));
  const [userCoords, setUserCoords] = useState(/** @type {{ lat: number; lng: number } | null} */ (null));
  const [myLocBusy, setMyLocBusy] = useState(false);
  const [geoSnackbar, setGeoSnackbar] = useState(/** @type {{ open: boolean; message: string }} */ ({
    open: false,
    message: '',
  }));

  const [geocodeByEventId, setGeocodeByEventId] = useState(() => new Map());
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNote, setGeoNote] = useState('');

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_PLACES_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_KEY,
    libraries: ['places'],
    language: 'pl',
    region: 'PL',
  });

  const markers = useMemo(() => {
    const list = [];
    for (const ev of events || []) {
      const id = eventMarkerKey(ev);
      if (!id) continue;

      if (hasDbCoords(ev)) {
        list.push({
          id,
          event: ev,
          lat: ev.location.latitude,
          lng: ev.location.longitude,
        });
        continue;
      }

      const g = geocodeByEventId.get(id);
      if (g) {
        list.push({
          id,
          event: ev,
          lat: g.lat,
          lng: g.lng,
        });
      }
    }
    return list;
  }, [events, geocodeByEventId]);

  useEffect(() => {
    if (!isLoaded || loadError) return;

    if (!navigator.geolocation) {
      setUserCoords(null);
      setUserGeo('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUserGeo('granted');
      },
      () => {
        setUserCoords(null);
        setUserGeo('denied');
      },
      GEOLOCATION_GET_OPTIONS,
    );
  }, [isLoaded, loadError]);

  useEffect(() => {
    if (!events?.length) {
      setGeocodeByEventId(new Map());
      setGeoNote('');
      return;
    }

    const need = events.filter((ev) => !hasDbCoords(ev));
    if (!need.length) {
      setGeocodeByEventId(new Map());
      setGeoNote('');
      return;
    }

    /** @type {Map<string, string[]>} */
    const queryToIds = new Map();
    for (const ev of need) {
      const q = buildGoogleMapsSearchQuery(ev);
      if (!q) continue;
      const id = eventMarkerKey(ev);
      if (!id) continue;
      const arr = queryToIds.get(q) ?? [];
      arr.push(id);
      queryToIds.set(q, arr);
    }

    const uniqueQueries = [...queryToIds.keys()];
    if (!uniqueQueries.length) {
      setGeocodeByEventId(new Map());
      setGeoNote('');
      return;
    }

    let cancelled = false;
    const toRun = uniqueQueries.slice(0, NOMINATIM_MAX_UNIQUE);

    (async () => {
      setGeoLoading(true);
      setGeoNote('');
      const next = new Map();
      let failed = 0;

      try {
        for (let i = 0; i < toRun.length; i += 1) {
          if (cancelled) return;
          const q = toRun[i];
          if (i > 0) await delay(NOMINATIM_GAP_MS);
          if (cancelled) return;
          try {
            const pt = await nominatimForwardGeocode(q);
            if (!pt) {
              failed += 1;
              continue;
            }
            const ids = queryToIds.get(q) ?? [];
            for (const eid of ids) {
              next.set(eid, { lat: pt.lat, lng: pt.lng });
            }
          } catch {
            failed += 1;
          }
        }

        if (cancelled) return;
        setGeocodeByEventId(next);
        const parts = [];
        if (uniqueQueries.length > NOMINATIM_MAX_UNIQUE) {
          parts.push(
            `Wyznaczono pozycję tylko dla ${NOMINATIM_MAX_UNIQUE} pierwszych unikalnych adresów (limit żądań do serwisu OSM).`,
          );
        }
        if (failed > 0) {
          parts.push('Część adresów nie została znaleziona.');
        }
        setGeoNote(parts.join(' '));
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [events]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapBootstrap((n) => n + 1);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || userGeo === 'pending') return;

    if (userGeo === 'granted' && userCoords) {
      if (!hasPannedGrantedInitialRef.current) {
        map.panTo(userCoords);
        map.setZoom(11);
        hasPannedGrantedInitialRef.current = true;
      }
      return;
    }

    if (userGeo === 'denied') {
      if (markers.length >= 2) {
        const bounds = new window.google.maps.LatLngBounds();
        markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
        map.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 });
      } else if (markers.length === 1) {
        map.panTo({ lat: markers[0].lat, lng: markers[0].lng });
        map.setZoom(15);
      } else {
        map.panTo(GDANSK_CENTER);
        map.setZoom(11);
      }
    }
  }, [userGeo, userCoords, markers, mapBootstrap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest?.id || !focusRequest.nonce) return;
    const m = markers.find((x) => x.id === focusRequest.id);
    if (!m) return;
    map.panTo({ lat: m.lat, lng: m.lng });
    const z = map.getZoom();
    if (z != null && z < 14) map.setZoom(14);
  }, [focusRequest?.id, focusRequest?.nonce, markers]);

  const handleMyLocationClick = useCallback(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    if (userGeo === 'granted' && userCoords) {
      map.panTo(userCoords);
      map.setZoom(11);
      return;
    }

    if (!navigator.geolocation) {
      setGeoSnackbar({
        open: true,
        message:
          'Ta przeglądarka nie udostępnia geolokalizacji. Włącz ją lub użyj innej przeglądarki, aby wyśrodkować mapę na swojej okolicy.',
      });
      return;
    }

    setMyLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(c);
        setUserGeo('granted');
        hasPannedGrantedInitialRef.current = true;
        map.panTo(c);
        map.setZoom(11);
        setMyLocBusy(false);
        setGeoSnackbar({ open: false, message: '' });
      },
      (err) => {
        setMyLocBusy(false);
        const code = err && 'code' in err ? err.code : 0;
        let message =
          'Nie udało się pobrać lokalizacji. W ustawieniach przeglądarki zezwól na dostęp do lokalizacji dla tej strony i spróbuj ponownie.';
        if (code === 1) {
          message =
            'Lokalizacja jest wyłączona. Kliknij ikonę kłódki lub informacji przy pasku adresu, włącz uprawnienie „Lokalizacja” dla tej witryny i naciśnij przycisk ponownie.';
        } else if (code === 2) {
          message = 'Nie udało się ustalić pozycji (np. słaby sygnał). Spróbuj ponownie za chwilę.';
        } else if (code === 3) {
          message = 'Przekroczono czas oczekiwania na lokalizację. Sprawdź połączenie i spróbuj ponownie.';
        }
        setGeoSnackbar({ open: true, message });
      },
      GEOLOCATION_GET_OPTIONS,
    );
  }, [userGeo, userCoords, isLoaded]);

  if (loadError || !isLoaded) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 1.5 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          Ładowanie mapy…
        </Typography>
      </Box>
    );
  }

  const myLocationTooltip =
    userGeo === 'granted' && userCoords
      ? 'Przejdź do mojej lokalizacji'
      : 'Pozwól na lokalizację albo ponów prośbę (centruje mapę na Twoją okolicę)';

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: { xs: 280, sm: 380 } }}>
      {geoLoading ? (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            px: 1,
            py: 0.5,
            boxShadow: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CircularProgress size={18} />
          <Typography variant="caption" color="text.secondary">
            Ustalanie punktów adresów…
          </Typography>
        </Box>
      ) : null}

      {geoNote ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            right: 8,
            zIndex: 2,
            bgcolor: 'rgba(255,255,255,0.92)',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            maxWidth: 'min(100%, 480px)',
          }}
        >
          {geoNote}
        </Typography>
      ) : null}

      <IconButton
        type="button"
        color="primary"
        onClick={handleMyLocationClick}
        disabled={myLocBusy}
        aria-label={myLocationTooltip}
        title={myLocationTooltip}
        sx={{
          position: 'absolute',
          top: geoLoading ? 56 : 8,
          left: 8,
          zIndex: 3,
          bgcolor: 'background.paper',
          boxShadow: 2,
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        {myLocBusy ? <CircularProgress size={22} color="inherit" /> : <MyLocationIcon />}
      </IconButton>

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={GDANSK_CENTER}
        zoom={10}
        onLoad={onMapLoad}
        options={MAP_OPTIONS}
      >
        {markers.map((m) => {
          const title = String(m.event.title || '').trim() || 'Wydarzenie';
          const selected = selectedEventId != null && String(selectedEventId) === String(m.id);
          const icon =
            typeof window !== 'undefined' && window.google?.maps?.SymbolPath
              ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: selected ? '#c62828' : '#1565c0',
                  fillOpacity: 1,
                  strokeWeight: 0,
                  scale: selected ? 15 : 12,
                }
              : undefined;
          return (
            <Marker
              key={m.id}
              position={{ lat: m.lat, lng: m.lng }}
              title={title}
              icon={icon}
              zIndex={selected ? 1000 : 10}
              onClick={() => onMarkerSelect?.(String(m.id))}
            />
          );
        })}
      </GoogleMap>

      {markers.length === 0 && !geoLoading ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            bgcolor: 'rgba(248,250,252,0.75)',
            zIndex: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, textAlign: 'center' }}>
            Brak punktów do wyświetlenia — uzupełnij adresy wydarzeń lub współrzędne przy zapisie.
          </Typography>
        </Box>
      ) : null}

      <Snackbar
        open={geoSnackbar.open}
        autoHideDuration={10000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setGeoSnackbar((s) => ({ ...s, open: false }));
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setGeoSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%', maxWidth: { xs: '100%', sm: 480 }, alignItems: 'center' }}
        >
          {geoSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/**
 * @param {{
 *   events: object[];
 *   selectedEventId?: string | null;
 *   onMarkerSelect?: (eventId: string) => void;
 *   focusRequest?: { id: string | null; nonce: number };
 * }} props
 */
export default function EventsMapPanel({
  events,
  selectedEventId = null,
  onMarkerSelect,
  focusRequest = { id: null, nonce: 0 },
}) {
  if (!GOOGLE_KEY) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
        Ustaw <code>VITE_GOOGLE_MAPS_API_KEY</code>, aby wyświetlić mapę z pinezkami.
      </Typography>
    );
  }
  return (
    <EventsMapPanelGoogle
      events={events}
      selectedEventId={selectedEventId}
      onMarkerSelect={onMarkerSelect}
      focusRequest={focusRequest}
    />
  );
}
