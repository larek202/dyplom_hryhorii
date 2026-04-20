/* global google */
import { useEffect, useRef } from 'react';
import { Box, TextField } from '@mui/material';
import './googlePlacesAutocomplete.css';
import { useJsApiLoader } from '@react-google-maps/api';
import { parseFilterAddressLineFromPlace } from './googlePlacesAddress.js';
import { GOOGLE_PLACES_SCRIPT_ID } from './googleMapsLoaderId.js';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function StreetStaticField({ value, onChange, id }) {
  return (
    <TextField
      id={id}
      name="address"
      size="small"
      variant="outlined"
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="np. Długa 12"
      slotProps={{ htmlInput: { maxLength: 120, 'aria-label': 'Filtr ulicy i numeru' } }}
      sx={{
        '& .MuiOutlinedInput-root': { minHeight: 40 },
        '& .MuiOutlinedInput-input': { py: '10.25px' },
      }}
    />
  );
}

function StreetGooglePlacesField({ value, onChange, id }) {
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
      componentRestrictions: { country: 'pl' },
      fields: ['address_components', 'formatted_address', 'name'],
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const line = parseFilterAddressLineFromPlace(place);
      if (line && onChangeRef.current) {
        onChangeRef.current(line);
      }
    });

    return () => {
      try {
        if (typeof google !== 'undefined' && google.maps?.event) {
          google.maps.event.clearInstanceListeners(autocomplete);
        }
      } catch {
        /* Places już odmontowane */
      }
    };
  }, [isLoaded, loadError]);

  if (loadError) {
    return <StreetStaticField value={value} onChange={onChange} id={id} />;
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
        name="address"
        size="small"
        variant="outlined"
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Wpisz ulicę i numer"
        disabled={!isLoaded}
        helperText={!isLoaded ? 'Ładowanie podpowiedzi…' : undefined}
        slotProps={{
          htmlInput: {
            maxLength: 120,
            autoComplete: 'off',
            'aria-label': 'Filtr ulicy i numeru',
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

/**
 * @param {{ value: string; onChange: (address: string) => void; id?: string }} props
 */
export function StreetFilterField({ value, onChange, id = 'mm-filter-address' }) {
  if (!GOOGLE_KEY) {
    return <StreetStaticField value={value} onChange={onChange} id={id} />;
  }
  return <StreetGooglePlacesField value={value} onChange={onChange} id={id} />;
}
