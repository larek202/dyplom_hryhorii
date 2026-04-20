import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import { Alert, Box, Paper, Stack, Typography, useMediaQuery } from '@mui/material';
import { fetchBookingsForOrganizer } from '../api/bookings.js';
import { deleteEvent, fetchEvents } from '../api/events.js';
import { fetchLikeCountsForOrganizer } from '../api/likes.js';
import { getApiBaseUrl } from '../api/client';
import ErrorState from '../components/feedback/ErrorState';
import PageLoader from '../components/feedback/PageLoader.jsx';
import PageSkeleton from '../components/feedback/PageSkeleton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getUiErrorMessage } from '../services/api.js';
import { Button, Modal, Table } from '../ui';
import '../components/events/events.css';

function formatEventDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price) {
  if (price == null || Number(price) === 0) return 'Bezpłatnie';
  return `${Number(price).toLocaleString('pl-PL')} zł`;
}

export default function OrganizerPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, loading: authLoading } = useAuth();
  const [retryKey, setRetryKey] = useState(0);
  const [events, setEvents] = useState(null);
  const [organizerBookings, setOrganizerBookings] = useState([]);
  const [likeCounts, setLikeCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const organizerId = user ? String(user.id ?? user._id ?? '') : '';

  useEffect(() => {
    if (!organizerId) {
      setLoading(false);
      setEvents([]);
      setOrganizerBookings([]);
      setLikeCounts({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    (async () => {
      try {
        const [eventsData, bookingsData, likesData] = await Promise.all([
          fetchEvents({ organizerId, limit: 100 }),
          fetchBookingsForOrganizer(organizerId),
          fetchLikeCountsForOrganizer(),
        ]);
        const list = Array.isArray(eventsData?.events) ? eventsData.events : [];
        const bookings = Array.isArray(bookingsData?.bookings) ? bookingsData.bookings : [];
        const counts =
          likesData?.counts && typeof likesData.counts === 'object' ? likesData.counts : {};
        if (!cancelled) {
          setEvents(list);
          setOrganizerBookings(bookings);
          setLikeCounts(counts);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(getUiErrorMessage(e));
          setEvents(null);
          setOrganizerBookings([]);
          setLikeCounts({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizerId, retryKey]);

  const bookingCountByEventId = useMemo(() => {
    const m = {};
    organizerBookings.forEach((b) => {
      const ev = b.eventId;
      const raw = ev?._id ?? ev ?? b.eventId;
      if (!raw) return;
      const k = String(raw);
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [organizerBookings]);

  const openDeleteModal = useCallback((row) => {
    setActionError('');
    setEventToDelete({
      eventId: String(row.eventId),
      title: row.title || 'to wydarzenie',
      date: row.date || '—',
    });
    setDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback((force = false) => {
    if (deleteBusy && !force) return;
    setDeleteModalOpen(false);
    setEventToDelete(null);
  }, [deleteBusy]);

  const columns = useMemo(
    () => [
      { field: 'title', headerName: 'Tytuł' },
      { field: 'date', headerName: 'Data' },
      { field: 'city', headerName: 'Miasto' },
      { field: 'price', headerName: 'Cena' },
      { field: 'bookings', headerName: 'Rezerwacje', align: 'right' },
      { field: 'favorites', headerName: 'Ulubione', align: 'right' },
      {
        field: 'actions',
        headerName: 'Akcje',
        align: 'right',
        renderCell: (row) => (
          <Stack direction="row" spacing={0.75} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            <Button
              component={RouterLink}
              to={`/organizer/events/${row.eventId}/edit`}
              size="small"
              variant="contained"
            >
              Edytuj
            </Button>
            <Button component={RouterLink} to={`/events/${row.eventId}`} size="small" variant="outlined">
              Szczegóły
            </Button>
            <Button size="small" color="error" variant="outlined" onClick={() => openDeleteModal(row)}>
              Usuń
            </Button>
          </Stack>
        ),
      },
    ],
    [openDeleteModal],
  );

  const totalLikes = useMemo(
    () => Object.values(likeCounts).reduce((sum, n) => sum + (Number(n) || 0), 0),
    [likeCounts],
  );

  const rows = useMemo(() => {
    if (!events) return [];
    return events.map((ev) => {
      const id = ev._id || ev.id;
      const idStr = String(id);
      return {
        id,
        eventId: id,
        title: (ev.title || '').trim() || '—',
        date: formatEventDate(ev.date),
        city: (ev.city || '').trim() || '—',
        price: formatPrice(ev.price),
        bookings: bookingCountByEventId[idStr] ?? 0,
        favorites: likeCounts[idStr] ?? 0,
      };
    });
  }, [events, bookingCountByEventId, likeCounts]);

  async function confirmDeleteEvent() {
    if (!eventToDelete?.eventId) return;
    setDeleteBusy(true);
    setActionError('');
    try {
      await deleteEvent(eventToDelete.eventId);
      setEvents((prev) => (Array.isArray(prev) ? prev.filter((ev) => String(ev._id || ev.id) !== eventToDelete.eventId) : prev));
      setOrganizerBookings((prev) => prev.filter((b) => String(b.eventId?._id ?? b.eventId ?? '') !== eventToDelete.eventId));
      setLikeCounts((prev) => {
        const copy = { ...(prev || {}) };
        delete copy[eventToDelete.eventId];
        return copy;
      });
      closeDeleteModal(true);
    } catch (e) {
      setActionError(getUiErrorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  }

  if (authLoading) {
    return <PageLoader label="Ładowanie panelu" />;
  }

  if (!organizerId) {
    return (
      <Stack spacing={2}>
        <header className="mm-page-header">
          <h1 className="mm-page-title">Panel organizatora</h1>
        </header>
        <p className="muted">Nie udało się ustalić konta organizatora. Zaloguj się ponownie.</p>
      </Stack>
    );
  }

  if (loading) {
    return (
      <>
        <header className="mm-page-header">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'flex-start' }}
            spacing={2}
          >
            <h1 className="mm-page-title" style={{ margin: 0 }}>
              Panel organizatora
            </h1>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ flexShrink: 0, alignItems: { xs: 'stretch', sm: 'stretch' }, width: { xs: '100%', sm: 'auto' } }}
            >
              <Button component={RouterLink} to="/organizer/profile" variant="outlined" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                Profil organizacji
              </Button>
              <Button component={RouterLink} to="/organizer/profile/edit" variant="outlined" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                Edytuj profil
              </Button>
              <Button component={RouterLink} to="/organizer/events/create" variant="contained" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                Dodaj wydarzenie
              </Button>
            </Stack>
          </Stack>
        </header>
        <PageSkeleton showTitle={false} tableHeight={240} />
      </>
    );
  }

  if (loadError || events === null) {
    return (
      <>
        <header className="mm-page-header">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'flex-start' }}
            spacing={2}
          >
            <h1 className="mm-page-title" style={{ margin: 0 }}>
              Panel organizatora
            </h1>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ flexShrink: 0, alignItems: { xs: 'stretch', sm: 'stretch' }, width: { xs: '100%', sm: 'auto' } }}
            >
              <Button component={RouterLink} to="/organizer/profile" variant="outlined" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                Profil organizacji
              </Button>
              <Button component={RouterLink} to="/organizer/profile/edit" variant="outlined" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                Edytuj profil
              </Button>
              <Button component={RouterLink} to="/organizer/events/create" variant="contained" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                Dodaj wydarzenie
              </Button>
            </Stack>
          </Stack>
        </header>
        <ErrorState
          title="Błąd ładowania danych"
          message={loadError || 'Coś poszło nie tak'}
          hint={`Sprawdź, czy backend jest uruchomiony (${getApiBaseUrl()}).`}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </>
    );
  }

  return (
    <Stack spacing={2.5}>
      <header className="mm-page-header">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ sm: 'flex-start' }}
          spacing={2}
        >
          <h1 className="mm-page-title" style={{ margin: 0 }}>
            Panel organizatora
          </h1>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ flexShrink: 0, alignItems: { xs: 'stretch', sm: 'stretch' }, width: { xs: '100%', sm: 'auto' } }}
          >
            <Button component={RouterLink} to="/organizer/profile" variant="outlined" sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Profil organizacji
            </Button>
            <Button component={RouterLink} to="/organizer/profile/edit" variant="outlined" sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Edytuj profil
            </Button>
            <Button component={RouterLink} to="/organizer/events/create" variant="contained" sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Dodaj wydarzenie
            </Button>
          </Stack>
        </Stack>
      </header>

      {actionError ? <Alert severity="error">{actionError}</Alert> : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }}>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            p: 2.25,
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: (t) => t.shadows[1],
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="-0.01em">
            Wydarzenia
          </Typography>
          <Typography variant="h4" component="p" sx={{ m: 0, mt: 0.5, fontWeight: 700, letterSpacing: '-0.03em' }}>
            {events.length}
          </Typography>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            p: 2.25,
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: (t) => t.shadows[1],
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="-0.01em">
            Rezerwacje
          </Typography>
          <Typography variant="h4" component="p" sx={{ m: 0, mt: 0.5, fontWeight: 700, letterSpacing: '-0.03em' }}>
            {organizerBookings.length}
          </Typography>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            p: 2.25,
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: (t) => t.shadows[1],
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing="-0.01em">
            Ulubione (łącznie)
          </Typography>
          <Typography variant="h4" component="p" sx={{ m: 0, mt: 0.5, fontWeight: 700, letterSpacing: '-0.03em' }}>
            {totalLikes}
          </Typography>
        </Paper>
      </Stack>

      <Box sx={{ width: '100%', minWidth: 0 }}>
        {isMobile ? (
          rows.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2, color: 'text.secondary' }}>
              Brak wydarzeń
            </Paper>
          ) : (
          <Stack spacing={1.5}>
            {rows.map((row) => (
              <Paper
                key={row.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderColor: 'divider',
                  boxShadow: (t) => `0 2px 12px ${alpha(t.palette.common.black, 0.05)}`,
                }}
              >
                <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.02em', lineHeight: 1.35 }}>
                  {row.title}
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                  <Typography variant="body2" color="text.secondary">
                    <Box component="span" fontWeight={600} color="text.primary">
                      Data:
                    </Box>{' '}
                    {row.date}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <Box component="span" fontWeight={600} color="text.primary">
                      Miasto:
                    </Box>{' '}
                    {row.city}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <Box component="span" fontWeight={600} color="text.primary">
                      Cena:
                    </Box>{' '}
                    {row.price}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rezerwacje: <strong>{row.bookings}</strong> · Ulubione: <strong>{row.favorites}</strong>
                  </Typography>
                </Stack>
                <Stack direction="column" spacing={1} sx={{ mt: 2 }}>
                  <Button component={RouterLink} to={`/organizer/events/${row.eventId}/edit`} variant="contained" fullWidth>
                    Edytuj
                  </Button>
                  <Button component={RouterLink} to={`/events/${row.eventId}`} variant="outlined" fullWidth>
                    Szczegóły
                  </Button>
                  <Button variant="outlined" color="error" fullWidth onClick={() => openDeleteModal(row)}>
                    Usuń
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
          )
        ) : (
          <Table columns={columns} rows={rows} emptyText="Brak wydarzeń" />
        )}
      </Box>

      <Modal
        open={deleteModalOpen}
        onClose={closeDeleteModal}
        title="Potwierdź usunięcie wydarzenia"
        actions={
          <>
            <Button variant="text" onClick={closeDeleteModal} disabled={deleteBusy}>
              Anuluj
            </Button>
            <Button variant="contained" color="error" onClick={confirmDeleteEvent} disabled={deleteBusy}>
              {deleteBusy ? 'Usuwanie...' : 'Usuń wydarzenie'}
            </Button>
          </>
        }
      >
        <Stack spacing={1}>
          <Typography>
            Czy na pewno chcesz usunąć wydarzenie <strong>{eventToDelete?.title || '—'}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Data: {eventToDelete?.date || '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tej operacji nie można cofnąć.
          </Typography>
        </Stack>
      </Modal>
    </Stack>
  );
}
