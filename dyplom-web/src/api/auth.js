import { apiRequest } from '../services/api.js';

export function updateProfile(body) {
  return apiRequest('/api/auth/profile', { method: 'PUT', body });
}

/**
 * Upload obrazu (FormData, pole `images`). Zwraca pierwszy publiczny URL z `/api/upload`.
 * @param {File[]} files
 * @returns {Promise<string | undefined>}
 */
export async function uploadProfileAvatarImage(files) {
  if (!files?.length) return undefined;
  const fd = new FormData();
  files.forEach((f) => fd.append('images', f));
  const data = await apiRequest('/api/upload', { method: 'POST', body: fd });
  const urls = data?.images;
  return Array.isArray(urls) && urls[0] ? String(urls[0]) : undefined;
}

export function changePassword(newPassword) {
  return apiRequest('/api/auth/password', { method: 'PUT', body: { newPassword } });
}

/**
 * @param {{ pushEnabled?: boolean, emailEnabled?: boolean }} body
 */
export function updateNotifications(body) {
  return apiRequest('/api/auth/notifications', { method: 'PUT', body });
}
