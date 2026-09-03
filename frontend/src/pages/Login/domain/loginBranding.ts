import { getSafeNextPath } from '../../../shared/navigation/authNavigation';
import { isPersistentImageSource } from '../../../utils/persistentImage';
import {
  normalizeRestaurantCategory,
  type RestaurantCategory,
} from '../../../config/restaurantCategory';

export type LoginBranding = {
  name: string;
  description: string;
  logoUrl: string;
  primaryColor: string;
  category: RestaurantCategory;
};

export const DEFAULT_LOGIN_BRANDING: LoginBranding = {
  name: 'Peça Já Food',
  description:
    'Acesse nosso menu interativo global. Faça seus pedidos de forma rápida e gerencie sua experiência gastronômica sem complicações.',
  logoUrl: '',
  primaryColor: '#ef5b00',
  category: 'RESTAURANTE',
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

function parseSafeRestaurantSlug(value: string | null) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 100) return '';

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return '';
  }

  return /^[a-z0-9_-]+$/u.test(decoded) ? decoded : '';
}

export function resolveLoginRestaurant(searchParams: URLSearchParams) {
  const explicitRestaurantId = parsePositiveRestaurantId(
    searchParams.get('restaurantId') || searchParams.get('rid'),
  );
  const explicitSlug = parseSafeRestaurantSlug(
    searchParams.get('restaurantSlug') || searchParams.get('slug'),
  );
  const safeNextPath = getSafeNextPath(searchParams.get('next'));

  let nextRestaurantId: number | null = null;
  let nextSlug = '';
  if (safeNextPath) {
    try {
      const parsed = new URL(safeNextPath, 'https://internal.invalid');
      nextRestaurantId = parsePositiveRestaurantId(
        parsed.searchParams.get('restaurantId') || parsed.searchParams.get('rid'),
      );
      const firstSegment = parseSafeRestaurantSlug(
        parsed.pathname.split('/').filter(Boolean)[0] || '',
      );
      if (firstSegment && !RESERVED_ROUTES.has(firstSegment)) {
        nextSlug = firstSegment;
      }
    } catch {
      // getSafeNextPath already validates the destination; fallback branding is safe here.
    }
  }

  if (nextSlug) return { restaurantId: nextRestaurantId, slug: nextSlug };
  if (nextRestaurantId) return { restaurantId: nextRestaurantId, slug: '' };
  return { restaurantId: explicitRestaurantId, slug: explicitSlug };
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
    restaurant.description || settings.restaurantDescription || DEFAULT_LOGIN_BRANDING.description,
  ).trim();

  return {
    name: String(restaurant.name || settings.restaurantName || DEFAULT_LOGIN_BRANDING.name),
    description: description || DEFAULT_LOGIN_BRANDING.description,
    logoUrl: isPersistentImageSource(logo) ? String(logo) : '',
    primaryColor: String(settings.primaryColor || DEFAULT_LOGIN_BRANDING.primaryColor),
    category: normalizeRestaurantCategory(
      restaurant.category || settings.restaurantCategory || DEFAULT_LOGIN_BRANDING.category,
    ),
  };
}
