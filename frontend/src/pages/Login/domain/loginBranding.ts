import { isPersistentImageSource } from '../../../utils/persistentImage';

export type LoginBranding = { name: string; logoUrl: string; primaryColor: string };

export const DEFAULT_LOGIN_BRANDING: LoginBranding = {
  name: 'Peça Já Food',
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
  'recover-password',
  'orders',
]);

export function resolveLoginRestaurant(searchParams: URLSearchParams) {
  const restaurantId = Number(searchParams.get('restaurantId') || searchParams.get('rid') || 0);
  const explicitSlug = String(searchParams.get('restaurantSlug') || searchParams.get('slug') || '')
    .trim()
    .toLowerCase();
  const nextSegment =
    String(searchParams.get('next') || '')
      .split('?')[0]
      .split('/')
      .filter(Boolean)[0]
      ?.toLowerCase() || '';
  const slug = explicitSlug || (!RESERVED_ROUTES.has(nextSegment) ? nextSegment : '');
  return { restaurantId: restaurantId > 0 ? restaurantId : null, slug };
}

export function mapLoginBranding(settings: Record<string, unknown> | null): LoginBranding {
  if (!settings) return DEFAULT_LOGIN_BRANDING;
  const restaurant = (settings.restaurant as Record<string, unknown>) || {};
  const logo =
    restaurant.coverImage ||
    settings.restaurantCoverImage ||
    restaurant.logo ||
    settings.restaurantLogo;
  return {
    name: String(restaurant.name || settings.restaurantName || DEFAULT_LOGIN_BRANDING.name),
    logoUrl: isPersistentImageSource(logo) ? String(logo) : '',
    primaryColor: String(settings.primaryColor || DEFAULT_LOGIN_BRANDING.primaryColor),
  };
}
