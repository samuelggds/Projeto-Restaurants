export type ReturnLocation = {
  pathname: string;
  search?: string;
  hash?: string;
};

const INTERNAL_URL_BASE = 'https://internal.invalid';
const BLOCKED_AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/recover-password',
  '/change-password',
  '/super_admin/login',
]);

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
  if (BLOCKED_AUTH_PATHS.has(normalizedPath) || /^\/[^/]+\/login$/u.test(normalizedPath)) {
    return '';
  }

  return rawNext;
}

export function buildLoginUrl(location: ReturnLocation) {
  return `/login?next=${encodeURIComponent(getCurrentReturnPath(location))}`;
}
