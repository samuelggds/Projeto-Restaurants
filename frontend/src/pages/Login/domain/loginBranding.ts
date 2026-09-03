import { getSafeNextPath } from '../../../shared/navigation/authNavigation';
import { isPersistentImageSource } from '../../../utils/persistentImage';

export type LoginBranding = {
  name: string;
  description: string;
  logoUrl: string;
  primaryColor: string;
};

export const DEFAULT_LOGIN_BRANDING: LoginBranding = {
  name: 'Peça Já Food',
  description:
    'Acesse nosso menu interativo global. Faça seus pedidos de forma rápida e gerencie sua experiência gastronômica sem complicações.',
  logoUrl: '',
  primaryColor: '#ef5b00',
};

const RESERVED_ROUTES = new Set([
  'login',
  'register',
  'profile',
  'admin',
  'super_admin',
  'courier',
  'kitchen',
  'waiter',
  'attendant',
  'recover-password',
  'orders',
  'mesa',
]);

function parsePositiveRestaurantId(value: string | null) {
  const raw = String(value || '').trim();
  if (!/^\d+$/u.test(raw)) return null;
  const numeric = Number(raw);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

export function resolveLoginRestaurant(searchParams: URLSearchParams) {
  const explicitRestaurantId = parsePositiveRestaurantId(
    searchParams.get('restaurantId') || searchParams.get('rid'),
  );
  const explicitSlug = String(searchParams.get('restaurantSlug') || searchParams.get('slug') || '')
    .trim()
    .toLowerCase();
  const safeNextPath = getSafeNextPath(searchParams.get('next'));

  let nextRestaurantId: number | null = null;
  let nextSlug = '';
  if (safeNextPath) {
    try {
      const parsed = new URL(safeNextPath, 'https://internal.invalid');
      nextRestaurantId = parsePositiveRestaurantId(
        parsed.searchParams.get('restaurantId') || parsed.searchParams.get('rid'),
      );
      const firstSegment = parsed.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
      if (firstSegment && !RESERVED_ROUTES.has(firstSegment)) {
        nextSlug = firstSegment;
      }
    } catch {
      // getSafeNextPath already validates the destination; fallback branding is safe here.
    }
  }

  const restaurantId = explicitRestaurantId || nextRestaurantId;
  const slug = explicitSlug || nextSlug;
  return { restaurantId, slug };
}

export function mapLoginBranding(settings: Record<string, unknown> | null): LoginBranding {
  if (!settings) return DEFAULT_LOGIN_BRANDING;
  const restaurant = (settings.restaurant as Record<string, unknown>) || {};
  const logo =
    restaurant.coverImage ||
    settings.restaurantCoverImage ||
    restaurant.logo ||
    settings.restaurantLogo;
  const description = String(
    restaurant.description ||
      settings.restaurantDescription ||
      DEFAULT_LOGIN_BRANDING.description,
  ).trim();

  return {
    name: String(restaurant.name || settings.restaurantName || DEFAULT_LOGIN_BRANDING.name),
    description: description || DEFAULT_LOGIN_BRANDING.description,
    logoUrl: isPersistentImageSource(logo) ? String(logo) : '',
    primaryColor: String(settings.primaryColor || DEFAULT_LOGIN_BRANDING.primaryColor),
  };
}
