/**
 * Inicjały do awatara (max 2 znaki).
 * @param {{ firstName?: string; lastName?: string; name?: string; email?: string } | null | undefined} user
 * @returns {string}
 */
export function getUserInitials(user) {
  if (!user) return 'U';
  const fn = String(user.firstName ?? '').trim();
  const ln = String(user.lastName ?? '').trim();
  if (fn || ln) {
    const a = fn.charAt(0).toUpperCase();
    const b = ln.charAt(0).toUpperCase();
    return (a + b) || a || 'U';
  }
  const name = String(user.name ?? '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.charAt(0)?.toUpperCase() ?? '';
    const b = parts[1]?.charAt(0)?.toUpperCase() ?? '';
    return (a + b) || a || 'U';
  }
  const email = String(user.email ?? '').trim();
  return email ? email.charAt(0).toUpperCase() : 'U';
}
