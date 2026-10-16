import type { RequestHandler } from 'express';

// Public menu/catalog resources remain eligible for their own cache policy.
// Financial, authenticated and session-based responses must never be shared.
const PRIVATE_ROUTE_ROOTS = new Set([
  'auth',
  'orders',
  'billing',
  'subscription',
  'table-accounts',
  'table-sessions',
  'table-reservations',
  'waiter-calls',
  'delivery-chat',
  'pickup-payments',
  'payment-terminals',
  'employees',
  'employee-payments',
  'employee-compensation',
  'courier-compensation',
  'customer-addresses',
  'admin-portal',
  'super-admin',
  'managed-service',
  'audit-logs',
  'ai-support',
  'menu-import',
  'image-enhancement',
  'kitchen-printing',
  'attendant',
  'sales-leads',
  'settings',
  'coupons',
  'tables',
]);

export function shouldPreventHttpCaching(path: string, hasCredentials: boolean): boolean {
  if (hasCredentials) return true;
  const normalizedPath = path.trim().toLowerCase();
  const root = normalizedPath.split('/')[1] || '';
  return PRIVATE_ROUTE_ROOTS.has(root);
}

export const privateApiCacheMiddleware: RequestHandler = (req, res, next) => {
  const hasCredentials = Boolean(
    req.headers.authorization ||
      req.headers.cookie ||
      req.headers['x-api-key'] ||
      req.headers['x-session-token'],
  );
  if (shouldPreventHttpCaching(req.path, hasCredentials)) {
    res.setHeader('Cache-Control', 'private, no-store');
  }
  next();
};
