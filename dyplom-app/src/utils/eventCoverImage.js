/**
 * URL zdjęcia okładkowego wydarzenia (listy, rezerwacje). Pierwsze zdjęcie, jeśli brak coverImageIndex.
 * @param {{ images?: string[], image?: string, coverImageIndex?: number }} event
 * @returns {string | null}
 */
export function getEventCoverImageUri(event) {
  if (!event) return null;
  const urls = Array.isArray(event.images)
    ? event.images.map((u) => String(u || '').trim()).filter(Boolean)
    : [];
  if (urls.length === 0) {
    const legacy = event.image ? String(event.image).trim() : '';
    return legacy || null;
  }
  let idx = Number(event.coverImageIndex);
  if (!Number.isFinite(idx) || idx < 0) idx = 0;
  idx = Math.min(Math.floor(idx), urls.length - 1);
  return urls[idx] || urls[0] || null;
}
