export type LoginPortal = 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN' | 'GENERIC';

export type LoginPortalUser = {
  role?: string;
  subRole?: unknown;
} | null;

const STAFF_SUBROLES = new Set(['COZINHA', 'GARCOM', 'ATENDENTE']);

const normalizePath = (pathname: string) =>
  String(pathname || '/')
    .split(/[?#]/, 1)[0]
    .replace(/\/+$/u, '') || '/';

export function normalizePortalRestaurantSlug(value: unknown) {
  const raw = String(value || '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,100}$/u.test(raw) ? raw : '';
}

export function resolveLoginPortal(pathname: string): LoginPortal {
  const path = normalizePath(pathname);
  if (path === '/super_admin/login') return 'SUPER_ADMIN';
  if (path === '/admin/login') return 'ADMIN';
  if (/^\/[^/]+\/equipe$/u.test(path)) return 'STAFF';
  if (/^\/[^/]+\/login$/u.test(path)) return 'CUSTOMER';
  return 'GENERIC';
}

export function getRestaurantSlugFromAuthPath(pathname: string) {
  const path = normalizePath(pathname);
  const match = path.match(/^\/([^/]+)\/(?:login|register|equipe)$/u);
  return normalizePortalRestaurantSlug(match?.[1]);
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

  // O Super Admin possui uma entrada técnica dedicada e não deve autenticar
  // pelo portal genérico usado como fallback de compatibilidade.
  return Boolean(role) && role !== 'SUPER_ADMIN';
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
  return 'Use o acesso técnico reservado para entrar como Super Admin.';
}
