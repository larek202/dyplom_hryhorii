/** Fallback jak w filtrze wydarzeń / EventsPage (domyślne miasto). */
export const DEFAULT_MAP_FALLBACK_CITY = 'Gdańsk';

/** Środek mapy przy braku geolokalizacji (przybliżony środek Gdańska). */
export const GDANSK_CENTER = { lat: 54.3523, lng: 18.6492 };

export const GEOLOCATION_GET_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 5 * 60 * 1000,
};
