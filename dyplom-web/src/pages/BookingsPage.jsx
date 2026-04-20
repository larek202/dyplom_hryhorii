import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { deleteBooking, fetchBookings } from '../api/bookings.js';
import { getApiBaseUrl } from '../api/client';
import ErrorState from '../components/feedback/ErrorState';
import PageSkeleton from '../components/feedback/PageSkeleton.jsx';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { Table } from '../ui';
import { getUiErrorMessage } from '../services/api.js';
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

/** kind: 'pending' | 'active' | 'past' | 'cancelled' */
function deriveBookingKind(booking, eventDateMs) {
  const st = String(booking?.status || '').toLowerCase();
  if (st === 'cancelled') return 'cancelled';
  if (st === 'pending') return 'pending';
  const now = Date.now();
  if (st === 'confirmed') {
    if (Number.isFinite(eventDateMs) && eventDateMs < now) return 'past';
    return 'active';
  }
  return 'active';
}

function statusChipProps(kind) {
  switch (kind) {
    case 'cancelled':
      return { label: 'Anulowana', color: 'error', variant: 'outlined' };
    case 'pending':
      return { label: 'Oczekująca', color: 'warning', variant: 'filled' };
    case 'past':
      return { label: 'Zakończona', color: 'default', variant: 'outlined' };
    case 'active':
    default:
      return { label: 'Aktywna', color: 'success', variant: 'filled' };
  }
}

/** Grupa sortowania: 0 = aktywne/pending, 1 = przeszłe, 2 = anulowane */
function sortGroup(kind) {
  if (kind === 'cancelled') return 2;
  if (kind === 'past') return 1;
  return 0;
}

const FILTER_IDS = ['all', 'active', 'past', 'cancelled', 'pending'];

const FILTER_LABELS = {
  all: 'Wszystkie',
  active: 'Aktywne',
  past: 'Zakończone',
  cancelled: 'Anulowane',
  pending: 'Oczekujące',
};

function matchesFilter(kind, filterId) {
  if (filterId === 'all') return true;
  if (filterId === 'active') return kind === 'active' || kind === 'pending';
  return kind === filterId;
}

export default function BookingsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { ask, dialog } = useConfirm();
  const [retryKey, setRetryKey] = useState(0);
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    (async () => {
      try {
        const data = await fetchBookings();
        const list = Array.isArray(data?.bookings) ? data.bookings : [];
        if (!cancelled) setBookings(list);
      } catch (e) {
        if (!cancelled) {
          setLoadError(getUiErrorMessage(e));
          setBookings(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const handleCancel = useCallback(
    async (row) => {
      setActionError('');
      const eventId = row.eventIdRef;
      if (!eventId) {
        setActionError('Nie można anulować — brak powiązanego wydarzenia.');
        return;
      }
      const ok = await ask('Czy na pewno chcesz anulować tę rezerwację?');
      if (!ok) return;
      setCancellingId(row.id);
      try {
        await deleteBooking(String(eventId));
        setBookings((prev) => (prev ? prev.filter((b) => String(b._id) !== String(row.id)) : prev));
      } catch (e) {
        setActionError(getUiErrorMessage(e));
      } finally {
        setCancellingId(null);
      }
    },
    [ask],
  );

  const sortedRows = useMemo(() => {
    if (!bookings) return [];
    const now = Date.now();
    return [...bookings]
      .map((b) => {
        const ev = b.eventId;
        const title = (ev?.title || '').trim() || '—';
        const eventDateMs = new Date(ev?.date || 0).getTime();
        const kind = deriveBookingKind(b, eventDateMs);
        const eventIdRef = ev?._id ?? ev;
        return {
          id: b._id,
          eventTitle: title,
          eventIdPath: eventIdRef != null ? `/events/${String(eventIdRef)}` : '/events',
          date: formatEventDate(ev?.date),
          eventDateMs,
          kind,
          statusChip: statusChipProps(kind),
          eventIdRef,
          createdAtMs: new Date(b.createdAt || 0).getTime(),
        };
      })
      .sort((a, b) => {
        const ga = sortGroup(a.kind);
        const gb = sortGroup(b.kind);
        if (ga !== gb) return ga - gb;
        if (ga === 0) {
          const at = Number.isFinite(a.eventDateMs) ? a.eventDateMs : Infinity;
          const bt = Number.isFinite(b.eventDateMs) ? b.eventDateMs : Infinity;
          return at - bt;
        }
        if (ga === 1) {
          return (b.eventDateMs || 0) - (a.eventDateMs || 0);
        }
        return (b.createdAtMs || 0) - (a.createdAtMs || 0);
      });
  }, [bookings]);

  const filteredRows = useMemo(
    () => sortedRows.filter((r) => matchesFilter(r.kind, statusFilter)),
    [sortedRows, statusFilter],
  );

  const columns = useMemo(
    () => [
      {
        field: 'event',
        headerName: 'Wydarzenie',
        renderCell: (row) => (
          <Link
            component={RouterLink}
            to={row.eventIdPath}
            fontWeight={700}
            underline="hover"
            color="primary"
            sx={{ letterSpacing: '-0.02em', lineHeight: 1.35 }}
          >
            {row.eventTitle}
          </Link>
        ),
      },
      {
        field: 'date',
        headerName: 'Data wydarzenia',
        renderCell: (row) => (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {row.date}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        renderCell: (row) => (
          <Chip
            size="small"
            label={row.statusChip.label}
            color={row.statusChip.color}
            variant={row.statusChip.variant}
            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
          />
        ),
      },
      {
        field: 'actions',
        headerName: 'Akcje',
        align: 'right',
        renderCell: (row) => {
          const canCancel = row.kind !== 'cancelled' && row.kind !== 'past';
          const busy = cancellingId === row.id;
          return (
            <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
              <Tooltip title="Otwórz stronę wydarzenia" enterDelay={400}>
                <Button
                  component={RouterLink}
                  to={row.eventIdPath}
                  size="small"
                  variant="text"
                  color="primary"
                  sx={{ fontWeight: 700, minWidth: 'auto', px: 1 }}
                >
                  Szczegóły
                </Button>
              </Tooltip>
              <Tooltip
                title={
                  !canCancel
                    ? row.kind === 'past'
                      ? 'Wydarzenie się zakończyło — anulowanie nie jest dostępne'
                      : 'Rezerwacja już anulowana'
                    : 'Anuluj rezerwację'
                }
                enterDelay={400}
              >
                <span>
                  <Button
                    type="button"
                    size="small"
                    variant="text"
                    color="error"
                    disabled={!canCancel || busy}
                    onClick={() => handleCancel(row)}
                    sx={{ fontWeight: 700, minWidth: 'auto', px: 1 }}
                  >
                    {busy ? 'Anulowanie…' : 'Anuluj'}
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [cancellingId, handleCancel],
  );

  const totalCount = bookings?.length ?? 0;
  const shownCount = filteredRows.length;

  const reservationsWord =
    totalCount === 1
      ? 'rezerwacja'
      : totalCount % 10 >= 2 &&
          totalCount % 10 <= 4 &&
          (totalCount % 100 < 10 || totalCount % 100 >= 20)
        ? 'rezerwacje'
        : 'rezerwacji';

  const headerCellSx = {
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'text.secondary',
    borderBottom: 2,
    borderColor: 'divider',
    py: 1.75,
    bgcolor: (t) => alpha(t.palette.grey[50], 0.95),
  };

  const paperSx = {
    borderRadius: 3,
    border: 1,
    borderColor: 'divider',
    boxShadow: (t) => `0 4px 24px ${alpha(t.palette.common.black, 0.06)}`,
    overflow: 'hidden',
  };

  const rowSx = (row) => ({
    transition: 'background-color 0.15s ease',
    '&:hover': {
      bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
    },
    ...(row.kind === 'cancelled'
      ? { opacity: 0.88 }
      : {}),
  });

  if (loading) {
    return (
      <>
        {dialog}
        <Stack spacing={2} sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
            Rezerwacje
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ładowanie…
          </Typography>
          <PageSkeleton tableHeight={240} />
        </Stack>
      </>
    );
  }

  if (loadError || bookings === null) {
    return (
      <>
        {dialog}
        <Stack spacing={2} sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
            Rezerwacje
          </Typography>
          <ErrorState
            title="Błąd ładowania danych"
            message={loadError || 'Coś poszło nie tak'}
            hint={`Sprawdź, czy backend jest uruchomiony (${getApiBaseUrl()}).`}
            onRetry={() => setRetryKey((k) => k + 1)}
          />
        </Stack>
      </>
    );
  }

  const emptyNoData = totalCount === 0;
  const emptyFiltered = !emptyNoData && shownCount === 0;

  return (
    <Stack spacing={3} sx={{ maxWidth: 1100, mx: 'auto', pb: 2 }}>
      {dialog}

      <Box component="header">
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, letterSpacing: '-0.03em', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}
        >
          Rezerwacje
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mt: 1.25, maxWidth: 640, lineHeight: 1.65, fontSize: { xs: '0.9375rem', sm: '1rem' } }}
        >
          Przeglądaj swoje rezerwacje na wydarzenia, przechodź do szczegółów lub anuluj zapis, jeśli to jeszcze możliwe.
        </Typography>
        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={2} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Łącznie:{' '}
            <Box component="span" color="text.primary" fontWeight={800}>
              {totalCount}
            </Box>{' '}
            {reservationsWord}
          </Typography>
          {!emptyNoData && statusFilter !== 'all' ? (
            <Typography variant="body2" color="text.secondary">
              Wyświetlane: <strong>{shownCount}</strong>
            </Typography>
          ) : null}
        </Stack>
      </Box>

      {actionError ? (
        <Alert severity="error" onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      ) : null}

      {!emptyNoData ? (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <FilterListOutlinedIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
              Filtruj po statusie
            </Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ gap: 1 }}>
            {FILTER_IDS.map((fid) => (
              <Chip
                key={fid}
                label={FILTER_LABELS[fid]}
                onClick={() => setStatusFilter(fid)}
                color={statusFilter === fid ? 'primary' : 'default'}
                variant={statusFilter === fid ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      {emptyNoData ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6 },
            textAlign: 'center',
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.grey[50], 0.6),
          }}
        >
          <EventAvailableOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Brak rezerwacji
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto', lineHeight: 1.65 }}>
            Nie masz jeszcze żadnych rezerwacji. Przeglądaj wydarzenia i zapisuj się na te, które Cię interesują.
          </Typography>
          <Button component={RouterLink} to="/events" variant="contained" sx={{ fontWeight: 700 }}>
            Przeglądaj wydarzenia
          </Button>
        </Paper>
      ) : emptyFiltered ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 5 },
            textAlign: 'center',
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Brak rezerwacji w wybranym filtrze
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Zmień filtr lub wyczyść go, aby zobaczyć wszystkie pozycje.
          </Typography>
          <Button variant="outlined" onClick={() => setStatusFilter('all')} sx={{ fontWeight: 700 }}>
            Pokaż wszystkie
          </Button>
        </Paper>
      ) : isMobile ? (
        <Stack spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
          {filteredRows.map((row) => {
            const canCancel = row.kind !== 'cancelled' && row.kind !== 'past';
            const busy = cancellingId === row.id;
            return (
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
                <Link
                  component={RouterLink}
                  to={row.eventIdPath}
                  fontWeight={800}
                  underline="hover"
                  color="primary"
                  sx={{ letterSpacing: '-0.02em', lineHeight: 1.35, display: 'block', fontSize: '1rem' }}
                >
                  {row.eventTitle}
                </Link>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
                  {row.date}
                </Typography>
                <Box sx={{ mt: 1.5 }}>
                  <Chip
                    size="small"
                    label={row.statusChip.label}
                    color={row.statusChip.color}
                    variant={row.statusChip.variant}
                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                  />
                </Box>
                <Stack direction="column" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    component={RouterLink}
                    to={row.eventIdPath}
                    variant="outlined"
                    color="primary"
                    fullWidth
                    sx={{ fontWeight: 700 }}
                  >
                    Szczegóły wydarzenia
                  </Button>
                  <Button
                    type="button"
                    variant="text"
                    color="error"
                    fullWidth
                    disabled={!canCancel || busy}
                    onClick={() => handleCancel(row)}
                    sx={{ fontWeight: 700 }}
                  >
                    {busy ? 'Anulowanie…' : 'Anuluj rezerwację'}
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      ) : (
        <Table
          columns={columns}
          rows={filteredRows}
          emptyText="Brak danych"
          headerCellSx={headerCellSx}
          paperSx={paperSx}
          rowSx={rowSx}
        />
      )}
    </Stack>
  );
}
