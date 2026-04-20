/** Role z dostępem do typowych tras chronionych (profil, ulubione, rezerwacje). */
export const DEFAULT_PRIVATE_ROLES = ['user', 'organizer'];

/** Tylko panel organizatora. */
export const ORGANIZER_ONLY_ROLES = ['organizer'];

/** Tylko zwykły użytkownik (np. rejestracja organizatora). */
export const USER_ONLY_ROLES = ['user'];

/**
 * Bezpieczna ścieżka powrotu po logowaniu — tylko wewnętrzne URL (bez open redirect).
 * @param {unknown} from — obiekt `Location` z react-router lub string (pathname + opcjonalnie search/hash)
 * @returns {string}
 */
function isAuthRoutePath(path) {
  return path === '/login' || path === '/register' || path.startsWith('/login/') || path.startsWith('/register/');
}

export function safeReturnPath(from) {
  if (from == null) return '/events';

  if (typeof from === 'string') {
    const s = from.trim();
    if (!s.startsWith('/') || s.startsWith('//')) return '/events';
    const pathOnly = s.split('?')[0]?.split('#')[0] ?? s;
    if (isAuthRoutePath(pathOnly)) return '/events';
    return s || '/events';
  }

  if (typeof from === 'object' && from !== null && 'pathname' in from) {
    const loc = /** @type {{ pathname?: string; search?: string; hash?: string }} */ (from);
    const pathname = String(loc.pathname ?? '');
    if (!pathname.startsWith('/') || pathname.startsWith('//')) return '/events';
    if (isAuthRoutePath(pathname)) return '/events';
    const search = typeof loc.search === 'string' ? loc.search : '';
    const hash = typeof loc.hash === 'string' ? loc.hash : '';
    const full = `${pathname}${search}${hash}`;
    return full || '/events';
  }

  return '/events';
}
