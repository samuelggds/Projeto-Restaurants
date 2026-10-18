import type { NextFunction, Request, Response } from 'express';
import service from '../services/RestaurantRemoteSupportService.js';
import { normalizeManagedServiceError } from '../domain/managedServiceErrors.js';
const id = (req: Request) => req.params.restaurantId;
const sid = (req: Request) => String(req.params.sessionId);
const userId = (req: Request) => Number(req.user?.id || 0);
const role = (req: Request) => String(req.user?.role || '');
function respond(fn: (req: Request) => Promise<unknown>, code = 200) {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try { return res.status(code).json(await fn(req)); }
    catch (error) { return next(normalizeManagedServiceError(error)); }
  };
}
export const listRemoteSupport = respond(req => service.list(id(req), userId(req), role(req)));
export const requestRemoteSupport = respond(req => service.request(id(req), userId(req), req.body), 201);
export const decideRemoteSupport = respond(req => service.decide(id(req), sid(req), userId(req), req.body?.approve === true));
export const closeRemoteSupport = respond(req => service.close(id(req), sid(req), userId(req), role(req)));
