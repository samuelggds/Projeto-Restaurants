import type { NextFunction, Request, Response } from 'express';
import { premiumTablePlanMiddleware } from './premiumTablePlanMiddleware.js';

export async function premiumTableOrderMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const orderType = String(req.body?.type || '').trim().toUpperCase();

  if (orderType !== 'MESA') {
    return next();
  }

  return premiumTablePlanMiddleware(req, res, next);
}
