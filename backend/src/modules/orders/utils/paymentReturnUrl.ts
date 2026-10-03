import { resolveRestaurantMenuBaseUrl } from '../../customDomains/services/PublicCustomDomainService.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';

function normalizedOrigin(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password) return null;
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return null;
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return { url, origin: url.origin };
  } catch {
    return null;
  }
}

function canonicalFrontendUrl() {
  const raw = String(process.env.FRONTEND_URL || '').trim();
  const parsed = normalizedOrigin(raw);
  if (parsed) return parsed;
  if (process.env.NODE_ENV !== 'production') {
    return normalizedOrigin('http://localhost:5173');
  }
  return null;
}

export async function resolveSafeOrderReturnUrl(
  restaurantId: number,
  candidate: unknown,
  fallbackPath = '/',
) {
  const canonical = canonicalFrontendUrl();
  if (!canonical) {
    throw new OrderRequestError(
      'URL pública da plataforma não está configurada para retorno de pagamento.',
      503,
      'PAYMENT_RETURN_URL_UNAVAILABLE',
    );
  }

  const fallback = new URL(fallbackPath || '/', canonical.url.origin).toString();
  const requested = normalizedOrigin(candidate);
  if (!requested) return fallback;

  if (requested.origin === canonical.origin) return requested.url.toString();

  const customBase = await resolveRestaurantMenuBaseUrl(restaurantId);
  const custom = normalizedOrigin(customBase);
  if (!custom || requested.origin !== custom.origin) {
    throw new OrderRequestError(
      'URL de retorno do pagamento não pertence a este restaurante.',
      400,
      'INVALID_PAYMENT_RETURN_URL',
    );
  }

  return requested.url.toString();
}
