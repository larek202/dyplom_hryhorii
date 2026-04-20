/** @typedef {{ name?: string; description?: string; contactEmail?: string; contactPhone?: string; website?: string; city?: string; address?: string | { street?: string; city?: string; zipCode?: string; country?: string }; logoUrl?: string; facebook?: string; instagram?: string }} OrganizationLike */

/**
 * @param {OrganizationLike | null | undefined} org
 * @returns {{ name: string; description: string; contactEmail: string; contactPhone: string; website: string; city: string; address: string; facebook: string; instagram: string }}
 */
export function organizationToForm(org) {
  const empty = {
    name: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    city: '',
    address: '',
    facebook: '',
    instagram: '',
  };
  if (!org) return empty;

  let addressStr = '';
  if (org.address != null) {
    if (typeof org.address === 'string') {
      addressStr = org.address;
    } else {
      const a = org.address;
      addressStr = [a.street, a.city, a.zipCode, a.country].filter(Boolean).join(', ');
    }
  }

  return {
    name: org.name ?? '',
    description: org.description ?? '',
    contactEmail: org.contactEmail ?? '',
    contactPhone: org.contactPhone ?? '',
    website: org.website ?? '',
    city: org.city ?? '',
    address: addressStr,
    facebook: org.facebook ?? '',
    instagram: org.instagram ?? '',
  };
}
