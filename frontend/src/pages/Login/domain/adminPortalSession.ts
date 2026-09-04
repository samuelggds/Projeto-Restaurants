import api from '../../../Services/api';

const sessionKey = (slug: string) => `gastronexa:admin-portal:${slug}`;

export type AdminPortalGrantContext = {
  valid: boolean;
  restaurantId: number;
  slug: string;
};

export function storeAdminPortalGrant(slug: string, grant: string) {
  sessionStorage.setItem(sessionKey(slug), grant);
}

export function getAdminPortalGrant(slug: string) {
  return sessionStorage.getItem(sessionKey(slug)) || '';
}

export function clearAdminPortalGrant(slug: string) {
  sessionStorage.removeItem(sessionKey(slug));
}

export async function exchangeAdminPortalKey(slug: string, key: string) {
  const response = await api.post(`/admin-portal/${encodeURIComponent(slug)}/exchange`, { key });
  const grant = String(response.data?.grant || '');
  if (!grant) throw new Error('Página não encontrada.');
  storeAdminPortalGrant(slug, grant);
  return grant;
}

export async function verifyAdminPortalGrant(slug: string): Promise<AdminPortalGrantContext> {
  const grant = getAdminPortalGrant(slug);
  if (!grant) throw new Error('Página não encontrada.');
  try {
    const response = await api.post(`/admin-portal/${encodeURIComponent(slug)}/verify`, { grant });
    return {
      valid: response.data?.valid === true,
      restaurantId: Number(response.data?.restaurantId || 0),
      slug: String(response.data?.slug || ''),
    };
  } catch (error) {
    clearAdminPortalGrant(slug);
    throw error;
  }
}
