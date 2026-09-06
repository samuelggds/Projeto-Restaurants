import type { NextFunction, Request, Response } from 'express';
import { authMiddleware } from './authMiddleware.js';
import { verifyGuestOrderOwnershipToken } from '../modules/orders/utils/guestOrderOwnershipToken.js';

export async function orderIssueAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
  }

  const rawOrderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orderId = Number(rawOrderId || 0);
  const tokenHeader = req.headers['x-guest-order-ownership'];
  const token = Array.isArray(tokenHeader) ? tokenHeader[0] : String(tokenHeader || '');

  try {
    const guestAccess = verifyGuestOrderOwnershipToken(token, orderId);
    req.guestOrderOwnership = guestAccess;
    req.user = {
      id: null,
      restaurantId: null,
      role: 'CLIENTE',
      isGuest: true,
    };
    return next();
  } catch {
    return res.status(401).json({
      error: 'Acesso de visitante ao suporte inválido ou expirado.',
    });
  }
}
