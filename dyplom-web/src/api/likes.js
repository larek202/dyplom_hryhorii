import { apiRequest } from '../services/api.js';

/**
 * Liczby „ulubionych” (rekordów Like) per wydarzenie dla organizatora zalogowanego użytkownika.
 * GET /api/likes/counts — backend bierze wydarzenia po organizerId = req.user.
 * @returns {Promise<{ counts?: Record<string, number> }>}
 */
export function fetchLikeCountsForOrganizer() {
  return apiRequest('/api/likes/counts');
}
