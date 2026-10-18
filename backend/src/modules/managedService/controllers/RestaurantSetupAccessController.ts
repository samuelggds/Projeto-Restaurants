import type { Request, Response, NextFunction } from 'express';
import service from '../services/RestaurantSetupAccessService.js';
import { normalizeManagedServiceError } from '../domain/managedServiceErrors.js';

const first = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
const actor = (req: Request) => Number(req.user?.id || 0);
const rid = (req: Request) => first(req.params.restaurantId);
const handle = (operation: (req: Request) => Promise<unknown>, status = 200) =>
  async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try { return res.status(status).json(await operation(req)); }
    catch (error) { return next(normalizeManagedServiceError(error)); }
  };

export const requestSetupAccess = handle((req) => service.request(rid(req), actor(req), req.body?.reason), 201);
export const listSetupAccess = handle((req) => service.list(rid(req), actor(req), String(req.user?.role || '')));
export const decideSetupAccess = handle((req) => service.decide(actor(req), rid(req), String(first(req.params.id)), req.body?.approve === true, Number(req.body?.hours ?? 2)));
export const revokeSetupAccess = handle((req) => service.revoke(actor(req), rid(req), String(first(req.params.id))));

export async function requireSetupConsent(req: Request, res: Response, next: NextFunction) {
  try {
    await service.assertAuthorized(rid(req), actor(req));
    return next();
  } catch (error) {
    return next(normalizeManagedServiceError(error));
  }
}
