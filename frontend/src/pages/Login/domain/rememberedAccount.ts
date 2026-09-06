const REMEMBERED_ACCOUNT_PREFIX = 'pecajaf:remembered-account:v2';
const LEGACY_REMEMBERED_EMAIL_KEY = 'rememberedEmail';

export type RememberedAccountScope = {
  portal: string;
  restaurantSlug?: string | null;
};

function normalizeScopePart(value: string | null | undefined, fallback: string) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-');
  return normalized || fallback;
}

export function getRememberedAccountStorageKey({
  portal,
  restaurantSlug,
}: RememberedAccountScope) {
  const normalizedPortal = normalizeScopePart(portal, 'generic');
  const normalizedRestaurant = normalizeScopePart(restaurantSlug, 'global');
  return `${REMEMBERED_ACCOUNT_PREFIX}:${normalizedPortal}:${normalizedRestaurant}`;
}

export function readRememberedAccountEmail(scope: RememberedAccountScope) {
  try {
    const value = window.localStorage.getItem(getRememberedAccountStorageKey(scope));
    return String(value || '').trim().slice(0, 254);
  } catch {
    return '';
  }
}

export function writeRememberedAccountEmail(scope: RememberedAccountScope, email: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase().slice(0, 254);
  if (!normalizedEmail) {
    clearRememberedAccountEmail(scope);
    return;
  }

  try {
    // A aplicação persiste somente o identificador da conta. Senha, access token
    // e refresh token nunca são gravados neste storage.
    window.localStorage.setItem(getRememberedAccountStorageKey(scope), normalizedEmail);
  } catch {
    // Storage pode estar indisponível em navegadores com políticas restritivas.
  }
}

export function clearRememberedAccountEmail(scope: RememberedAccountScope) {
  try {
    window.localStorage.removeItem(getRememberedAccountStorageKey(scope));
  } catch {
    // Storage pode estar indisponível em navegadores com políticas restritivas.
  }
}

export function clearLegacyRememberedAccountEmail() {
  try {
    window.localStorage.removeItem(LEGACY_REMEMBERED_EMAIL_KEY);
  } catch {
    // Storage pode estar indisponível em navegadores com políticas restritivas.
  }
}
