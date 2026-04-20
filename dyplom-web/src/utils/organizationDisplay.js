import { organizationToForm } from './organizationForm.js';

/** @param {string | undefined} href */
export function withHttps(href) {
  const s = String(href || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s.replace(/^\/+/, '')}`;
}

/**
 * @param {{ address?: string | { street?: string; city?: string; zipCode?: string; country?: string }; city?: string } | null | undefined} org
 */
export function formatAddressBlock(org) {
  if (!org) return '';
  const lines = [];
  const a = org.address;
  if (a && typeof a === 'object') {
    if (a.street?.trim()) lines.push(a.street.trim());
    const cityPart = [a.zipCode?.trim(), a.city?.trim() || org.city?.trim()].filter(Boolean).join(' ');
    if (cityPart) lines.push(cityPart);
    if (a.country?.trim()) lines.push(a.country.trim());
  } else if (typeof a === 'string' && a.trim()) {
    lines.push(a.trim());
  }
  if (!lines.length && org.city?.trim()) {
    lines.push(org.city.trim());
  }
  if (!lines.length) {
    const flat = organizationToForm(org).address;
    if (flat.trim()) return flat.trim();
  }
  return lines.join('\n');
}
