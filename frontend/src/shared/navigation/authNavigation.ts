export type ReturnLocation = {
  pathname: string;
  search?: string;
  hash?: string;
};

export type AuthEntryPath = '/login' | '/register' | '/recover-password';
export type AuthExperience = {
  context: 'ONLINE' | 'TABLE';
  nextPath: string;
  tableNumber: string | null;
  restaurantSlug: string | null;
};

const INTERNAL_URL_BASE = 'https://internal.invalid';
const BLOCKED_AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/recover-password',
  '/change-password',
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
const AUTH_RESTAURANT_ID_KEYS = ['restaurantId', 'rid'] as const;
const AUTH_RESTAURANT_SLUG_KEYS = ['restaurantSlug', 'slug'] as const;

function decodePathForValidation(pathname: string) {
  let decoded = pathname;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      return '';
    }
  }

  return decoded;
}

function containsControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

function sanitizeRestaurantId(value: string | null) {
  const raw = String(value || '').trim();
  if (!/^\d+$/u.test(raw)) return '';

  const numeric = Number(raw);
  return Number.isSafeInteger(numeric) && numeric > 0 ? String(numeric) : '';
}

function sanitizeRestaurantSlug(value: string | null) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 100) return '';

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return '';
  }

  const normalized = decoded.trim().toLowerCase();
  if (
    !normalized ||
    containsControlCharacter(normalized) ||
    normalized.includes('/') ||
    normalized.includes('\\') ||
    normalized.includes('?') ||
    normalized.includes('#') ||
    !/^[a-z0-9_-]+$/u.test(normalized)
  ) {
    return '';
  }

  return normalized;
}

export function getCurrentReturnPath(location: ReturnLocation) {
  const pathname = String(location.pathname || '/');
  return `${pathname}${String(location.search || '')}${String(location.hash || '')}`;
}

export function getSafeNextPath(value: unknown) {
  const rawNext = String(value || '').trim();

  if (!rawNext.startsWith('/') || rawNext.startsWith('//')) return '';

  const rawPathname = rawNext.split(/[?#]/u, 1)[0];
  if (rawPathname.includes('\\')) return '';

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
    /^\/[^/]+\/login$/u.test(normalizedPath)
  ) {
    return '';
  }

  return rawNext;
}

/**
 * Keeps only the authentication context that is intentionally shared between
 * Login, Register and RecoverPassword. Arbitrary query parameters are not
 * forwarded from one authentication screen to another.
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
  const query = getSafeAuthSearchParams(searchParams).toString();
  return query ? `${path}?${query}` : path;
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
  const nextPath = getSafeNextPath(getCurrentReturnPath(location));
  return nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';
}
