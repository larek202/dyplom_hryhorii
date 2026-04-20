import { apiRequest } from '../services/api.js';

export function fetchFavorites() {
  return apiRequest('/api/favorites');
}

export function addFavorite(eventId) {
  return apiRequest(`/api/favorites/${encodeURIComponent(eventId)}`, { method: 'POST' });
}

export function removeFavorite(eventId) {
  return apiRequest(`/api/favorites/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}
