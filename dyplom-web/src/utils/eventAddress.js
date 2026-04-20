/**
 * Jedna linia: ulica + numer (lub legacy `location.address`).
 * @param {{ location?: { street?: string; houseNumber?: string; address?: string } }} event
 */
export function formatEventStreetLine(event) {
  const loc = event?.location || {};
  const s = String(loc.street || '').trim();
  const h = String(loc.houseNumber || '').trim();
  const combined = [s, h].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  return String(loc.address || '').trim();
}

/**
 * Pełny adres do Google Maps (ulica, numer, kod, miasto).
 * @param {{ city?: string; location?: { street?: string; houseNumber?: string; address?: string; postalCode?: string } }} event
 */
export function buildGoogleMapsSearchQuery(event) {
  const loc = event?.location || {};
  const streetLine = [loc.street, loc.houseNumber].filter(Boolean).join(' ').trim();
  const line = streetLine || String(loc.address || '').trim();
  const parts = [line, loc.postalCode, event?.city]
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  return parts.join(', ');
}
