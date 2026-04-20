import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchEvents } from '../api/events';
import { getApiBaseUrl } from '../api/client';
import { getUiErrorMessage } from '../services/api.js';
import EventCard from '../components/events/EventCard';
import EventFilters from '../components/events/EventFilters.jsx';
import EventGridSkeleton from '../components/events/EventGridSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import { emptyFilters } from '../components/events/eventFiltersDefaults.js';
import { DEFAULT_MAP_FALLBACK_CITY, GEOLOCATION_GET_OPTIONS } from '../constants/mapDefaults.js';
import { eventMatchesAnySelectedCategory } from '../utils/eventCategories.js';
import { shouldHideEventFromMainList } from '../utils/eventListing.js';
import '../components/events/events.css';

async function resolveCityFromCoordinates(latitude, longitude) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('accept-language', 'pl');

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.status}`);
  }

  const data = await response.json();
  const address = data?.address ?? {};
  const city = address.city ?? address.town ?? address.village ?? address.municipality ?? '';
  return String(city).trim();
}

function timeToMinutes(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hh, mm] = value.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

export default function EventsPage() {
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [retryKey, setRetryKey] = useState(0);
  const didInitDefaultCity = useRef(false);
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });

  const requestParams = useMemo(() => {
    const categoryList = Array.isArray(appliedFilters.category)
      ? appliedFilters.category.map((x) => String(x).trim()).filter(Boolean)
      : [];
    return {
      limit: 24,
      search: appliedFilters.search.trim() || undefined,
      category: categoryList.length === 1 ? categoryList[0] : undefined,
      categories: categoryList.length > 1 ? categoryList : undefined,
      city: appliedFilters.city.trim() || undefined,
      address: appliedFilters.address.trim() || undefined,
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

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const clearFilters = useCallback(() => {
    setDraftFilters({ ...emptyFilters, category: [] });
    setAppliedFilters({ ...emptyFilters, category: [] });
  }, []);

  useEffect(() => {
    if (didInitDefaultCity.current) return;
    didInitDefaultCity.current = true;

    const applyCity = (city) => {
      setDraftFilters((prev) => ({ ...prev, city }));
      setAppliedFilters((prev) => ({ ...prev, city }));
    };

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      applyCity(DEFAULT_MAP_FALLBACK_CITY);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const city = await resolveCityFromCoordinates(position.coords.latitude, position.coords.longitude);
          applyCity(city || DEFAULT_MAP_FALLBACK_CITY);
        } catch {
          applyCity(DEFAULT_MAP_FALLBACK_CITY);
        }
      },
      () => {
        applyCity(DEFAULT_MAP_FALLBACK_CITY);
      },
      GEOLOCATION_GET_OPTIONS,
    );
  }, []);

  if (state.loading) {
    return (
      <>
        <header className="mm-page-header">
          <h1 className="mm-page-title">Wydarzenia</h1>
        </header>
        <EventFilters
          values={draftFilters}
          onChange={setDraftFilters}
          onSubmit={applyFilters}
          onClear={clearFilters}
          submitDisabled={state.loading}
        />
        <EventGridSkeleton count={6} />
      </>
    );
  }

  if (state.error) {
    return (
      <>
        <header className="mm-page-header">
          <h1 className="mm-page-title">Wydarzenia</h1>
        </header>
        <EventFilters
          values={draftFilters}
          onChange={setDraftFilters}
          onSubmit={applyFilters}
          onClear={clearFilters}
          submitDisabled={false}
        />
        <ErrorState
          title="Błąd ładowania danych"
          message={state.error}
          hint={`Sprawdź, czy backend jest uruchomiony (${getApiBaseUrl()}).`}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </>
    );
  }

  const events = (state.data?.events ?? []).filter((ev) => !shouldHideEventFromMainList(ev));
  const fromMinutes = timeToMinutes(appliedFilters.fromTime?.trim());
  const toMinutes = timeToMinutes(appliedFilters.toTime?.trim());
  const selectedCategories = Array.isArray(appliedFilters.category)
    ? appliedFilters.category.map((x) => String(x).trim().toLowerCase()).filter(Boolean)
    : [];
  const filteredEvents =
    fromMinutes == null && toMinutes == null && selectedCategories.length === 0
      ? events
      : events.filter((ev) => {
          if (selectedCategories.length > 0) {
            if (!eventMatchesAnySelectedCategory(ev, selectedCategories)) return false;
          }
          const d = new Date(ev?.date);
          if (Number.isNaN(d.getTime())) return false;
          const minutes = d.getHours() * 60 + d.getMinutes();
          if (fromMinutes != null && minutes < fromMinutes) return false;
          if (toMinutes != null && minutes > toMinutes) return false;
          return true;
        });
  const total = state.data?.pagination?.total;
  const hasActiveFilters = Object.values(appliedFilters).some((v) =>
    Array.isArray(v) ? v.length > 0 : String(v).trim(),
  );

  return (
    <>
      <header className="mm-page-header">
        <h1 className="mm-page-title">Wydarzenia</h1>
        {total != null && filteredEvents.length > 0 ? (
          <p className="mm-page-sub">
            Znaleziono: <strong>{filteredEvents.length}</strong>
            {hasActiveFilters ? ' — zastosowano filtry' : ''}
          </p>
        ) : null}
      </header>
      <EventFilters
        values={draftFilters}
        onChange={setDraftFilters}
        onSubmit={applyFilters}
        onClear={clearFilters}
        submitDisabled={false}
      />
      {filteredEvents.length === 0 ? (
        <div className="mm-empty-state">Brak wydarzeń</div>
      ) : (
        <div className="mm-event-grid">
          {filteredEvents.map((ev) => (
            <EventCard key={ev._id || ev.id} event={ev} />
          ))}
        </div>
      )}
    </>
  );
}
