/**
 * Forward geokodowanie (adres → współrzędne) przez Nominatim OSM.
 * Ogranicz częstość żądań (np. ~1/s) — patrz wywołanie w EventsMapPanel.
 * W przeglądarce nie ustawiamy nagłówka User-Agent (jest zablokowany).
 */

/**
 * @param {string} query
 * @returns {Promise<{ lat: number; lng: number } | null>}
 */
export async function nominatimForwardGeocode(query) {
  const q = String(query || '').trim();
  if (!q) return null;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'pl');

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pl',
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first) return null;
  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
