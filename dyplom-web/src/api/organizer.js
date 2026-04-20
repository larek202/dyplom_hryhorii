import { apiRequest } from '../services/api.js';

/**
 * Rejestracja profilu organizatora (wymaga JWT).
 * @param {Record<string, unknown>} payload — pola zgodne z POST /api/organizer/register
 */
export function registerOrganizer(payload) {
  return apiRequest('/api/organizer/register', { method: 'POST', body: payload });
}

/** GET /api/organizer/profile — tylko rola organizer. */
export function getOrganizerProfile() {
  return apiRequest('/api/organizer/profile');
}

/** GET /api/organizer/by-user/:userId — publiczny profil organizacji. */
export function getOrganizerProfileByUserId(userId) {
  return apiRequest(`/api/organizer/by-user/${encodeURIComponent(userId)}`);
}

/** PUT /api/organizer/profile — tylko rola organizer. */
export function updateOrganizerProfile(payload) {
  return apiRequest('/api/organizer/profile', { method: 'PUT', body: payload });
}

/**
 * Przesłanie obrazów (pole formularza `images`). Zwraca pierwszy publiczny URL.
 * @param {File[]} files
 * @returns {Promise<string | undefined>}
 */
export async function uploadOrganizerLogo(files) {
  if (!files?.length) return undefined;
  const fd = new FormData();
  files.forEach((f) => fd.append('images', f));
  const data = await apiRequest('/api/upload', { method: 'POST', body: fd });
  const urls = data?.images;
  return Array.isArray(urls) && urls[0] ? String(urls[0]) : undefined;
}
