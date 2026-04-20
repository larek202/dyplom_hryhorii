import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  Alert,
  Autocomplete,
  Box,
  FormControl,
  IconButton,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimeField } from '@mui/x-date-pickers/TimeField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { plPL as pickersPlPL } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import { createEvent, fetchEventById, updateEvent, uploadEventImages } from '../api/events.js';
import { ApiError, getUiErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Input } from '../ui';
import { EVENT_CATEGORIES } from '../constants/categories.js';
import '../components/events/events.css';
import OrganizerStreetPlacesField from '../components/events/OrganizerStreetPlacesField.jsx';

const CATEGORY_SELECT_MENU_PROPS = {
  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
  transformOrigin: { vertical: 'top', horizontal: 'left' },
  marginThreshold: 0,
  disablePortal: true,
  slotProps: {
    paper: {
      sx: {
        maxHeight: 200,
        width: 260,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      },
    },
    list: {
      dense: true,
      sx: {
        maxHeight: 200,
        overflowY: 'auto',
        py: 0.5,
      },
    },
  },
};

/** Limit pliku — zgodny z multer na backendzie (10MB); upload idzie na S3, nie w JSON. */
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EVENT_IMAGES = 5;

function makeSlotId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Backend akceptuje tylko URL-e S3/HTTPS — nie data: (base64 w JSON). */
function isHttpImageUrl(u) {
  return /^https?:\/\//i.test(String(u || '').trim());
}

export default function OrganizerCreateEventPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEdit = Boolean(eventId);
  const { user, loading: authLoading } = useAuth();
  const fileInputId = useId();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [price, setPrice] = useState('0');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  /** Współrzędne z API przy edycji (nie edytujemy w formularzu). */
  const [preservedCoords, setPreservedCoords] = useState(null);
  /** Kolejność = kolejność plików; jeden slot ma `id` obrazu okładkowego. */
  const [imageSlots, setImageSlots] = useState(() => []);
  const [coverSlotId, setCoverSlotId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [primaryCustom, setPrimaryCustom] = useState('');
  const [additionalCategories, setAdditionalCategories] = useState([]);
  const [loadingEvent, setLoadingEvent] = useState(() => Boolean(eventId));
  const [loadError, setLoadError] = useState('');
  /** Po wczytaniu edycji: pominięto legacy base64 z API. */
  const [legacyImagesInfo, setLegacyImagesInfo] = useState('');

  const additionalOptions = useMemo(() => {
    const p =
      primaryCategory === 'Inne' ? primaryCustom.trim() : String(primaryCategory || '').trim();
    return EVENT_CATEGORIES.filter((c) => c !== 'Inne' && c !== p);
  }, [primaryCategory, primaryCustom]);

  useEffect(() => {
    return () => {
      imageSlots.forEach((s) => {
        if (s.file && s.preview && s.preview.startsWith('blob:')) URL.revokeObjectURL(s.preview);
      });
    };
  }, [imageSlots]);

  useEffect(() => {
    if (!isEdit || !eventId) return;
    if (authLoading) return;
    if (!user) {
      setLoadingEvent(false);
      setLoadError('Musisz być zalogowany, aby edytować wydarzenie.');
      return;
    }
    let cancelled = false;
    setLoadingEvent(true);
    setLoadError('');
    setLegacyImagesInfo('');
    (async () => {
      try {
        const ev = await fetchEventById(eventId);
        if (cancelled) return;
        const ownerId = ev.organizerId?._id ?? ev.organizerId;
        const uid = user.id ?? user._id;
        if (!uid || String(ownerId) !== String(uid)) {
          setLoadError('Nie masz uprawnień do edycji tego wydarzenia.');
          return;
        }
        setTitle(ev.title || '');
        setDescription(ev.description || '');
        setPrice(
          ev.price == null || Number.isNaN(Number(ev.price))
            ? '0'
            : String(ev.price),
        );
        setCity(ev.city || '');
        const loc = ev.location || {};
        setPreservedCoords(
          typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
            ? { latitude: loc.latitude, longitude: loc.longitude }
            : null,
        );
        setStreet(String(loc.street || '').trim());
        setHouseNumber(String(loc.houseNumber || '').trim());
        setPostalCode(String(loc.postalCode || '').trim());
        if (!String(loc.street || '').trim() && !String(loc.houseNumber || '').trim() && String(loc.address || '').trim()) {
          setStreet(String(loc.address).trim());
        }
        let primary = String(ev.category || '').trim();
        let additional = Array.isArray(ev.categories)
          ? ev.categories.map((c) => String(c || '').trim()).filter(Boolean)
          : [];
        if (primary) {
          additional = additional.filter((c) => c !== primary);
        } else if (additional.length) {
          primary = additional[0];
          additional = additional.slice(1);
        } else {
          primary = '';
        }
        if (primary && EVENT_CATEGORIES.includes(primary) && primary !== 'Inne') {
          setPrimaryCategory(primary);
          setPrimaryCustom('');
        } else if (primary) {
          setPrimaryCategory('Inne');
          setPrimaryCustom(primary);
        } else {
          setPrimaryCategory('');
          setPrimaryCustom('');
        }
        setAdditionalCategories(additional);
        if (ev.date) {
          const d = dayjs(ev.date);
          if (d.isValid()) {
            setEventDate(d.format('YYYY-MM-DD'));
            setEventTime(d.format('HH:mm'));
          }
        }
        const imgsAll = Array.isArray(ev.images)
          ? ev.images.map((u) => String(u || '').trim()).filter(Boolean)
          : [];
        const imgs = imgsAll.filter(isHttpImageUrl);
        if (imgsAll.length > imgs.length) {
          setLegacyImagesInfo(
            'Część zdjęć była zapisana w starym formacie (base64 w bazie) i została pominięta. Dodaj zdjęcia ponownie — zostaną wysłane na S3.',
          );
        }
        const slots = imgs.map((url, i) => {
          let label = `Zdjęcie ${i + 1}`;
          try {
            const seg = url.split('/').pop() || '';
            if (seg) label = decodeURIComponent(seg).slice(0, 48);
          } catch {
            /* ignore */
          }
          return {
            id: `remote-${eventId}-${i}`,
            remoteUrl: url,
            preview: url,
            name: label,
          };
        });
        setImageSlots(slots);
        if (slots.length > 0) {
          const ciRaw = Number(ev.coverImageIndex);
          const oldIdx = imgsAll.length
            ? Math.min(
                Math.max(0, Number.isFinite(ciRaw) ? ciRaw : 0),
                imgsAll.length - 1,
              )
            : 0;
          const urlAtCover = imgsAll[oldIdx];
          let coverIdx = 0;
          if (urlAtCover && isHttpImageUrl(urlAtCover)) {
            const j = imgs.indexOf(urlAtCover);
            coverIdx = j >= 0 ? j : 0;
          }
          setCoverSlotId(slots[coverIdx].id);
        } else {
          setCoverSlotId(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(getUiErrorMessage(e));
        }
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, eventId, user, authLoading]);

  const PICKER_LOCALE_TEXT = {
    ...pickersPlPL.components.MuiLocalizationProvider.defaultProps.localeText,
    fieldHoursPlaceholder: () => '--',
    fieldMinutesPlaceholder: () => '--',
  };

  const handleImageFiles = useCallback((e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    setFormError('');
    if (!raw.length) return;

    setImageSlots((prev) => {
      const remaining = MAX_EVENT_IMAGES - prev.length;
      if (remaining <= 0) {
        setFormError(`Możesz dodać maksymalnie ${MAX_EVENT_IMAGES} zdjęć.`);
        return prev;
      }
      const toAdd = raw.slice(0, remaining);
      for (const file of toAdd) {
        if (!file.type.startsWith('image/')) {
          setFormError('Tylko pliki graficzne (JPG, PNG itd.).');
          return prev;
        }
        if (file.size > MAX_IMAGE_FILE_BYTES) {
          setFormError(
            `Każde zdjęcie może mieć max. ${Math.round(MAX_IMAGE_FILE_BYTES / (1024 * 1024))} MB.`,
          );
          return prev;
        }
      }
      const nextSlots = toAdd.map((file) => ({
        id: makeSlotId(),
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
      }));
      return [...prev, ...nextSlots];
    });
  }, []);

  const removeSlot = useCallback((id) => {
    setImageSlots((prev) => {
      const victim = prev.find((s) => s.id === id);
      if (victim?.file && victim.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(victim.preview);
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  useEffect(() => {
    setCoverSlotId((cid) => {
      if (!imageSlots.length) return null;
      if (cid && imageSlots.some((s) => s.id === cid)) return cid;
      return imageSlots[0].id;
    });
  }, [imageSlots]);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setFormError('');
    if (!title.trim()) {
      setFormError('Podaj nazwę wydarzenia.');
      return;
    }

    let isoDate;
    if (eventDate) {
      const base = dayjs(eventDate, 'YYYY-MM-DD', true);
      const timeMatch = eventTime && /^\d{2}:\d{2}$/.test(eventTime) ? eventTime.split(':').map(Number) : null;
      const withTime =
        base.isValid() && timeMatch
          ? base.hour(timeMatch[0]).minute(timeMatch[1]).second(0).millisecond(0)
          : base;
      if (withTime.isValid()) {
        isoDate = withTime.toDate().toISOString();
      }
    }

    const primaryResolved =
      primaryCategory === 'Inne' ? primaryCustom.trim() : String(primaryCategory || '').trim();
    if (!primaryResolved) {
      setFormError('Wybierz kategorię główną.');
      return;
    }
    const additionalUnique = [
      ...new Set(
        additionalCategories
          .map((c) => String(c || '').trim())
          .filter(Boolean)
          .filter((c) => c !== primaryResolved),
      ),
    ];
    setSaving(true);
    try {
      const normalizedPrice = String(price || '').replace(',', '.').trim();
      const priceNumber = normalizedPrice === '' ? 0 : Number(normalizedPrice);
      if (!Number.isFinite(priceNumber) || priceNumber < 0) {
        setFormError('Podaj poprawną cenę (0 lub więcej).');
        setSaving(false);
        return;
      }

      let imagePayload = {};
      if (imageSlots.length > 0) {
        const validSlots = imageSlots.filter(
          (s) => s.file || (s.remoteUrl && isHttpImageUrl(s.remoteUrl)),
        );
        const files = validSlots.filter((s) => s.file).map((s) => s.file);
        const uploaded = files.length ? await uploadEventImages(files) : [];
        let u = 0;
        const urls = validSlots.map((s) => {
          if (s.file) return uploaded[u++];
          return s.remoteUrl;
        });
        let ci = 0;
        if (urls.length > 0 && coverSlotId) {
          const pos = validSlots.findIndex((s) => s.id === coverSlotId);
          ci = pos >= 0 ? Math.min(pos, urls.length - 1) : 0;
        }
        imagePayload = { images: urls, coverImageIndex: ci };
      } else if (isEdit) {
        imagePayload = { images: [], coverImageIndex: 0 };
      }

      const st = street.trim();
      const hn = houseNumber.trim();
      const pc = postalCode.trim();
      const combinedAddr = [st, hn].filter(Boolean).join(' ').trim();

      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        date: isoDate,
        price: priceNumber,
        ...imagePayload,
        category: primaryResolved,
        categories: additionalUnique.length > 0 ? additionalUnique : undefined,
      };

      if (isEdit) {
        body.location = {
          ...(preservedCoords || {}),
          street: st,
          houseNumber: hn,
          postalCode: pc,
          address: combinedAddr,
        };
      } else if (combinedAddr || st || hn || pc) {
        body.location = {
          ...(st ? { street: st } : {}),
          ...(hn ? { houseNumber: hn } : {}),
          ...(pc ? { postalCode: pc } : {}),
          ...(combinedAddr ? { address: combinedAddr } : {}),
        };
      }

      if (isEdit && eventId) {
        await updateEvent(eventId, body);
      } else {
        await createEvent(body);
      }
      navigate('/organizer');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', {
          state: {
            from:
              isEdit && eventId ? `/organizer/events/${eventId}/edit` : '/organizer/events/create',
          },
        });
        return;
      }
      setFormError(getUiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && (authLoading || loadingEvent)) {
    return (
      <Stack spacing={2} sx={{ maxWidth: { xs: '100%', sm: 560 }, width: '100%', minWidth: 0, mx: 'auto' }}>
        <Typography
          component={RouterLink}
          to="/organizer"
          variant="body2"
          sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
        >
          ← Panel organizatora
        </Typography>
        <Typography color="text.secondary">Ładowanie wydarzenia…</Typography>
      </Stack>
    );
  }

  if (isEdit && loadError) {
    return (
      <Stack spacing={2} sx={{ maxWidth: { xs: '100%', sm: 560 }, width: '100%', minWidth: 0, mx: 'auto' }}>
        <Typography
          component={RouterLink}
          to="/organizer"
          variant="body2"
          sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
        >
          ← Panel organizatora
        </Typography>
        <Alert severity="error">{loadError}</Alert>
        <Button component={RouterLink} to="/organizer" variant="outlined">
          Wróć do panelu
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} component="div" sx={{ maxWidth: { xs: '100%', sm: 560 }, width: '100%', minWidth: 0, mx: 'auto' }}>
      <Typography
        component={RouterLink}
        to="/organizer"
        variant="body2"
        sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
      >
        ← Panel organizatora
      </Typography>

      <header className="mm-page-header">
        <h1 className="mm-page-title">{isEdit ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}</h1>
      </header>

      {formError ? (
        <Alert severity="error" role="alert">
          {formError}
        </Alert>
      ) : null}
      {legacyImagesInfo ? (
        <Alert severity="info" onClose={() => setLegacyImagesInfo('')} role="status">
          {legacyImagesInfo}
        </Alert>
      ) : null}
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
        <Input
          label="Nazwa wydarzenia"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          margin="none"
          disabled={saving}
        />
        <Input
          label="Opis"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={4}
          margin="none"
          disabled={saving}
        />
        <Input
          label="Cena (zł)"
          name="price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          margin="none"
          disabled={saving}
          inputProps={{ min: 0, step: '0.01' }}
          helperText="Wpisz 0, jeśli wydarzenie jest bezpłatne."
        />
        <Stack spacing={0.5}>
          <Typography
            component="label"
            variant="body2"
            htmlFor="mm-organizer-event-primary-category"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              lineHeight: 1.2,
              color: 'text.secondary',
              pl: 0.25,
            }}
          >
            Kategoria główna
          </Typography>
          <FormControl fullWidth size="small" disabled={saving}>
            <Select
              id="mm-organizer-event-primary-category"
              value={primaryCategory}
              onChange={(e) => {
                setPrimaryCategory(e.target.value);
                if (e.target.value !== 'Inne') setPrimaryCustom('');
              }}
              input={<OutlinedInput />}
              displayEmpty
              MenuProps={CATEGORY_SELECT_MENU_PROPS}
              renderValue={(selected) =>
                selected ? (
                  selected
                ) : (
                  <Typography component="span" color="text.secondary">
                    Wybierz kategorię
                  </Typography>
                )
              }
              inputProps={{ 'aria-label': 'Kategoria główna wydarzenia' }}
            >
              <MenuItem value="">
                <em>Wybierz kategorię</em>
              </MenuItem>
              {EVENT_CATEGORIES.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        {primaryCategory === 'Inne' ? (
          <Input
            label="Nazwa kategorii głównej"
            name="primaryCustom"
            value={primaryCustom}
            onChange={(e) => setPrimaryCustom(e.target.value)}
            placeholder="Wpisz własną kategorię"
            margin="none"
            disabled={saving}
          />
        ) : null}
        <Autocomplete
          multiple
          freeSolo
          options={additionalOptions}
          value={additionalCategories}
          onChange={(_, v) =>
            setAdditionalCategories(
              v.map((x) => String(x ?? '').trim()).filter(Boolean),
            )
          }
          disabled={saving}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Dodatkowe kategorie"
              placeholder="Wybierz lub wpisz własne"
              size="small"
            />
          )}
        />
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pl" localeText={PICKER_LOCALE_TEXT}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: { sm: 'flex-start' } }}
          >
            <Stack spacing={0.5} sx={{ flex: { sm: '1 1 200px' }, minWidth: { sm: 180 } }}>
              <Typography
                component="label"
                variant="body2"
                htmlFor="mm-organizer-event-date"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  lineHeight: 1.2,
                  color: 'text.secondary',
                  pl: 0.25,
                }}
              >
                Data
              </Typography>
              <DatePicker
                id="mm-organizer-event-date"
                value={eventDate ? dayjs(eventDate, 'YYYY-MM-DD', true) : null}
                onChange={(next) => {
                  const v =
                    next && typeof next.isValid === 'function' && next.isValid()
                      ? next.format('YYYY-MM-DD')
                      : '';
                  setEventDate(v);
                }}
                format="DD.MM.YYYY"
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    placeholder: 'np. 16.04.2026',
                    inputProps: { 'aria-label': 'Data wydarzenia' },
                    sx: {
                      '& .MuiOutlinedInput-root': { minHeight: 40 },
                      '& .MuiOutlinedInput-input': { py: '10.25px' },
                    },
                  },
                }}
                disabled={saving}
              />
            </Stack>
            <Stack spacing={0.5} sx={{ flex: { sm: '0 1 170px' }, minWidth: { xs: '100%', sm: 170 } }}>
              <Typography
                component="label"
                variant="body2"
                htmlFor="mm-organizer-event-time"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  lineHeight: 1.2,
                  color: 'text.secondary',
                  pl: 0.25,
                }}
              >
                Godzina
              </Typography>
              <TimeField
                ampm={false}
                value={
                  eventTime && /^\d{2}:\d{2}$/.test(eventTime)
                    ? dayjs().hour(Number(eventTime.slice(0, 2))).minute(Number(eventTime.slice(3, 5)))
                    : null
                }
                onChange={(next) => {
                  const v =
                    next && typeof next.isValid === 'function' && next.isValid()
                      ? next.format('HH:mm')
                      : '';
                  setEventTime(v);
                }}
                format="HH:mm"
                id="mm-organizer-event-time"
                name="time"
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    placeholder: 'np. 18:30',
                    inputProps: { 'aria-label': 'Godzina wydarzenia' },
                    sx: {
                      '& .MuiOutlinedInput-root': { minHeight: 40 },
                      '& .MuiOutlinedInput-input': { py: '10.25px' },
                    },
                  },
                }}
                disabled={saving}
              />
            </Stack>
          </Stack>
        </LocalizationProvider>
        <Input
          label="Miasto"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          margin="none"
          disabled={saving}
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          useFlexGap
          sx={{ alignItems: { sm: 'flex-start' } }}
        >
          <OrganizerStreetPlacesField
            street={street}
            onStreetChange={setStreet}
            onAddressSelected={({ city: nextCity, street: nextStreet, houseNumber, postalCode: nextPostal }) => {
              if (nextCity) setCity(nextCity);
              setStreet(nextStreet);
              setHouseNumber(houseNumber);
              if (nextPostal) setPostalCode(nextPostal);
            }}
            disabled={saving}
          />
          <Box sx={{ width: { xs: '100%', sm: 140 }, flexShrink: 0 }}>
            <Input
              label="Numer domu"
              name="houseNumber"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              placeholder="np. 12A"
              margin="none"
              disabled={saving}
            />
          </Box>
        </Stack>
        <Input
          label="Kod pocztowy"
          name="postalCode"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="np. 80-830"
          margin="none"
          disabled={saving}
        />

        <Box>
          <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500, color: 'text.secondary' }} component="div">
            Zdjęcia (opcjonalnie)
          </Typography>
          <Stack spacing={1.5}>
            <Typography variant="caption" color="text.secondary" display="block">
              Do {MAX_EVENT_IMAGES} zdjęć, każde do {Math.round(MAX_IMAGE_FILE_BYTES / (1024 * 1024))} MB. Oznacz gwiazdką zdjęcie główne (okładka na listach).
            </Typography>
            <Button
              variant="outlined"
              component="label"
              disabled={saving || imageSlots.length >= MAX_EVENT_IMAGES}
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, width: { xs: '100%', sm: 'auto' } }}
            >
              Dodaj zdjęcia
              <input
                id={fileInputId}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageFiles}
              />
            </Button>
            {imageSlots.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 1 }}>
                {imageSlots.map((slot) => {
                  const isCover = coverSlotId === slot.id;
                  return (
                    <Box
                      key={slot.id}
                      sx={{
                        position: 'relative',
                        width: 112,
                        flexShrink: 0,
                        borderRadius: 1,
                        border: 1,
                        borderColor: isCover ? 'primary.main' : 'divider',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        component="img"
                        src={slot.preview}
                        alt=""
                        sx={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }}
                      />
                      <Stack
                        direction="row"
                        alignItems="center"
                        sx={{ width: '100%', px: 0.5, py: 0.25, bgcolor: 'grey.50', boxSizing: 'border-box' }}
                      >
                        <Button
                          type="button"
                          variant="text"
                          size="small"
                          sx={{ minWidth: 0, p: 0.25, flexShrink: 0 }}
                          disabled={saving}
                          onClick={() => removeSlot(slot.id)}
                        >
                          Usuń
                        </Button>
                        <Box aria-hidden sx={{ flex: '1 1 auto', minWidth: 8 }} />
                        <Tooltip title={isCover ? 'Zdjęcie główne' : 'Ustaw jako główne'}>
                          <span>
                            <IconButton
                              type="button"
                              size="small"
                              color={isCover ? 'primary' : 'default'}
                              aria-label={isCover ? 'Główne zdjęcie' : 'Ustaw jako główne'}
                              onClick={() => setCoverSlotId(slot.id)}
                              disabled={saving}
                              sx={{ p: 0.25, flexShrink: 0 }}
                            >
                              {isCover ? (
                                <StarIcon sx={{ fontSize: 20 }} />
                              ) : (
                                <StarBorderIcon sx={{ fontSize: 20 }} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                      <Typography variant="caption" noWrap sx={{ display: 'block', px: 0.5, pb: 0.25, maxWidth: 112 }} title={slot.name}>
                        {slot.name}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            ) : null}
          </Stack>
        </Box>

        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
        >
          {saving ? 'Przesyłanie i zapisywanie…' : isEdit ? 'Zapisz zmiany' : 'Zapisz'}
        </Button>
      </Stack>
    </Stack>
  );
}
