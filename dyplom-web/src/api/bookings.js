import { apiRequest } from '../services/api.js';

export function fetchBookings() {
  return apiRequest('/api/bookings');
}

/** Rezerwacje dla wszystkich wydarzeń danego organizatora (wymaga JWT). */
export function fetchBookingsForOrganizer(organizerId) {
  const q = new URLSearchParams();
  if (organizerId) q.set('organizerId', String(organizerId));
  const qs = q.toString();
  return apiRequest(`/api/bookings${qs ? `?${qs}` : ''}`);
}

export function createBooking(eventId, body = { seats: 1 }) {
  return apiRequest(`/api/bookings/${encodeURIComponent(eventId)}`, {
    method: 'POST',
    body,
  });
}

export function deleteBooking(eventId) {
  return apiRequest(`/api/bookings/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}
