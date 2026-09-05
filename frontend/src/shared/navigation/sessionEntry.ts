import { buildSessionEntryUrl, type ReturnLocation } from './authNavigation';

const SIGNED_OUT_ROLE_STORAGE_KEY = 'gastronexa:signed-out-role';

function normalizeRole(role: unknown) {
  return String(role || '')
    .trim()
    .toUpperCase();
}

export function rememberSignedOutRole(role: unknown) {
  if (typeof window === 'undefined') return;
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return;

  try {
    window.sessionStorage.setItem(SIGNED_OUT_ROLE_STORAGE_KEY, normalizedRole);
  } catch {
    // sessionStorage pode estar indisponível em navegadores com políticas restritas.
  }
}

export function consumeSignedOutEntryUrl(location: ReturnLocation) {
  if (typeof window === 'undefined') return buildSessionEntryUrl(location);

  let role = '';
  try {
    role = normalizeRole(window.sessionStorage.getItem(SIGNED_OUT_ROLE_STORAGE_KEY));
    window.sessionStorage.removeItem(SIGNED_OUT_ROLE_STORAGE_KEY);
  } catch {
    role = '';
  }

  return buildSessionEntryUrl(location, role);
}
