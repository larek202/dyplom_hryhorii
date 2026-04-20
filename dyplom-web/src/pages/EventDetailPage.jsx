import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { createBooking, deleteBooking, fetchBookings } from '../api/bookings.js';
import { addFavorite, fetchFavorites, removeFavorite } from '../api/favorites.js';
import { fetchEventById, fetchEvents } from '../api/events.js';
import PageSkeleton from '../components/feedback/PageSkeleton.jsx';
import EventCard from '../components/events/EventCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError, getUiErrorMessage } from '../services/api.js';
import { buildGoogleMapsSearchQuery, formatEventStreetLine } from '../utils/eventAddress.js';
import { getAdditionalCategories, getPrimaryCategory } from '../utils/eventCategories.js';

function formatEventDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
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

function formatAddressBlock(event, cityRawTrimmed) {
  const streetLine = formatEventStreetLine(event);
  const postal = String(event?.location?.postalCode || '').trim();
  const lines = [];
  if (streetLine) lines.push(streetLine);
  const cityLine = [postal, cityRawTrimmed].filter(Boolean).join(' ').trim();
  if (cityLine) lines.push(cityLine);
  if (!lines.length && cityRawTrimmed) lines.push(cityRawTrimmed);
  return lines;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [hasBooking, setHasBooking] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: 'success', text: '' });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const eventId = event?._id || event?.id || id;

  const galleryImages = useMemo(() => {
    const raw = event?.images;
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map((u) => String(u || '').trim()).filter(Boolean);
  }, [event]);

  const coverIdx = useMemo(() => {
    if (!galleryImages.length) return 0;
    let idx = Number(event?.coverImageIndex);
    if (!Number.isFinite(idx) || idx < 0) idx = 0;
    return Math.min(Math.floor(idx), galleryImages.length - 1);
  }, [event?.coverImageIndex, galleryImages]);

  const isFavorite = useMemo(() => {
    if (!eventId) return false;
    return favoriteIds.has(String(eventId));
  }, [eventId, favoriteIds]);

  const primaryCategory = useMemo(() => getPrimaryCategory(event), [event]);
  const additionalCategories = useMemo(() => getAdditionalCategories(event), [event]);
  const extraChipsShown = additionalCategories.slice(0, 3);
  const extraHiddenCount = Math.max(0, additionalCategories.length - 3);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError('Nie znaleziono wydarzenia.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    (async () => {
      try {
        const data = await fetchEventById(id);
        if (!cancelled) setEvent(data);
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof ApiError && e.status === 404 ? 'Nie znaleziono wydarzenia.' : getUiErrorMessage(e);
          setLoadError(msg);
          setEvent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setLightboxOpen(false);
    setLightboxIndex(0);
    setSelectedGalleryIndex(0);
  }, [id]);

  useEffect(() => {
    setSelectedGalleryIndex(coverIdx);
  }, [coverIdx, id]);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      setFavoritesLoaded(true);
      return;
    }
    let cancelled = false;
    setFavoritesLoaded(false);
    (async () => {
      try {
        const data = await fetchFavorites();
        if (!cancelled) {
          const ids = new Set((data?.ids ?? []).map((x) => String(x)));
          setFavoriteIds(ids);
        }
      } catch {
        if (!cancelled) setFavoriteIds(new Set());
      } finally {
        if (!cancelled) setFavoritesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !id) {
      setBookingsLoaded(true);
      setHasBooking(false);
      return;
    }
    let cancelled = false;
    setBookingsLoaded(false);
    (async () => {
      try {
        const data = await fetchBookings();
        if (cancelled) return;
        const list = Array.isArray(data?.bookings) ? data.bookings : [];
        const sid = String(id);
        const found = list.some((b) => {
          const ev = b.eventId;
          const eid = ev && typeof ev === 'object' && ev !== null ? ev._id ?? ev.id : ev;
          return String(eid ?? '') === sid;
        });
        setHasBooking(found);
      } catch {
        if (!cancelled) setHasBooking(false);
      } finally {
        if (!cancelled) setBookingsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  useEffect(() => {
    if (!eventId || !event) {
      setSimilarEvents([]);
      return;
    }
    let cancelled = false;
    const cat = primaryCategory;
    const cityQ = String(event.city || '').trim();
    setSimilarLoading(true);
    (async () => {
      try {
        let res;
        if (cat) {
          res = await fetchEvents({ category: cat, limit: 16 });
        } else if (cityQ) {
          res = await fetchEvents({ city: cityQ, limit: 16 });
        } else {
          res = await fetchEvents({ limit: 16 });
        }
        if (cancelled) return;
        const list = Array.isArray(res?.events) ? res.events : [];
        const sid = String(eventId);
        const filtered = list.filter((e) => String(e._id || e.id) !== sid).slice(0, 3);
        setSimilarEvents(filtered);
      } catch {
        if (!cancelled) setSimilarEvents([]);
      } finally {
        if (!cancelled) setSimilarLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event, eventId, primaryCategory]);

  const requireLogin = useCallback(() => {
    navigate('/login', { replace: false, state: { from: location } });
  }, [navigate, location]);

  const showActionMessage = useCallback((type, text) => {
    setActionMessage({ type, text });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const openLightbox = useCallback((index) => {
    const n = galleryImages.length;
    if (n < 1) return;
    setLightboxIndex(Math.max(0, Math.min(index, n - 1)));
    setLightboxOpen(true);
  }, [galleryImages.length]);

  const goPrevImage = useCallback(() => {
    setLightboxIndex((i) => {
      const n = galleryImages.length;
      if (n < 2) return i;
      return (i - 1 + n) % n;
    });
  }, [galleryImages.length]);

  const goNextImage = useCallback(() => {
    setLightboxIndex((i) => {
      const n = galleryImages.length;
      if (n < 2) return i;
      return (i + 1) % n;
    });
  }, [galleryImages.length]);

  useEffect(() => {
    if (!lightboxOpen || galleryImages.length < 2) return undefined;
    function onKeyDown(e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrevImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNextImage();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, galleryImages.length, goPrevImage, goNextImage]);

  async function handleAddFavorite() {
    setActionMessage((m) => ({ ...m, text: '' }));
    if (!user) {
      requireLogin();
      return;
    }
    if (!eventId || isFavorite) return;
    setActionBusy(true);
    try {
      const data = await addFavorite(eventId);
      setFavoriteIds(new Set((data?.ids ?? []).map((x) => String(x))));
      showActionMessage('success', 'Dodano do ulubionych.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        requireLogin();
      } else {
        showActionMessage('error', getUiErrorMessage(e));
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRemoveFavorite() {
    setActionMessage((m) => ({ ...m, text: '' }));
    if (!user) {
      requireLogin();
      return;
    }
    if (!eventId || !isFavorite) return;
    setActionBusy(true);
    try {
      const data = await removeFavorite(eventId);
      setFavoriteIds(new Set((data?.ids ?? []).map((x) => String(x))));
      showActionMessage('success', 'Usunięto z ulubionych.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        requireLogin();
      } else {
        showActionMessage('error', getUiErrorMessage(e));
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function handleBook() {
    setActionMessage((m) => ({ ...m, text: '' }));
    if (!user) {
      requireLogin();
      return;
    }
    if (!eventId) return;
    setActionBusy(true);
    try {
      await createBooking(eventId, { seats: 1 });
      setHasBooking(true);
      showActionMessage('success', 'Rezerwacja została zapisana.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        requireLogin();
      } else if (e instanceof ApiError && e.status === 400) {
        const dup = Boolean(e.message?.includes('istnieje'));
        if (dup) setHasBooking(true);
        showActionMessage(
          'error',
          dup ? 'Masz już rezerwację na to wydarzenie.' : getUiErrorMessage(e),
        );
      } else {
        showActionMessage('error', getUiErrorMessage(e));
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCancelBooking() {
    setActionMessage((m) => ({ ...m, text: '' }));
    if (!user) {
      requireLogin();
      return;
    }
    if (!eventId || !hasBooking) return;
    setActionBusy(true);
    try {
      await deleteBooking(eventId);
      setHasBooking(false);
      showActionMessage('success', 'Rezerwacja została anulowana.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        requireLogin();
      } else if (e instanceof ApiError && e.status === 404) {
        setHasBooking(false);
        showActionMessage('error', 'Nie znaleziono rezerwacji.');
      } else {
        showActionMessage('error', getUiErrorMessage(e));
      }
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <PageSkeleton showTitle={false} tableHeight={300} />
      </Box>
    );
  }

  if (loadError || !event) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h5" component="h1" fontWeight={600}>
          Wydarzenie
        </Typography>
        <Alert severity="error">{loadError || 'Nie znaleziono wydarzenia.'}</Alert>
        <Button component={RouterLink} to="/events" variant="outlined">
          Wróć do listy wydarzeń
        </Button>
      </Stack>
    );
  }

  const title = (event.title || '').trim() || 'Bez tytułu';
  const cityRaw = (event.city || '').trim();
  const city = cityRaw || 'Nie podano miejsca';
  const streetLine = formatEventStreetLine(event);
  const postalLine = String(event.location?.postalCode || '').trim();
  const mapsSearchQuery = buildGoogleMapsSearchQuery(event);
  const googleMapsHref = mapsSearchQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsSearchQuery)}`
    : '';
  const dateStr = formatEventDate(event.date) || 'Nie podano daty';
  const orgTitle =
    String(event.organization?.name || event.organizationName || '').trim() || '';
  const organizerName =
    orgTitle || String(event.organizerId?.name || '').trim() || 'Nie podano organizatora';
  const organizerUserId = event.organizerId?._id ?? event.organizerId;
  const organizerProfileTo =
    organizerUserId != null && String(organizerUserId).trim()
      ? `/organizers/${String(organizerUserId)}`
      : null;
  const description = (event.description || '').trim() || 'Brak opisu.';
  const safeLightboxIndex =
    galleryImages.length > 0 ? Math.min(lightboxIndex, galleryImages.length - 1) : 0;
  const lightboxSrc = galleryImages[safeLightboxIndex] || '';
  const mainImageSrc =
    galleryImages.length > 0 ? galleryImages[Math.min(selectedGalleryIndex, galleryImages.length - 1)] : '';

  const orgLogoUrl = String(event.organization?.logoUrl || '').trim();
  const organizerAvatar = String(event.organizerId?.avatar || '').trim();
  const avatarSrc = orgLogoUrl || organizerAvatar || undefined;
  const orgBioRaw = String(event.organization?.description || '').trim();
  const orgBio =
    orgBioRaw ||
    'Krótka informacja o organizatorze pojawi się tutaj po uzupełnieniu profilu organizacji.';

  const addressLines = formatAddressBlock(event, cityRaw);

  const detailLabelSx = {
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'text.secondary',
    opacity: 0.85,
    mb: 0.35,
  };

  const detailValueSx = {
    fontWeight: 650,
    fontSize: '1.05rem',
    letterSpacing: '-0.02em',
    lineHeight: 1.35,
    color: 'text.primary',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  };

  const chipMetaSx = {
    fontWeight: 600,
    borderColor: 'divider',
    bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
    maxWidth: '100%',
    minWidth: 0,
    height: 'auto',
    alignSelf: { xs: 'stretch', sm: 'flex-start' },
    '& .MuiChip-label': {
      whiteSpace: 'normal',
      lineHeight: 1.35,
      display: 'block',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
    },
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 6, width: '100%', minWidth: 0, overflowX: 'hidden' }}>
      <Typography
        component={RouterLink}
        to="/events"
        variant="body2"
        sx={{
          color: 'primary.main',
          textDecoration: 'none',
          fontWeight: 600,
          mb: 3,
          display: 'inline-block',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        ← Wszystkie wydarzenia
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, lg: 4 },
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(300px, 400px)' },
          alignItems: 'start',
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* —— Lewa kolumna —— */}
        <Stack spacing={{ xs: 4, md: 5 }} sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.15,
                fontSize: { xs: '1.85rem', sm: '2.35rem', md: '2.6rem' },
                mb: 2,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {title}
            </Typography>

            <Stack
              direction="row"
              flexWrap="wrap"
              useFlexGap
              sx={{ gap: 1.25, mb: 2.5, alignItems: 'center', width: '100%', minWidth: 0 }}
            >
              {primaryCategory ? (
                <Chip
                  label={primaryCategory}
                  color="primary"
                  size="small"
                  sx={{
                    height: 28,
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    '& .MuiChip-label': { px: 1.25 },
                  }}
                />
              ) : (
                <Chip
                  label="Bez kategorii"
                  size="small"
                  variant="outlined"
                  color="default"
                  sx={{
                    height: 28,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    '& .MuiChip-label': { px: 1.25 },
                  }}
                />
              )}
              {extraChipsShown.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 28,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    '& .MuiChip-label': { px: 1.25 },
                  }}
                />
              ))}
              {extraHiddenCount > 0 ? (
                <Chip
                  label={`+${extraHiddenCount}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 28,
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    '& .MuiChip-label': { px: 1.25 },
                  }}
                />
              ) : null}
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              flexWrap="wrap"
              useFlexGap
              spacing={1}
              sx={{
                width: '100%',
                minWidth: 0,
                gap: 1,
                alignItems: { xs: 'stretch', sm: 'flex-start' },
              }}
            >
              <Chip
                icon={<CalendarTodayOutlinedIcon sx={{ '&&': { fontSize: 18 } }} />}
                label={dateStr}
                variant="outlined"
                size="small"
                sx={chipMetaSx}
              />
              <Chip
                icon={<PlaceOutlinedIcon sx={{ '&&': { fontSize: 18 } }} />}
                label={city}
                variant="outlined"
                size="small"
                sx={chipMetaSx}
              />
              <Chip
                icon={<AttachMoneyOutlinedIcon sx={{ '&&': { fontSize: 18 } }} />}
                label={formatPrice(event.price)}
                variant="outlined"
                size="small"
                sx={chipMetaSx}
              />
            </Stack>
          </Box>

          {galleryImages.length > 0 ? (
            <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
              <ButtonBase
                onClick={() => openLightbox(selectedGalleryIndex)}
                focusRipple
                aria-label="Powiększ zdjęcie główne"
                sx={{
                  width: '100%',
                  borderRadius: 3,
                  overflow: 'hidden',
                  display: 'block',
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: (t) => `0 8px 32px ${alpha(t.palette.common.black, 0.07)}`,
                }}
              >
                <Box
                  component="img"
                  src={mainImageSrc}
                  alt=""
                  sx={{
                    width: '100%',
                    height: { xs: 240, sm: 380, md: 420 },
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </ButtonBase>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
                {galleryImages.map((src, idx) => {
                  const selected = idx === selectedGalleryIndex;
                  return (
                    <ButtonBase
                      key={`${src}-${idx}`}
                      onClick={() => setSelectedGalleryIndex(idx)}
                      aria-label={`Ustaw jako zdjęcie główne ${idx + 1} z ${galleryImages.length}`}
                      focusRipple
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: 2,
                        borderColor: selected ? 'primary.main' : 'divider',
                        width: 88,
                        height: 66,
                        flexShrink: 0,
                        bgcolor: 'grey.100',
                        boxShadow: selected
                          ? (t) => `0 0 0 3px ${alpha(t.palette.primary.main, 0.25)}`
                          : 'none',
                      }}
                    >
                      <Box
                        component="img"
                        src={src}
                        alt=""
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </ButtonBase>
                  );
                })}
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  mt: 1,
                  display: 'block',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                }}
              >
                Kliknij miniaturę, aby zmienić zdjęcie główne. Kliknij duże zdjęcie, aby otworzyć podgląd.
              </Typography>
            </Box>
          ) : null}

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              boxShadow: (t) => `0 4px 24px ${alpha(t.palette.common.black, 0.06)}`,
              mt: galleryImages.length ? 1 : 0,
            }}
          >
            <Typography
              variant="overline"
              sx={{
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: 'text.secondary',
                display: 'block',
                mb: 2,
              }}
            >
              Opis wydarzenia
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.75,
                maxWidth: 'min(720px, 100%)',
                fontSize: '1.05rem',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {description}
            </Typography>
          </Paper>

          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              overflow: 'hidden',
              boxShadow: (t) => `0 8px 28px ${alpha(t.palette.common.black, 0.06)}`,
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.12em' }}>
                Organizator
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mt: 2 }}
                alignItems={{ xs: 'center', sm: 'flex-start' }}
                textAlign={{ xs: 'center', sm: 'left' }}
              >
                <Avatar
                  src={avatarSrc}
                  alt=""
                  variant="rounded"
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: '1.35rem',
                    bgcolor: 'primary.main',
                  }}
                >
                  {organizerName.slice(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1, width: { xs: '100%', sm: 'auto' } }}>
                  <Typography variant="h6" fontWeight={800} letterSpacing="-0.03em" gutterBottom>
                    {organizerName}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.65,
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {orgBio}
                  </Typography>
                  {organizerProfileTo ? (
                    <Button
                      component={RouterLink}
                      to={organizerProfileTo}
                      variant="outlined"
                      color="primary"
                      sx={{ mt: 2, fontWeight: 700 }}
                    >
                      Zobacz profil organizatora
                    </Button>
                  ) : null}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Box>
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.03em" sx={{ mb: 2 }}>
              Podobne wydarzenia
            </Typography>
            {similarLoading ? (
              <Typography variant="body2" color="text.secondary">
                Ładowanie…
              </Typography>
            ) : similarEvents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Brak podobnych propozycji w tej chwili.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 2,
                  width: '100%',
                  minWidth: 0,
                }}
              >
                {similarEvents.map((ev) => (
                  <EventCard key={String(ev._id || ev.id)} event={ev} compact />
                ))}
              </Box>
            )}
          </Box>
        </Stack>

        {/* —— Prawa kolumna —— */}
        <Paper
          elevation={0}
          sx={{
            position: { lg: 'sticky' },
            top: { lg: 24 },
            alignSelf: 'start',
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: (t) => `0 8px 32px ${alpha(t.palette.common.black, 0.07)}`,
            minWidth: 0,
            maxWidth: '100%',
            width: '100%',
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.14em' }}>
            Szczegóły i akcje
          </Typography>

          <Stack spacing={2.25} sx={{ mt: 2.5 }}>
            <Box>
              <Typography sx={detailLabelSx}>Data i godzina</Typography>
              <Typography sx={detailValueSx}>{dateStr}</Typography>
            </Box>
            <Box>
              <Typography sx={detailLabelSx}>Adres</Typography>
              {addressLines.length ? (
                <Typography sx={detailValueSx} component="div">
                  {addressLines.map((line, i) => (
                    <span key={`${i}-${line}`}>
                      {line}
                      <br />
                    </span>
                  ))}
                </Typography>
              ) : (
                <Typography sx={detailValueSx}>{city}</Typography>
              )}
              {streetLine || postalLine ? null : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Pełny adres może być uzupełniony przez organizatora.
                </Typography>
              )}
            </Box>
            <Box>
              <Typography sx={detailLabelSx}>Cena</Typography>
              <Typography sx={detailValueSx}>{formatPrice(event.price)}</Typography>
            </Box>
            <Box>
              <Typography sx={detailLabelSx}>Kategoria główna</Typography>
              <Typography sx={detailValueSx}>{primaryCategory || '—'}</Typography>
              <Typography sx={{ ...detailLabelSx, mt: 1.25 }}>Dodatkowe kategorie</Typography>
              {additionalCategories.length ? (
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ gap: 0.75, mt: 0.5 }}>
                  {additionalCategories.map((c) => (
                    <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Brak dodatkowych kategorii
                </Typography>
              )}
            </Box>
            <Box>
              <Typography sx={detailLabelSx}>Organizator</Typography>
              <Typography sx={detailValueSx} component="div">
                {organizerProfileTo ? (
                  <Link
                    component={RouterLink}
                    to={organizerProfileTo}
                    color="primary"
                    underline="hover"
                    fontWeight={650}
                  >
                    {organizerName}
                  </Link>
                ) : (
                  organizerName
                )}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          {actionMessage.text ? (
            <Alert
              severity={actionMessage.type}
              sx={{ mb: 2 }}
              onClose={() => setActionMessage((m) => ({ ...m, text: '' }))}
            >
              {actionMessage.text}
            </Alert>
          ) : null}

          <Stack spacing={1.5}>
            {hasBooking ? (
              <Button
                type="button"
                variant="outlined"
                color="error"
                size="large"
                fullWidth
                disabled={actionBusy || (Boolean(user) && !bookingsLoaded)}
                onClick={handleCancelBooking}
                sx={{ fontWeight: 800, py: 1.35, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
              >
                Anuluj rezerwację
              </Button>
            ) : (
              <Button
                type="button"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                disabled={actionBusy || (Boolean(user) && !bookingsLoaded)}
                onClick={handleBook}
                sx={{
                  fontWeight: 800,
                  py: 1.35,
                  boxShadow: (t) => `0 8px 20px ${alpha(t.palette.primary.main, 0.35)}`,
                }}
              >
                Zarezerwuj
              </Button>
            )}

            {isFavorite ? (
              <Button
                type="button"
                variant="outlined"
                color="inherit"
                fullWidth
                disabled={actionBusy || (Boolean(user) && !favoritesLoaded)}
                onClick={handleRemoveFavorite}
                startIcon={<FavoriteOutlinedIcon />}
                sx={{
                  fontWeight: 700,
                  py: 1,
                  borderColor: 'divider',
                  color: 'text.primary',
                  bgcolor: (t) => alpha(t.palette.action.hover, 0.35),
                  '&:hover': {
                    borderColor: 'text.secondary',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                Usuń z ulubionych
              </Button>
            ) : (
              <Button
                type="button"
                variant="outlined"
                color="inherit"
                fullWidth
                disabled={actionBusy || (Boolean(user) && !favoritesLoaded)}
                onClick={handleAddFavorite}
                startIcon={<FavoriteBorderOutlinedIcon />}
                sx={{
                  fontWeight: 700,
                  py: 1,
                  borderColor: 'divider',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'primary.light',
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                  },
                }}
              >
                Dodaj do ulubionych
              </Button>
            )}

            {googleMapsHref ? (
              <Button
                component="a"
                href={googleMapsHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="text"
                color="primary"
                fullWidth
                size="medium"
                startIcon={<MapOutlinedIcon />}
                sx={{ fontWeight: 700, py: 0.75 }}
              >
                Otwórz w Google Maps
              </Button>
            ) : null}
          </Stack>

          {!user ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, lineHeight: 1.55 }}>
              Zaloguj się, aby dodać wydarzenie do ulubionych lub je zarezerwować.
            </Typography>
          ) : null}
        </Paper>
      </Box>

      <Dialog
        open={lightboxOpen}
        onClose={closeLightbox}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1, sm: 2 },
              maxWidth: 'min(96vw, 1120px)',
              width: '100%',
              bgcolor: 'grey.900',
              color: 'common.white',
              backgroundImage: 'none',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pr: 1,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Typography variant="subtitle1" component="span" sx={{ color: 'common.white' }}>
            {galleryImages.length > 1
              ? `Zdjęcie ${safeLightboxIndex + 1} / ${galleryImages.length}`
              : 'Zdjęcie'}
          </Typography>
          <IconButton onClick={closeLightbox} aria-label="Zamknij" size="small" sx={{ color: 'common.white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            position: 'relative',
            p: { xs: 1, sm: 2 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
          }}
        >
          {galleryImages.length > 1 ? (
            <>
              <IconButton
                onClick={goPrevImage}
                aria-label="Poprzednie zdjęcie"
                size="large"
                sx={{
                  position: 'absolute',
                  left: { xs: 4, sm: 12 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'common.white',
                  bgcolor: 'rgba(0,0,0,0.45)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                }}
              >
                <ChevronLeftIcon fontSize="large" />
              </IconButton>
              <IconButton
                onClick={goNextImage}
                aria-label="Następne zdjęcie"
                size="large"
                sx={{
                  position: 'absolute',
                  right: { xs: 4, sm: 12 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'common.white',
                  bgcolor: 'rgba(0,0,0,0.45)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                }}
              >
                <ChevronRightIcon fontSize="large" />
              </IconButton>
            </>
          ) : null}
          {lightboxSrc ? (
            <Box
              component="img"
              src={lightboxSrc}
              alt=""
              sx={{
                maxWidth: '100%',
                maxHeight: { xs: '70vh', sm: 'min(85vh, 820px)' },
                objectFit: 'contain',
                display: 'block',
                borderRadius: 1,
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
