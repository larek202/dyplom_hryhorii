/* global google */
import { useEffect, useRef } from 'react';
import { Autocomplete, Box, TextField } from '@mui/material';
import './googlePlacesAutocomplete.css';
import { useJsApiLoader } from '@react-google-maps/api';
import { getPolishCityOptions } from './polishCities.js';
import { parseCityFromPlace } from './googlePlacesAddress.js';
import { GOOGLE_PLACES_SCRIPT_ID } from './googleMapsLoaderId.js';

const CITY_SUGGESTIONS = getPolishCityOptions();

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function CityStaticAutocomplete({ value, onChange, id }) {
  return (
    <Autocomplete
      freeSolo
      id={id}
      options={CITY_SUGGESTIONS}
      value={value}
      onChange={(_, newValue) => {
        onChange(typeof newValue === 'string' ? newValue : '');
      }}
      onInputChange={(_, newInputValue) => {
        onChange(newInputValue);
      }}
      selectOnFocus
      handleHomeEndKeys
      noOptionsText="Brak dopasowań — możesz wpisać własne miasto"
      filterOptions={(opts, state) => {
        const q = state.inputValue.trim().toLowerCase();
        if (!q) return opts.slice(0, 24);
        return opts.filter((o) => o.toLowerCase().includes(q)).slice(0, 40);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          name="city"
          size="small"
          variant="outlined"
          fullWidth
          placeholder="Np. Warszawa"
          slotProps={{
            ...params.slotProps,
            htmlInput: {
              ...params.slotProps?.htmlInput,
              maxLength: 80,
              'aria-label': 'Filtr miasta wydarzenia',
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': { minHeight: 40 },
            '& .MuiOutlinedInput-input': { py: '10.25px' },
          }}
        />
      )}
    />
  );
}

function CityGooglePlacesField({ value, onChange, id }) {
  const inputRef = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_PLACES_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_KEY,
    libraries: ['places'],
    language: 'pl',
    region: 'PL',
  });

  useEffect(() => {
    if (!isLoaded || loadError || !inputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['(cities)'],
      fields: ['address_components', 'formatted_address', 'name'],
    });
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const city = parseCityFromPlace(place);
      if (city && onChangeRef.current) {
        onChangeRef.current(city);
      }
    });

    return () => {
      listener.remove();
    };
  }, [isLoaded, loadError]);

  if (loadError) {
    return <CityStaticAutocomplete value={value} onChange={onChange} id={id} />;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: 30,
        width: '100%',
      }}
    >
      <TextField
        inputRef={inputRef}
        id={id}
        name="city"
        size="small"
        variant="outlined"
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Wpisz miasto"
        disabled={!isLoaded}
        helperText={!isLoaded ? 'Ładowanie podpowiedzi…' : undefined}
        slotProps={{
          htmlInput: {
            maxLength: 80,
            autoComplete: 'off',
            'aria-label': 'Filtr miasta wydarzenia',
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': { minHeight: 40 },
          '& .MuiOutlinedInput-input': { py: '10.25px' },
        }}
      />
    </Box>
  );
}

export function CityFilterField({ value, onChange, id }) {
  if (!GOOGLE_KEY) {
    return <CityStaticAutocomplete value={value} onChange={onChange} id={id} />;
  }
  return <CityGooglePlacesField value={value} onChange={onChange} id={id} />;
}
