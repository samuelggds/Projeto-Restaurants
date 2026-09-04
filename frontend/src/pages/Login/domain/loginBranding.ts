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
  name: 'GastroNexa',
  description:
    'Acesse a plataforma com segurança para continuar sua experiência no restaurante ou na operação.',
  logoUrl: '',
  primaryColor: '#ef5b00',
  category: 'RESTAURANTE',
};

const HEX_COLOR_PATTERN = /^#([\da-f]{3}|[\da-f]{6})$/iu;

export function normalizeLoginBrandColor(value: unknown) {
  const color = String(value || '').trim();
  const match = HEX_COLOR_PATTERN.exec(color);
  if (!match) return DEFAULT_LOGIN_BRANDING.primaryColor;

  const hex = match[1].toLowerCase();
  if (hex.length === 6) return `#${hex}`;
  return `#${hex
    .split('')
    .map((channel) => `${channel}${channel}`)
    .join('')}`;
}

function colorChannels(color: unknown) {
  const hex = normalizeLoginBrandColor(color).slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function relativeLuminance(color: unknown) {
  const [red, green, blue] = colorChannels(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: unknown, background: unknown) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function channelsToHex(channels: number[]) {
  return `#${channels
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function getReadableTextColor(background: unknown) {
  const luminance = relativeLuminance(background);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.05;

  return darkContrast >= whiteContrast ? '#000000' : '#ffffff';
}

export function getAccessibleBrandColor(accent: unknown, background: unknown) {
  const normalizedAccent = normalizeLoginBrandColor(accent);
  const normalizedBackground = normalizeLoginBrandColor(background);
  if (contrastRatio(normalizedAccent, normalizedBackground) >= 4.5) return normalizedAccent;

  const target = relativeLuminance(normalizedBackground) > 0.45 ? [0, 0, 0] : [255, 255, 255];
  const source = colorChannels(normalizedAccent);

  for (let step = 1; step <= 20; step += 1) {
    const amount = step / 20;
    const candidate = channelsToHex(
      source.map((channel, index) => channel + (target[index] - channel) * amount),
    );
    if (contrastRatio(candidate, normalizedBackground) >= 4.5) return candidate;
  }

  return channelsToHex(target);
}

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
  'equipe',
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
    primaryColor: normalizeLoginBrandColor(settings.primaryColor),
    category: normalizeRestaurantCategory(
      restaurant.category || settings.restaurantCategory || DEFAULT_LOGIN_BRANDING.category,
    ),
  };
}
