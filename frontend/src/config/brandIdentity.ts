import { normalizePlatformName } from './platformStorageMigration';
export const BRAND_IDENTITY_STORAGE_KEY = '@GastroNexa:brandIdentity';
export const BRAND_IDENTITY_UPDATED_EVENT = 'gastronexa:brand-identity-updated';

export type BrandIdentity = {
  name: string;
  logoUrl: string;
};

const DEFAULT_BRAND_NAME = 'GastroNexa';

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function normalizeLogoUrl(value: unknown) {
  const url = normalizeText(value);
  return url === '/gastronexa-logo.png' ? '/gastronexa-logo.svg' : url;
}

function parseJson(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractFromUserStorage(): BrandIdentity {
  const parsedUser = parseJson(localStorage.getItem('user')) as Record<string, unknown> | null;
  const restaurant =
    parsedUser && typeof parsedUser.restaurant === 'object'
      ? (parsedUser.restaurant as Record<string, unknown>)
      : null;

  const name =
    normalizeText(parsedUser?.restaurantName) ||
    normalizeText(restaurant?.name) ||
    normalizeText(restaurant?.restaurantName);
  const logoUrl =
    normalizeText(parsedUser?.restaurantLogo) ||
    normalizeText(restaurant?.logo) ||
    normalizeText(restaurant?.restaurantLogo);

  return {
    name: normalizePlatformName(name),
    logoUrl:
      normalizePlatformName(name) !== name ? '/gastronexa-logo.svg' : normalizeLogoUrl(logoUrl),
  };
}

export function readBrandIdentityFromStorage(): BrandIdentity {
  const parsed = parseJson(localStorage.getItem(BRAND_IDENTITY_STORAGE_KEY)) as Record<
    string,
    unknown
  > | null;

  return {
    name: normalizePlatformName(normalizeText(parsed?.name)),
    logoUrl:
      normalizePlatformName(normalizeText(parsed?.name)) !== normalizeText(parsed?.name)
        ? '/gastronexa-logo.svg'
        : normalizeLogoUrl(parsed?.logoUrl),
  };
}

export function getBrandIdentity(): BrandIdentity {
  const fromStorage = readBrandIdentityFromStorage();

  if (fromStorage.name || fromStorage.logoUrl) {
    return {
      name: fromStorage.name || DEFAULT_BRAND_NAME,
      logoUrl:
        fromStorage.logoUrl ||
        (fromStorage.name === DEFAULT_BRAND_NAME ? '/gastronexa-logo.svg' : ''),
    };
  }

  const fromUserStorage = extractFromUserStorage();

  return {
    name: fromUserStorage.name || DEFAULT_BRAND_NAME,
    logoUrl:
      fromUserStorage.logoUrl ||
      (!fromUserStorage.name || fromUserStorage.name === DEFAULT_BRAND_NAME
        ? '/gastronexa-logo.svg'
        : ''),
  };
}

export function persistBrandIdentity(partial: Partial<BrandIdentity>) {
  const previous = readBrandIdentityFromStorage();
  const next: BrandIdentity = {
    name: normalizeText(partial.name) || previous.name || DEFAULT_BRAND_NAME,
    logoUrl: normalizeLogoUrl(partial.logoUrl) || previous.logoUrl,
  };

  localStorage.setItem(BRAND_IDENTITY_STORAGE_KEY, JSON.stringify(next));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(BRAND_IDENTITY_UPDATED_EVENT, {
        detail: next,
      }),
    );
  }

  return next;
}
