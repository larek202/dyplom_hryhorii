/**
 * Kategoria główna: pole `category` (kanoniczne); w starych danych — pierwszy element `categories`.
 * @param {object | null | undefined} event
 * @returns {string}
 */
export function getPrimaryCategory(event) {
  if (!event) return '';
  const direct = String(event.category || '').trim();
  if (direct) return direct;
  const arr = event.categories;
  if (Array.isArray(arr) && arr.length) return String(arr[0] || '').trim();
  return '';
}

/**
 * Dodatkowe kategorie (bez głównej). Zakłada, że `categories` nie zawiera duplikatu głównej po zapisie na backendzie.
 * @param {object | null | undefined} event
 * @returns {string[]}
 */
export function getAdditionalCategories(event) {
  const primary = getPrimaryCategory(event);
  const raw = Array.isArray(event?.categories) ? event.categories : [];
  const normalized = raw.map((c) => String(c || '').trim()).filter(Boolean);
  const dedup = [...new Set(normalized)];
  if (!primary) return dedup;
  return dedup.filter((c) => c !== primary);
}

/** Wszystkie etykiety kategorii (główna + dodatkowe). */
export function getAllCategoryLabels(event) {
  const p = getPrimaryCategory(event);
  const add = getAdditionalCategories(event);
  return p ? [p, ...add] : add;
}

/**
 * Czy wydarzenie pasuje do wybranej kategorii (główna lub dodatkowa).
 * @param {object} event
 * @param {string} needleLower — już .toLowerCase()
 */
export function eventMatchesCategoryToken(event, needleLower) {
  if (!needleLower) return true;
  const p = String(event?.category || '')
    .trim()
    .toLowerCase();
  if (p === needleLower) return true;
  const arr = Array.isArray(event?.categories) ? event.categories : [];
  return arr.some((c) => String(c || '').trim().toLowerCase() === needleLower);
}

/**
 * Filtr wielokrotny (OR): pasuje, jeśli którakolwiek z wybranych kategorii występuje w wydarzeniu.
 * @param {string[]} selectedLower
 */
export function eventMatchesAnySelectedCategory(event, selectedLower) {
  if (!selectedLower?.length) return true;
  return selectedLower.some((n) => eventMatchesCategoryToken(event, n));
}
