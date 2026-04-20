/* global google */
import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import './googlePlacesAutocomplete.css';
import { useJsApiLoader } from '@react-google-maps/api';
import { parseStructuredAddressFromPlace } from './googlePlacesAddress.js';
import { GOOGLE_PLACES_SCRIPT_ID } from './googleMapsLoaderId.js';
import { Input } from '../../ui';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Поле «Ulica» з підказками Google Places; при виборі заповнює місто, ulicę, numer, kod pocztowy.
 *
 * @param {{
 *   id?: string;
 *   disabled?: boolean;
 *   street: string;
 *   onStreetChange: (v: string) => void;
 *   onAddressSelected: (p: { city: string; street: string; houseNumber: string; postalCode: string }) => void;
 * }} props
 */
export default function OrganizerStreetPlacesField({
  id = 'mm-organizer-street',
  disabled = false,
  street,
  onStreetChange,
  onAddressSelected,
}) {
  const inputRef = useRef(null);
  const onAddressSelectedRef = useRef(onAddressSelected);

  useEffect(() => {
    onAddressSelectedRef.current = onAddressSelected;
  }, [onAddressSelected]);

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
      const parsed = parseStructuredAddressFromPlace(place);
      if (onAddressSelectedRef.current) {
        onAddressSelectedRef.current(parsed);
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

  if (!GOOGLE_KEY || loadError) {
    return (
      <Box sx={{ flex: '1 1 0', minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
        <Input
          id={id}
          label="Ulica"
          name="street"
          value={street}
          onChange={(e) => onStreetChange(e.target.value)}
          placeholder="np. ul. Długa"
          margin="none"
          disabled={disabled}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: '1 1 0', minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
      <Input
        inputRef={inputRef}
        id={id}
        label="Ulica"
        name="street"
        value={street}
        onChange={(e) => onStreetChange(e.target.value)}
        placeholder="Wpisz ulicę (podpowiedzi z map)"
        margin="none"
        disabled={disabled || !isLoaded}
        helperText={!isLoaded && !disabled ? 'Ładowanie podpowiedzi…' : undefined}
        slotProps={{ htmlInput: { autoComplete: 'off' } }}
      />
    </Box>
  );
}
