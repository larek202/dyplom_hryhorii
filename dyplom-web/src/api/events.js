import { apiRequest } from '../services/api.js';

export function fetchEvents(params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.city) q.set('city', String(params.city).trim());
  if (params.address) q.set('address', String(params.address).trim());
  if (params.search) q.set('search', String(params.search).trim());
  if (Array.isArray(params.categories) && params.categories.length) {
    q.set(
      'categories',
      params.categories.map((x) => String(x).trim()).filter(Boolean).join(','),
    );
  } else if (params.category) {
    q.set('category', String(params.category).trim());
  }
  if (params.date) q.set('date', String(params.date).trim());
  if (params.organizerId) q.set('organizerId', params.organizerId);
  const qs = q.toString();
  return apiRequest(`/api/events${qs ? `?${qs}` : ''}`);
}

/** Pojedyncze wydarzenie (publiczne GET). */
export function fetchEventById(id) {
  if (!id) return Promise.reject(new Error('Brak identyfikatora wydarzenia'));
  return apiRequest(`/api/events/${encodeURIComponent(id)}`);
}

/** Tworzenie wydarzenia (wymaga tokenu, roli organizatora). */
export function createEvent(body) {
  return apiRequest('/api/events', { method: 'POST', body });
}

/** Aktualizacja wydarzenia (wymaga tokenu; tylko właściciel). */
export function updateEvent(id, body) {
  if (!id) return Promise.reject(new Error('Brak identyfikatora wydarzenia'));
  return apiRequest(`/api/events/${encodeURIComponent(id)}`, { method: 'PUT', body });
}

/** Usunięcie wydarzenia (wymaga tokenu; tylko właściciel). */
export function deleteEvent(id) {
  if (!id) return Promise.reject(new Error('Brak identyfikatora wydarzenia'));
  return apiRequest(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * Przesyła zdjęcia na S3 (POST /api/upload, pole `images`). Kolejność URL-i = kolejność plików.
 * @param {File[]} files
 * @returns {Promise<string[]>}
 */
export async function uploadEventImages(files) {
  if (!files?.length) return [];
  const fd = new FormData();
  files.forEach((f) => fd.append('images', f));
  const data = await apiRequest('/api/upload', { method: 'POST', body: fd });
  const urls = data?.images;
  return Array.isArray(urls) ? urls.map((u) => String(u || '').trim()).filter(Boolean) : [];
}
