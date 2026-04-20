import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimeField } from '@mui/x-date-pickers/TimeField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { plPL as pickersPlPL } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import { CityFilterField } from './CityFilterField.jsx';
import { StreetFilterField } from './StreetFilterField.jsx';
import { EVENT_CATEGORIES, POPULAR_CATEGORY_CHIPS } from '../../constants/categories.js';

const FILTER_LABEL_SX = {
  fontSize: '0.75rem',
  fontWeight: 500,
  lineHeight: 1.2,
  color: 'text.secondary',
  pl: 0.25,
};
const PICKER_LOCALE_TEXT = {
  ...pickersPlPL.components.MuiLocalizationProvider.defaultProps.localeText,
  fieldHoursPlaceholder: () => '--',
  fieldMinutesPlaceholder: () => '--',
};
const CATEGORY_OPTIONS = EVENT_CATEGORIES.filter((c) => c && c !== 'Inne');

function parseTimeValue(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hh, mm] = value.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return dayjs().hour(hh).minute(mm).second(0).millisecond(0);
}

function parseDateValue(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = dayjs(value, 'YYYY-MM-DD', true);
  return parsed.isValid() ? parsed : null;
}

/** Etykieta nad polem — ten sam układ dla wszystkich filtrów (wyrównanie w rzędzie). */
function FilterColumn({ label, htmlFor, children, sx = {} }) {
  return (
    <Stack spacing={0.5} sx={sx}>
      <Typography component="label" variant="body2" htmlFor={htmlFor} sx={FILTER_LABEL_SX}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

function hasActiveFilterValues(values) {
  if (values.search.trim()) return true;
  if (Array.isArray(values.category) && values.category.length > 0) return true;
  if (values.city.trim()) return true;
  if (values.address.trim()) return true;
  if (values.date.trim()) return true;
  if (values.fromTime.trim()) return true;
  if (values.toTime.trim()) return true;
  return false;
}

/**
 * @param {{
 *   values: { search: string; category: string[]; city: string; address: string; date: string; fromTime: string; toTime: string };
 *   onChange: (next: { search: string; category: string[]; city: string; address: string; date: string; fromTime: string; toTime: string }) => void;
 *   onSubmit: () => void;
 *   onClear?: () => void;
 *   submitDisabled?: boolean;
 * }} props
 */
export default function EventFilters({ values, onChange, onSubmit, onClear, submitDisabled }) {
  function setField(key) {
    return (e) => {
      onChange({ ...values, [key]: e.target.value });
    };
  }

  function setTimeField(key) {
    return (nextValue) => {
      const next =
        nextValue && typeof nextValue.isValid === 'function' && nextValue.isValid()
          ? nextValue.format('HH:mm')
          : '';
      onChange({ ...values, [key]: next });
    };
  }

  function setDateField(nextValue) {
    const next =
      nextValue && typeof nextValue.isValid === 'function' && nextValue.isValid()
        ? nextValue.format('YYYY-MM-DD')
        : '';
    onChange({ ...values, date: next });
  }

  function setCategoryField(event) {
    const selected = event.target.value;
    const next = Array.isArray(selected) ? selected : String(selected).split(',');
    onChange({ ...values, category: next });
  }

  function togglePopularCategory(cat) {
    const set = new Set(values.category);
    if (set.has(cat)) set.delete(cat);
    else set.add(cat);
    onChange({ ...values, category: [...set] });
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      aria-label="Filtry wydarzeń"
      sx={{
        mb: 3.5,
        borderRadius: 3,
        bgcolor: 'background.paper',
        boxShadow: (t) => t.shadows[2],
        border: (t) => `1px solid ${t.palette.divider}`,
        px: { xs: 2, sm: 2.5, md: 3 },
        py: { xs: 2, sm: 2.5, md: 3 },
      }}
    >
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            Popularne kategorie
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {POPULAR_CATEGORY_CHIPS.map((c) => {
              const active = values.category.includes(c);
              return (
                <Chip
                  key={c}
                  label={c}
                  size="small"
                  onClick={() => togglePopularCategory(c)}
                  color={active ? 'primary' : 'default'}
                  variant={active ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700 }}
                />
              );
            })}
          </Stack>
        </Box>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pl" localeText={PICKER_LOCALE_TEXT}>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                  lg: 'repeat(5, minmax(0, 1fr))',
                },
                alignItems: 'start',
              }}
            >
              <FilterColumn label="Szukaj" htmlFor="mm-filter-search" sx={{ minWidth: 0 }}>
                <TextField
                  id="mm-filter-search"
                  name="search"
                  value={values.search}
                  onChange={setField('search')}
                  size="small"
                  variant="outlined"
                  fullWidth
                  placeholder="Tytuł, opis, miasto, ulica…"
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
              </FilterColumn>
              <FilterColumn label="Kategoria" htmlFor="mm-filter-category" sx={{ minWidth: 0 }}>
                <FormControl fullWidth size="small">
                  <Select
                    id="mm-filter-category"
                    name="category"
                    multiple
                    value={values.category}
                    onChange={setCategoryField}
                    input={<OutlinedInput />}
                    displayEmpty
                    MenuProps={{
                      anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                      transformOrigin: { vertical: 'top', horizontal: 'left' },
                      marginThreshold: 0,
                      disablePortal: true,
                      slotProps: {
                        paper: {
                          sx: {
                            maxHeight: 300,
                            width: 260,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                          },
                        },
                        list: {
                          dense: true,
                          sx: {
                            maxHeight: 300,
                            overflowY: 'auto',
                            py: 0.5,
                          },
                        },
                      },
                    }}
                    renderValue={(selected) =>
                      selected.length === 0 ? (
                        <Typography component="span" color="text.secondary">
                          Wybierz kategorie
                        </Typography>
                      ) : (
                        selected.join(', ')
                      )
                    }
                    inputProps={{ 'aria-label': 'Filtr kategorii wydarzenia' }}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        <Checkbox checked={values.category.includes(option)} size="small" />
                        <ListItemText primary={option} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </FilterColumn>
              <FilterColumn label="Miasto" htmlFor="mm-filter-city" sx={{ minWidth: 0 }}>
                <CityFilterField
                  id="mm-filter-city"
                  value={values.city}
                  onChange={(city) => onChange({ ...values, city })}
                />
              </FilterColumn>
              <FilterColumn label="Ulica i numer" htmlFor="mm-filter-address" sx={{ minWidth: 0 }}>
                <StreetFilterField
                  id="mm-filter-address"
                  value={values.address}
                  onChange={(address) => onChange({ ...values, address })}
                />
              </FilterColumn>
              <FilterColumn label="Data" htmlFor="mm-event-filter-date" sx={{ minWidth: 0 }}>
                <DatePicker
                  id="mm-event-filter-date"
                  name="date"
                  value={parseDateValue(values.date)}
                  onChange={setDateField}
                  format="DD.MM.YYYY"
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      placeholder: 'np. 16.04.2026',
                      inputProps: { 'aria-label': 'Filtr daty wydarzenia' },
                      sx: {
                        '& .MuiOutlinedInput-root': { minHeight: 40 },
                        '& .MuiOutlinedInput-input': { py: '10.25px' },
                      },
                    },
                  }}
                />
              </FilterColumn>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'flex-start',
              }}
            >
              <FilterColumn
                label="Od godziny"
                htmlFor="mm-filter-from-time"
                sx={{ width: { xs: '100%', sm: 200 }, minWidth: 0, flexShrink: 0 }}
              >
                <TimeField
                  ampm={false}
                  value={parseTimeValue(values.fromTime)}
                  onChange={setTimeField('fromTime')}
                  format="HH:mm"
                  id="mm-filter-from-time"
                  name="fromTime"
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      placeholder: 'np. 09:00',
                      inputProps: { 'aria-label': 'Filtr od godziny wydarzenia' },
                      sx: {
                        '& .MuiOutlinedInput-root': { minHeight: 40 },
                        '& .MuiOutlinedInput-input': { py: '10.25px' },
                      },
                    },
                  }}
                />
              </FilterColumn>
              <FilterColumn
                label="Do godziny"
                htmlFor="mm-filter-to-time"
                sx={{ width: { xs: '100%', sm: 200 }, minWidth: 0, flexShrink: 0 }}
              >
                <TimeField
                  ampm={false}
                  value={parseTimeValue(values.toTime)}
                  onChange={setTimeField('toTime')}
                  format="HH:mm"
                  id="mm-filter-to-time"
                  name="toTime"
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      placeholder: 'np. 18:30',
                      inputProps: { 'aria-label': 'Filtr do godziny wydarzenia' },
                      sx: {
                        '& .MuiOutlinedInput-root': { minHeight: 40 },
                        '& .MuiOutlinedInput-input': { py: '10.25px' },
                      },
                    },
                  }}
                />
              </FilterColumn>
            </Box>
          </Stack>
        </LocalizationProvider>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'center' } }}
        >
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={Boolean(submitDisabled)}
            fullWidth
            sx={{ fontWeight: 600, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 140 } }}
          >
            Filtruj
          </Button>
          {onClear ? (
            <Button
              type="button"
              variant="text"
              color="inherit"
              disabled={Boolean(submitDisabled) || !hasActiveFilterValues(values)}
              onClick={() => onClear()}
              sx={{ fontWeight: 600, alignSelf: { xs: 'center', sm: 'auto' } }}
            >
              Wyczyść filtry
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}

