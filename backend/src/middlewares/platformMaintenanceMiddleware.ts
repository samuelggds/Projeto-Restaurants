import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { resolveAccessToken } from '../modules/auth/security/accessToken.js';
import {
  platformMaintenanceResponse,
  platformMaintenanceStateService,
  type PlatformMaintenanceStateService,
} from '../modules/platform/services/PlatformMaintenanceService.js';

export {
  PlatformMaintenanceStateService,
  resolvePlatformSettingsCacheTtlMs,
} from '../modules/platform/services/PlatformMaintenanceService.js';

type AccessRoleResolver = (token: string) => Promise<string | null>;

const AUTHENTICATION_BOOTSTRAP_ROUTES = new Set([
  'POST /auth/login',
  'POST /auth/google',
  'POST /auth/login/verify-2fa',
  'POST /auth/refresh',
  'POST /auth/logout',
  'GET /auth/google/client-id',
]);

function matchesPathPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function normalizedRouteKey(req: Pick<Request, 'method' | 'path'>) {
  const path = String(req.path || '')
    .replace(/\/+$/, '')
    .toLowerCase();
  return `${String(req.method || '').toUpperCase()} ${path || '/'}`;
}

export function isMaintenanceBypassRequest(req: Pick<Request, 'method' | 'path'>) {
  if (String(req.method || '').toUpperCase() === 'OPTIONS') return true;

  const path = String(req.path || '')
    .replace(/\/+$/, '')
    .toLowerCase();

  if (path === '/health' || path === '/ready' || path === '/platform/status') return true;
  if (AUTHENTICATION_BOOTSTRAP_ROUTES.has(normalizedRouteKey(req))) return true;

  return ['/api/webhooks', '/billing/webhook', '/orders/webhook', '/table-accounts/webhooks'].some(
    (prefix) => matchesPathPrefix(path, prefix),
  );
}

function readBearerToken(req: Request) {
  const [scheme, token] = String(req.headers.authorization || '')
    .trim()
    .split(/\s+/u);
  if (String(scheme || '').toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

async function resolveRoleFromAccessToken(token: string) {
  const resolved = await resolveAccessToken(token);
  return resolved.user.role;
}

export function createPlatformMaintenanceMiddleware(
  stateService: Pick<PlatformMaintenanceStateService, 'getState'>,
  accessRoleResolver: AccessRoleResolver = resolveRoleFromAccessToken,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (isMaintenanceBypassRequest(req)) return next();

    const state = await stateService.getState();
    if (!state.maintenanceMode) return next();

    const token = readBearerToken(req);
    if (token) {
      try {
        const role = await accessRoleResolver(token);
        if (String(role || '').toUpperCase() === 'SUPER_ADMIN') return next();
      } catch {
        // Durante manutenção, tokens ausentes ou inválidos recebem a mesma
        // resposta pública, sem revelar detalhes de autenticação.
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '60');
    return res
      .status(503)
      .json(platformMaintenanceResponse(state.maintenanceMessage, req.requestId));
  };
}

export const platformMaintenanceMiddleware = createPlatformMaintenanceMiddleware(
  platformMaintenanceStateService,
);

export function createPlatformStatusHandler(
  stateService: Pick<PlatformMaintenanceStateService, 'getState'> = platformMaintenanceStateService,
): RequestHandler {
  return async (_req, res) => {
    const state = await stateService.getState();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      available: !state.maintenanceMode,
      maintenanceMode: state.maintenanceMode,
      maintenanceMessage: state.maintenanceMessage,
    });
  };
}

export const platformStatusHandler = createPlatformStatusHandler();
