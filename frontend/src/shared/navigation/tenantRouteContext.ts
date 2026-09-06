const TENANT_SESSION_STORAGE_KEY = 'gastronexa:tenant-slug';
const TENANT_PERSISTENT_STORAGE_KEY = 'gastronexa:last-tenant-slug';

const RESERVED_ROUTE_SEGMENTS = new Set([
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
  'restaurant-required',
  'super_admin',
  'system-blocked',
  'system-maintenance',
  'team',
  'waiter',
]);

export function normalizeTenantSlug(value: unknown) {
  const slug = String(value || '')
    .trim()
    .toLowerCase();
  return /^[a-z0-9_-]+$/u.test(slug) && !RESERVED_ROUTE_SEGMENTS.has(slug) ? slug : '';
}

export function persistTenantSlug(value: unknown) {
  if (typeof window === 'undefined') return '';
  const slug = normalizeTenantSlug(value);
  if (!slug) return '';

  try {
    // Só o identificador público do tenant atravessa abas. Nenhuma credencial,
    // sessão, token ou chave administrativa é persistida aqui.
    window.sessionStorage.setItem(TENANT_SESSION_STORAGE_KEY, slug);
    window.localStorage.setItem(TENANT_PERSISTENT_STORAGE_KEY, slug);
  } catch {
    // Storage pode estar indisponível em navegadores com políticas restritivas.
  }

  return slug;
}

export function restoreTenantRouteContext(pathname?: string) {
  if (typeof window === 'undefined') return '';

  const currentPathname = String(pathname ?? window.location.pathname || '/');
  const explicitSlug = normalizeTenantSlug(currentPathname.split('/').filter(Boolean)[0]);

  let persistedSlug = '';
  try {
    persistedSlug = normalizeTenantSlug(
      window.localStorage.getItem(TENANT_PERSISTENT_STORAGE_KEY),
    );
  } catch {
    // Storage pode estar indisponível em navegadores com políticas restritivas.
  }

  const resolvedSlug = explicitSlug || persistedSlug;
  if (!resolvedSlug) return '';

  try {
    window.sessionStorage.setItem(TENANT_SESSION_STORAGE_KEY, resolvedSlug);
    if (explicitSlug) {
      window.localStorage.setItem(TENANT_PERSISTENT_STORAGE_KEY, explicitSlug);
    }
  } catch {
    // O roteamento continua seguro mesmo sem storage; apenas perde recuperação entre abas.
  }

  return resolvedSlug;
}

export const tenantRouteStorageKeys = {
  session: TENANT_SESSION_STORAGE_KEY,
  persistent: TENANT_PERSISTENT_STORAGE_KEY,
} as const;
