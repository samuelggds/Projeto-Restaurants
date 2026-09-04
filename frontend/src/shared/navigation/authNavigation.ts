export type ReturnLocation = {
  pathname: string;
  search?: string;
  hash?: string;
};

export type AuthEntryPath = '/login' | '/register' | '/recover-password' | '/change-password';

export type AuthExperience = {
  context: 'ONLINE' | 'TABLE';
  nextPath: string;
  tableNumber: string | null;
  restaurantSlug: string | null;
};

const INTERNAL_URL_BASE = 'https://internal.invalid';
const MAX_NEXT_PATH_LENGTH = 4_096;
const MAX_DECODE_PASSES = 8;
const AUTH_RETURN_STORAGE_PREFIX = 'gastronexa:auth-return:';
const BLOCKED_AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/recover-password',
  '/change-password',
  '/admin/login',
  '/super_admin/login',
]);
const ROLE_ONLY_RETURN_ROOTS = [
  '/admin',
  '/attendant',
  '/billing',
  '/courier',
  '/kitchen',
  '/super_admin',
  '/system-blocked',
  '/system-maintenance',
  '/waiter',
];
const RESERVED_RESTAURANT_SLUGS = new Set([
  'admin',
  'attendant',
  'billing',
  'change-password',
  'courier',
  'equipe',
  'kitchen',
  'login',
  'mesa',
  'orders',
  'profile',
  'recover-password',
  'register',
  'super_admin',
  'system-blocked',
  'system-maintenance',
  'waiter',
]);
const AUTH_RESTAURANT_ID_KEYS = ['restaurantId', 'rid'] as const;
const AUTH_RESTAURANT_SLUG_KEYS = ['restaurantSlug', 'slug'] as const;

function containsControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

function decodePathForValidation(pathname: string) {
  let decoded = pathname;

  for (let attempt = 0; attempt < MAX_DECODE_PASSES; attempt += 1) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) return decoded;
      decoded = nextDecoded;
    } catch {
      return '';
    }
  }

  return '';
}

function containsEncodedControlOrBackslash(value: string) {
  let candidate = value;

  for (let attempt = 0; attempt < MAX_DECODE_PASSES; attempt += 1) {
    if (/%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/iu.test(candidate)) return true;
    const unwrapped = candidate.replace(/%25/giu, '%');
    if (unwrapped === candidate) return false;
    candidate = unwrapped;
  }

  return true;
}

function sanitizeRestaurantId(value: unknown) {
  const raw = String(value || '').trim();
  if (!/^\d+$/u.test(raw)) return '';
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? String(parsed) : '';
}

function sanitizeRestaurantSlug(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 100 || containsControlCharacter(raw)) return '';

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return '';
  }

  const slug = decoded.trim().toLowerCase();
  return /^[a-z0-9_-]+$/u.test(slug) ? slug : '';
}

function getRestaurantSlugFromLocation(location: ReturnLocation) {
  const pathname = String(location.pathname || '/')
    .replace(/\/+$/u, '') || '/';
  const match = pathname.match(/^\/([^/]+)(?:\/mesa\/[^/]+)?$/u);
  if (!match) return '';
  const slug = sanitizeRestaurantSlug(match[1]);
  return slug && !RESERVED_RESTAURANT_SLUGS.has(slug) ? slug : '';
}

function getAuthReturnStorageKey(restaurantSlug: string) {
  const slug = sanitizeRestaurantSlug(restaurantSlug);
  return slug && !RESERVED_RESTAURANT_SLUGS.has(slug)
    ? `${AUTH_RETURN_STORAGE_PREFIX}${slug}`
    : '';
}

export function getCurrentReturnPath(location: ReturnLocation) {
  const pathname = String(location.pathname || '/');
  return `${pathname}${String(location.search || '')}${String(location.hash || '')}`;
}

export function getSafeNextPath(value: unknown) {
  const rawNext = String(value || '');

  if (
    !rawNext ||
    rawNext !== rawNext.trim() ||
    rawNext.length > MAX_NEXT_PATH_LENGTH ||
    !rawNext.startsWith('/') ||
    rawNext.startsWith('//') ||
    rawNext.includes('\\') ||
    containsControlCharacter(rawNext) ||
    containsEncodedControlOrBackslash(rawNext)
  ) {
    return '';
  }

  let parsed: URL;
  try {
    parsed = new URL(rawNext, INTERNAL_URL_BASE);
  } catch {
    return '';
  }

  if (parsed.origin !== INTERNAL_URL_BASE) return '';

  const decodedPathname = decodePathForValidation(parsed.pathname);
  if (
    !decodedPathname ||
    decodedPathname.startsWith('//') ||
    decodedPathname.includes('\\') ||
    containsControlCharacter(decodedPathname)
  ) {
    return '';
  }

  const normalizedPath = decodedPathname.replace(/\/+$/u, '').toLowerCase() || '/';
  const isRoleOnlyPath = ROLE_ONLY_RETURN_ROOTS.some(
    (root) => normalizedPath === root || normalizedPath.startsWith(`${root}/`),
  );
  if (
    BLOCKED_AUTH_PATHS.has(normalizedPath) ||
    isRoleOnlyPath ||
    /^\/[^/]+\/(?:login|register|equipe)$/u.test(normalizedPath)
  ) {
    return '';
  }

  return rawNext;
}

export function rememberAuthReturnPath(restaurantSlug: string, value: unknown) {
  if (typeof window === 'undefined') return;
  const key = getAuthReturnStorageKey(restaurantSlug);
  const safeNextPath = getSafeNextPath(value);
  if (!key || !safeNextPath) return;

  try {
    window.sessionStorage.setItem(key, safeNextPath);
  } catch {
    // sessionStorage pode estar indisponível em navegadores com políticas restritas.
  }
}

export function getRememberedAuthReturnPath(restaurantSlug: string) {
  if (typeof window === 'undefined') return '';
  const key = getAuthReturnStorageKey(restaurantSlug);
  if (!key) return '';

  try {
    return getSafeNextPath(window.sessionStorage.getItem(key));
  } catch {
    return '';
  }
}

/**
 * Propaga entre as telas de autenticação somente o retorno interno validado e
 * as referências de restaurante usadas para apresentação.
 */
export function getSafeAuthSearchParams(searchParams: URLSearchParams) {
  const safeParams = new URLSearchParams();
  const safeNextPath = getSafeNextPath(searchParams.get('next'));

  if (safeNextPath) {
    safeParams.set('next', safeNextPath);
  }

  for (const key of AUTH_RESTAURANT_ID_KEYS) {
    const value = sanitizeRestaurantId(searchParams.get(key));
    if (value) safeParams.set(key, value);
  }

  for (const key of AUTH_RESTAURANT_SLUG_KEYS) {
    const value = sanitizeRestaurantSlug(searchParams.get(key));
    if (value) safeParams.set(key, value);
  }

  return safeParams;
}

export function buildAuthEntryUrl(path: AuthEntryPath, searchParams: URLSearchParams) {
  const safeParams = getSafeAuthSearchParams(searchParams);
  const safeNextPath = safeParams.get('next');
  const restaurantSlug = safeParams.get('restaurantSlug') || safeParams.get('slug');

  if (restaurantSlug && safeNextPath) {
    rememberAuthReturnPath(restaurantSlug, safeNextPath);
  }

  const query = safeParams.toString();
  return query ? `${path}?${query}` : path;
}

export function buildAuthEntryUrlForLocation(path: AuthEntryPath, location: ReturnLocation) {
  const nextPath = getSafeNextPath(getCurrentReturnPath(location));
  if (!nextPath) return path;

  return buildAuthEntryUrl(path, new URLSearchParams({ next: nextPath }));
}

export function resolveAuthExperience(searchParams: URLSearchParams): AuthExperience {
  const nextPath = getSafeNextPath(searchParams.get('next'));
  if (!nextPath) {
    return { context: 'ONLINE', nextPath: '', tableNumber: null, restaurantSlug: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(nextPath, INTERNAL_URL_BASE);
  } catch {
    return { context: 'ONLINE', nextPath, tableNumber: null, restaurantSlug: null };
  }

  const tableMatch = parsed.pathname.match(/^\/(?:([^/]+)\/)?mesa\/([1-9]\d*)\/?$/iu);
  if (!tableMatch) {
    return { context: 'ONLINE', nextPath, tableNumber: null, restaurantSlug: null };
  }

  const restaurantSlug = tableMatch[1] ? sanitizeRestaurantSlug(tableMatch[1]) || null : null;
  return {
    context: 'TABLE',
    nextPath,
    tableNumber: tableMatch[2],
    restaurantSlug,
  };
}

export function buildLoginUrl(location: ReturnLocation) {
  const restaurantSlug = getRestaurantSlugFromLocation(location);
  if (!restaurantSlug) {
    return buildAuthEntryUrlForLocation('/login', location);
  }

  const portalPath = `/${restaurantSlug}/login`;
  const nextPath = getSafeNextPath(getCurrentReturnPath(location));
  if (!nextPath) return portalPath;
  rememberAuthReturnPath(restaurantSlug, nextPath);
  const query = getSafeAuthSearchParams(new URLSearchParams({ next: nextPath })).toString();
  return query ? `${portalPath}?${query}` : portalPath;
}
