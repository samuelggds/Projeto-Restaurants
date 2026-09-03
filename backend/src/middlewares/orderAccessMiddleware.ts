import { NextFunction, Request, Response } from 'express';
import { authMiddleware } from './authMiddleware.js';
import { optionalAuthMiddleware } from './optionalAuthMiddleware.js';
import { sessionMiddleware } from './sessionMiddleware.js';
import { tableParticipantMiddleware } from './tableParticipantMiddleware.js';

function continueAfterParticipantCheck(req: Request, res: Response, next: NextFunction) {
  if (req.tableParticipant?.orderingBlocked) {
    return res.status(409).json({
      error: 'Você já pediu a conta. Aguarde a confirmação do pagamento para fazer novos pedidos.',
      code: 'TABLE_PARTICIPANT_ORDERING_BLOCKED',
    });
  }
  return next();
}

export async function orderAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const sessionToken = req.headers['x-session-token'];
  const bodyRestaurantId = Number(req.body?.restaurantId || 0);
  const orderType = String(req.body?.type || '').toUpperCase();

  if (orderType === 'MESA' && !sessionToken) {
    return res.status(401).json({
      error: 'Sessão da mesa não informada. Acesse novamente pelo QR Code oficial.',
    });
  }

  if (orderType === 'MESA' && sessionToken) {
    return optionalAuthMiddleware(req, res, () =>
      sessionMiddleware(req, res, () => {
        const requestedTableId = Number(req.body?.tableId || 0);

        if (requestedTableId > 0 && requestedTableId !== Number(req.tableSession.tableId)) {
          return res.status(403).json({
            error: 'Sessão da mesa inválida para este pedido.',
          });
        }

        req.body.tableId = Number(req.tableSession.tableId);
        return tableParticipantMiddleware(req, res, () =>
          continueAfterParticipantCheck(req, res, next),
        );
      }),
    );
  }

  if (authHeader) {
    return authMiddleware(req, res, next);
  }

  if (sessionToken) {
    return sessionMiddleware(req, res, () => {
      if (orderType === 'MESA') {
        const requestedTableId = Number(req.body?.tableId || 0);

        if (requestedTableId > 0 && requestedTableId !== Number(req.tableSession.tableId)) {
          return res.status(403).json({
            error: 'Sessão da mesa inválida para este pedido.',
          });
        }

        req.body.tableId = Number(req.tableSession.tableId);
      }

      req.user = {
        id: null,
        restaurantId: req.tableSession.restaurantId,
        role: 'CLIENTE',
      };

      return next();
    });
  }

  if (Number.isInteger(bodyRestaurantId) && bodyRestaurantId > 0) {
    req.user = {
      id: null,
      restaurantId: bodyRestaurantId,
      role: 'CLIENTE',
      isGuest: true,
    };

    return next();
  }

  return res.status(401).json({ error: 'Token não informado!' });
}
