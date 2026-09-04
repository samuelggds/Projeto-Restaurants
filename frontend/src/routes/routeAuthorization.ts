export type RouteUser = {
  role?: string;
  subRole?: unknown;
  mustChangePassword?: boolean;
} | null;
export type RouteDecision = { allowed: true } | { allowed: false; redirectTo: string };

const SERVICE_PATHS = ['/system-blocked', '/system-maintenance'];
const RESERVED_ROOTS = new Set([
  'admin',
  'attendant',
  'billing',
  'change-password',
  'courier',
  'equipe',
  'kitchen',
  'login',
  'orders',
  'profile',
  'recover-password',
  'register',
  'super_admin',
  'system-blocked',
  'system-maintenance',
  'waiter',
]);
const normalizePath = (pathname: string) => pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
const isPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);
const isGuestEntry = (path: string) =>
  path === '/login' ||
  path === '/admin/login' ||
  path === '/recover-password' ||
  path === '/register' ||
  /^\/[^/]+\/(?:login|register|equipe|admin)$/.test(path);

export function isPublicRoute(pathname: string) {
  const path = normalizePath(pathname);
  const singleSegment = path.match(/^\/([^/]+)$/)?.[1];
  const restaurantTable = path.match(/^\/([^/]+)\/mesa\/[^/]+$/)?.[1];
  return (
    path === '/' ||
    path === '/system-maintenance' ||
    /^\/mesa\/[^/]+$/.test(path) ||
    Boolean(singleSegment && !RESERVED_ROOTS.has(singleSegment)) ||
    Boolean(restaurantTable && !RESERVED_ROOTS.has(restaurantTable))
  );
}

export function getRoleHome(user: RouteUser) {
  if (user?.mustChangePassword === true) return '/change-password';

  const role = String(user?.role || '').toUpperCase();
  const subRole = String(user?.subRole || '').toUpperCase();
  if (role === 'SUPER_ADMIN') return '/super_admin';
  if (role === 'ADMIN') return '/admin';
  if (role === 'MOTOQUEIRO') return '/courier';
  if (role === 'FUNCIONARIO' && subRole === 'COZINHA') return '/kitchen';
  if (role === 'FUNCIONARIO' && subRole === 'GARCOM') return '/waiter';
  if (role === 'FUNCIONARIO' && subRole === 'ATENDENTE') return '/attendant';
  if (role === 'CLIENTE') return '/';
  return '/login';
}

export function authorizeRoute(pathname: string, user: RouteUser): RouteDecision {
  const path = normalizePath(pathname);
  const role = String(user?.role || '').toUpperCase();
  const subRole = String(user?.subRole || '').toUpperCase();
  if (!user && isPath(path, '/super_admin') && path !== '/super_admin/login') {
    return { allowed: false, redirectTo: '/super_admin/login' };
  }
  if (!user)
    return isPublicRoute(path) || isGuestEntry(path)
      ? { allowed: true }
      : { allowed: false, redirectTo: '/login' };
  const home = getRoleHome(user);
  if (user.mustChangePassword === true) {
    return path === '/change-password'
      ? { allowed: true }
      : { allowed: false, redirectTo: '/change-password' };
  }
  if (path === '/change-password') return { allowed: true };
  if (path === '/login' && home === '/login') return { allowed: true };
  if (isPath(path, '/attendant')) {
    return role === 'FUNCIONARIO' && subRole === 'ATENDENTE'
      ? { allowed: true }
      : { allowed: false, redirectTo: home };
  }
  if (role === 'SUPER_ADMIN')
    return isPath(path, '/super_admin') ? { allowed: true } : { allowed: false, redirectTo: home };
  if (isPath(path, '/super_admin') || isGuestEntry(path))
    return { allowed: false, redirectTo: home };
  if (role === 'ADMIN') return { allowed: true };
  if (SERVICE_PATHS.includes(path)) return { allowed: true };
  if (role === 'CLIENTE') {
    const ok =
      isPublicRoute(path) || path === '/profile' || /^\/orders\/[^/]+\/tracking$/.test(path);
    return ok ? { allowed: true } : { allowed: false, redirectTo: home };
  }
  if (role === 'MOTOQUEIRO')
    return isPath(path, '/courier') ? { allowed: true } : { allowed: false, redirectTo: home };
  if (role === 'FUNCIONARIO' && subRole === 'COZINHA')
    return isPath(path, '/kitchen') ? { allowed: true } : { allowed: false, redirectTo: home };
  if (role === 'FUNCIONARIO' && subRole === 'GARCOM')
    return isPath(path, '/waiter') ? { allowed: true } : { allowed: false, redirectTo: home };
  if (role === 'FUNCIONARIO' && subRole === 'ATENDENTE')
    return { allowed: false, redirectTo: home };
  return { allowed: false, redirectTo: '/login' };
}
