import api from '../../../Services/api';

const sessionKey = (slug: string) => `gastronexa:admin-portal:${slug}`;

export type AdminPortalGrantContext = {
  valid: boolean;
  restaurantId: number;
  slug: string;
};

let pendingExchange:
  | { slug: string; key: string; request: Promise<string> }
  | null = null;
let pendingVerify:
  | { slug: string; grant: string; request: Promise<AdminPortalGrantContext> }
  | null = null;

export function storeAdminPortalGrant(slug: string, grant: string) {
  sessionStorage.setItem(sessionKey(slug), grant);
}

export function getAdminPortalGrant(slug: string) {
  return sessionStorage.getItem(sessionKey(slug)) || '';
}

export function clearAdminPortalGrant(slug: string) {
  sessionStorage.removeItem(sessionKey(slug));
}

export function exchangeAdminPortalKey(slug: string, key: string) {
  if (pendingExchange?.slug === slug && pendingExchange.key === key) {
    return pendingExchange.request;
  }

  const request = api
    .post(`/admin-portal/${encodeURIComponent(slug)}/exchange`, { key })
    .then((response) => {
      const grant = String(response.data?.grant || '');
      if (!grant) throw new Error('Página não encontrada.');
      storeAdminPortalGrant(slug, grant);
      return grant;
    })
    .finally(() => {
      if (pendingExchange?.request === request) pendingExchange = null;
    });

  pendingExchange = { slug, key, request };
  return request;
}

export function verifyAdminPortalGrant(slug: string): Promise<AdminPortalGrantContext> {
  const grant = getAdminPortalGrant(slug);
  if (!grant) return Promise.reject(new Error('Página não encontrada.'));

  if (pendingVerify?.slug === slug && pendingVerify.grant === grant) {
    return pendingVerify.request;
  }

  const request = api
    .post(`/admin-portal/${encodeURIComponent(slug)}/verify`, { grant })
    .then((response) => ({
      valid: response.data?.valid === true,
      restaurantId: Number(response.data?.restaurantId || 0),
      slug: String(response.data?.slug || ''),
    }))
    .catch((error) => {
      clearAdminPortalGrant(slug);
      throw error;
    })
    .finally(() => {
      if (pendingVerify?.request === request) pendingVerify = null;
    });

  pendingVerify = { slug, grant, request };
  return request;
}
