/**
 * Klient HTTP do backendu MoveMint.
 * @example
 * import { apiRequest, getHealthExample } from '../services/api.js';
 *
 * // Dowolny endpoint
 * const list = await apiRequest('/api/events?limit=10');
 *
 * // Gotowy przykład (health)
 * const ok = await getHealthExample();
 */

const TOKEN_KEY = 'dyplom_token';

/** Bazowy URL API (VITE_API_URL w .env, bez końcowego „/”). */
export function getBaseUrl() {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || !String(raw).trim()) {
    console.warn('[MoveMint] Brak VITE_API_URL — używam http://localhost:3000');
    return 'http://localhost:3000';
  }
  return String(raw).replace(/\/$/, '');
}

/** Alias zgodny ze starszym kodem. */
export const getApiBaseUrl = getBaseUrl;

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Błąd API z kodem HTTP i treścią z serwera. */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, data?: unknown }} [extra]
   */
  constructor(message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = extra.status;
    this.data = extra.data;
  }
}

const GENERIC_UI_ERROR = 'Coś poszło nie tak';

/**
 * Komunikat błędu do wyświetlenia w UI (PL).
 * @param {unknown} error
 * @returns {string}
 */
export function getUiErrorMessage(error) {
  if (error instanceof ApiError) {
    const m = error.message?.trim();
    if (m) return m;
    return GENERIC_UI_ERROR;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const m = String(/** @type {{ message?: string }} */ (error).message ?? '').trim();
    if (m) return m;
  }
  return GENERIC_UI_ERROR;
}

function pickErrorMessage(data, statusText, status) {
  if (data && typeof data === 'object') {
    const e = data.error ?? data.message;
    if (typeof e === 'string' && e.trim()) return e;
    if (Array.isArray(e) && e.length) return e.map(String).join(', ');
  }
  if (status === 401) return 'Sesja wygasła lub brak uprawnień. Zaloguj się ponownie.';
  if (status === 403) return 'Brak dostępu do tej operacji.';
  if (status === 404) return 'Nie znaleziono zasobu.';
  if (status === 422) return 'Sprawdź poprawność danych w formularzu.';
  if (status >= 500) return 'Serwer jest chwilowo niedostępny. Spróbuj za chwilę.';
  return GENERIC_UI_ERROR;
}

/**
 * Żądanie HTTP z nagłówkiem Authorization: Bearer (jeśli jest token).
 *
 * @param {string} path - np. `/api/events` lub `api/events`
 * @param {{ method?: string, body?: unknown, headers?: Record<string, string>, signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>} Ciało JSON lub null
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers: extra = {}, signal } = options;
  const headers = { ...extra };

  if (body != null && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body:
        body != null && !(body instanceof FormData) ? JSON.stringify(body) : body,
      credentials: 'include',
      signal,
    });
  } catch {
    throw new ApiError(GENERIC_UI_ERROR, { status: 0, data: null });
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message = pickErrorMessage(data, res.statusText, res.status);
    throw new ApiError(message, { status: res.status, data });
  }

  return data;
}

/**
 * Przykład: proste GET na endpoint sprawdzający działanie API.
 * @returns {Promise<{ status?: string, message?: string } | null>}
 */
export async function getHealthExample() {
  return apiRequest('/api/health');
}
