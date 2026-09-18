import type { NextFunction, Request, Response } from 'express';
import { authMiddleware } from './authMiddleware.js';
import { verifyGuestOrderOwnershipTokenByPublicId } from '../modules/orders/utils/guestOrderOwnershipToken.js';

export async function orderPaymentAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const rawPublicId = Array.isArray(req.params.publicId)
    ? req.params.publicId[0]
    : req.params.publicId;
  const publicId = String(rawPublicId || '').trim();
  const tokenHeader = req.headers['x-guest-order-ownership'];
  const token = Array.isArray(tokenHeader) ? tokenHeader[0] : String(tokenHeader || '');

  const attachGuestProof = () => {
    if (!token) return;
    try {
      req.guestOrderOwnership = verifyGuestOrderOwnershipTokenByPublicId(token, publicId);
    } catch {
      // Authenticated ownership may still authorize the order without a guest proof.
    }
  };

  if (req.headers.authorization) {
    return authMiddleware(req, res, () => {
      attachGuestProof();
      return next();
    });
  }

  try {
    const guestAccess = verifyGuestOrderOwnershipTokenByPublicId(token, publicId);
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
      error: 'Acesso ao pagamento deste pedido inválido ou expirado.',
    });
  }
}
