export type LoginPortal = 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN' | 'GENERIC';

export type LoginPortalUser = {
  role?: string;
  subRole?: unknown;
} | null;

const STAFF_SUBROLES = new Set(['COZINHA', 'GARCOM', 'ATENDENTE']);
const RESERVED_PORTAL_SLUGS = new Set([
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

const normalizePath = (pathname: string) =>
  String(pathname || '/')
    .split(/[?#]/, 1)[0]
    .replace(/\/+$/u, '') || '/';

export function normalizePortalRestaurantSlug(value: unknown) {
  const raw = String(value || '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,100}$/u.test(raw) ? raw : '';
}

function getContextualSlug(path: string, suffixes: string[]) {
  const suffixPattern = suffixes.join('|');
  const match = path.match(new RegExp(`^/([^/]+)/(?:${suffixPattern})$`, 'u'));
  const slug = normalizePortalRestaurantSlug(match?.[1]);
  return slug && !RESERVED_PORTAL_SLUGS.has(slug) ? slug : '';
}

export function resolveLoginPortal(pathname: string): LoginPortal {
  const path = normalizePath(pathname);
  if (path === '/super_admin/login') return 'SUPER_ADMIN';
  if (getContextualSlug(path, ['admin'])) return 'ADMIN';
  if (getContextualSlug(path, ['team'])) return 'STAFF';
  if (getContextualSlug(path, ['login'])) return 'CUSTOMER';
  return 'GENERIC';
}

export function getRestaurantSlugFromAuthPath(pathname: string) {
  const path = normalizePath(pathname);
  return getContextualSlug(path, ['login', 'register', 'recover-password', 'team', 'admin']);
}

export function canUseLoginPortal(portal: LoginPortal, user: LoginPortalUser) {
  const role = String(user?.role || '').toUpperCase();
  const subRole = String(user?.subRole || '').toUpperCase();

  if (portal === 'CUSTOMER') return role === 'CLIENTE';
  if (portal === 'STAFF') {
    return role === 'MOTOQUEIRO' || (role === 'FUNCIONARIO' && STAFF_SUBROLES.has(subRole));
  }
  if (portal === 'ADMIN') return role === 'ADMIN';
  if (portal === 'SUPER_ADMIN') return role === 'SUPER_ADMIN';
  return false;
}

export function getLoginPortalAccessError(portal: LoginPortal) {
  if (portal === 'CUSTOMER') {
    return 'Este acesso é exclusivo para clientes. Funcionários e administradores devem usar suas áreas próprias.';
  }
  if (portal === 'STAFF') {
    return 'Este acesso é exclusivo para a equipe do restaurante.';
  }
  if (portal === 'ADMIN') {
    return 'Este acesso é exclusivo para administradores de restaurante.';
  }
  if (portal === 'SUPER_ADMIN') {
    return 'Este acesso é exclusivo para o Super Admin da plataforma.';
  }
  return 'A rota de autenticação precisa informar o restaurante na URL.';
}
