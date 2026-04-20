import {
  Box,
  Button,
  Checkbox,
  FormControl,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { plPL as pickersPlPL } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import { CityFilterField } from '../events/CityFilterField.jsx';
import { EVENT_CATEGORIES } from '../../constants/categories.js';

const CATEGORY_OPTIONS = EVENT_CATEGORIES.filter((c) => c && c !== 'Inne');

const FILTER_LABEL_SX = {
  fontSize: '0.75rem',
  fontWeight: 600,
  lineHeight: 1.2,
  color: 'text.secondary',
  pl: 0.25,
};

const PICKER_LOCALE_TEXT = {
  ...pickersPlPL.components.MuiLocalizationProvider.defaultProps.localeText,
  fieldHoursPlaceholder: () => '--',
  fieldMinutesPlaceholder: () => '--',
};

function FilterCol({ label, htmlFor, children, sx = {} }) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0, ...sx }}>
      <Typography component="label" variant="body2" htmlFor={htmlFor} sx={FILTER_LABEL_SX}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

function parseDateValue(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = dayjs(value, 'YYYY-MM-DD', true);
  return parsed.isValid() ? parsed : null;
}

/**
 * @param {{
 *   values: { category: string[]; city: string; date: string };
 *   onChange: (next: { category: string[]; city: string; date: string }) => void;
 *   onSubmit: () => void;
 *   onClear?: () => void;
 *   disabled?: boolean;
 * }} props
 */
export default function MapEventsFilters({ values, onChange, onSubmit, onClear, disabled = false }) {
  function setCategoryField(event) {
    const selected = event.target.value;
    const next = Array.isArray(selected) ? selected : String(selected).split(',');
    onChange({ ...values, category: next });
  }

  function setDateField(nextValue) {
    const next =
      nextValue && typeof nextValue.isValid === 'function' && nextValue.isValid()
        ? nextValue.format('YYYY-MM-DD')
        : '';
    onChange({ ...values, date: next });
  }

  const hasAny =
    values.city.trim() ||
    (Array.isArray(values.category) && values.category.length > 0) ||
    values.date.trim();

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSubmit();
      }}
      sx={{
        mb: 2.5,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: (t) => t.shadows[1],
      }}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pl" localeText={PICKER_LOCALE_TEXT}>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
              alignItems: 'start',
            }}
          >
            <FilterCol label="Miasto" htmlFor="mm-map-filter-city">
              <CityFilterField
                id="mm-map-filter-city"
                value={values.city}
                onChange={(city) => onChange({ ...values, city })}
              />
            </FilterCol>
            <FilterCol label="Kategoria" htmlFor="mm-map-filter-category">
              <FormControl fullWidth size="small">
                <Select
                  id="mm-map-filter-category"
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
                        sx: { maxHeight: 280, width: 260 },
                      },
                      list: { dense: true, sx: { maxHeight: 280, overflowY: 'auto', py: 0.5 } },
                    },
                  }}
                  renderValue={(selected) =>
                    selected.length === 0 ? (
                      <Typography component="span" color="text.secondary">
                        Wszystkie
                      </Typography>
                    ) : (
                      selected.join(', ')
                    )
                  }
                  inputProps={{ 'aria-label': 'Filtr kategorii' }}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      <Checkbox checked={values.category.includes(option)} size="small" />
                      <ListItemText primary={option} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FilterCol>
            <FilterCol label="Data wydarzenia" htmlFor="mm-map-filter-date">
              <DatePicker
                id="mm-map-filter-date"
                value={parseDateValue(values.date)}
                onChange={setDateField}
                format="DD.MM.YYYY"
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    placeholder: 'Dowolna',
                    inputProps: { 'aria-label': 'Data wydarzenia' },
                    sx: {
                      '& .MuiOutlinedInput-root': { minHeight: 40 },
                    },
                  },
                }}
              />
            </FilterCol>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
          >
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={disabled}
              sx={{ fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}
            >
              Zastosuj filtry
            </Button>
            {onClear ? (
              <Button
                type="button"
                variant="text"
                color="inherit"
                disabled={!hasAny}
                onClick={onClear}
                sx={{ fontWeight: 600, alignSelf: { xs: 'center', sm: 'auto' } }}
              >
                Wyczyść
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </LocalizationProvider>
    </Box>
  );
}
