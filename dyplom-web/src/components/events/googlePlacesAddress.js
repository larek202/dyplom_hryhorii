/**
 * Парсинг результатів Google Places для польських адрес (місто, вулиця, номер, kod pocztowy).
 */

/** @param {google.maps.places.PlaceResult | null | undefined} place */
export function parseCityFromPlace(place) {
  const comps = place?.address_components;
  if (!comps || !Array.isArray(comps)) return '';
  let city = '';
  for (const c of comps) {
    const types = c.types || [];
    if (!city && types.includes('locality')) city = c.long_name;
    else if (!city && types.includes('administrative_area_level_2')) city = c.long_name;
  }
  if (city) return city;
  const formatted = place?.formatted_address;
  if (formatted) return formatted.split(',')[0]?.trim() || '';
  return place?.name || '';
}

/** Один рядок для фільтра «Ulica i numer» (np. „Długa 12”). */
/** @param {google.maps.places.PlaceResult | null | undefined} place */
export function parseFilterAddressLineFromPlace(place) {
  const comps = place?.address_components;
  let route = '';
  let streetNumber = '';
  let subpremise = '';
  if (comps && Array.isArray(comps)) {
    for (const c of comps) {
      const types = c.types || [];
      if (types.includes('route')) route = c.long_name;
      if (types.includes('street_number')) streetNumber = c.long_name;
      if (types.includes('subpremise')) subpremise = c.long_name;
    }
  }
  const num = subpremise ? `${streetNumber}/${subpremise}` : streetNumber;
  const line = [route, num].filter(Boolean).join(' ').trim();
  if (line) return line;
  const fa = String(place?.formatted_address || '');
  if (fa) {
    const first = fa.split(',').map((s) => s.trim())[0];
    if (first) return first;
  }
  return String(place?.name || '').trim();
}

/** Поля локації для форми організатора при виборі адреси з підказки. */
/** @param {google.maps.places.PlaceResult | null | undefined} place */
export function parseStructuredAddressFromPlace(place) {
  const comps = place?.address_components;
  let route = '';
  let streetNumber = '';
  let subpremise = '';
  let postalCode = '';
  if (comps && Array.isArray(comps)) {
    for (const c of comps) {
      const types = c.types || [];
      if (types.includes('route')) route = c.long_name;
      if (types.includes('street_number')) streetNumber = c.long_name;
      if (types.includes('subpremise')) subpremise = c.long_name;
      if (types.includes('postal_code')) postalCode = c.long_name;
    }
  }
  const houseNumber = subpremise ? `${streetNumber}/${subpremise}` : streetNumber;
  const city = parseCityFromPlace(place);
  return {
    city: city || '',
    street: route || '',
    houseNumber: houseNumber || '',
    postalCode: postalCode || '',
  };
}
