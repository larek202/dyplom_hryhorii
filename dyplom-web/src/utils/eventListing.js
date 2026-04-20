/** Wydarzenia zakończone wcześniej niż 12 h temu nie są pokazywane na liście głównej. */
export const MAIN_LIST_STALE_MS = 12 * 60 * 60 * 1000;

/**
 * @param {{ date?: string | Date | null }} ev
 * @param {number} [nowMs]
 * @returns {boolean} true — nie pokazuj na głównej liście (minęło >12h od daty wydarzenia)
 */
export function shouldHideEventFromMainList(ev, nowMs = Date.now()) {
  const d = new Date(ev?.date ?? '');
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < nowMs - MAIN_LIST_STALE_MS;
}
