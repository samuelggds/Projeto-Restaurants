import type { NextFunction, Request, Response } from 'express';
import restaurantAccessService from '../modules/billing/services/RestaurantAccessService.js';

const validatedRestaurantIds = new WeakMap<Request, Set<number>>();

export function resolveBillingRestaurantId(req: Request) {
  const candidates = [
    req.user?.restaurantId,
    req.tableSession?.restaurantId,
    req.body?.restaurantId,
  ];

  for (const candidate of candidates) {
    const restaurantId = Number(candidate || 0);
    if (Number.isInteger(restaurantId) && restaurantId > 0) return restaurantId;
  }

  return null;
}

async function validateRestaurantAccess(
  req: Request,
  res: Response,
  next: NextFunction,
  allowBillingRecovery: boolean,
) {
  try {
    if (String(req.user?.role || '').toUpperCase() === 'SUPER_ADMIN') return next();

    const restaurantId = resolveBillingRestaurantId(req);
    // Um cliente autenticado pode não carregar tenant no token. Não marcamos a
    // requisição como validada: a rota de pedido ainda resolverá restaurantId
    // pelo corpo ou pela sessão da mesa e executará esta verificação novamente.
    if (!restaurantId) return next();

    const alreadyValidated = validatedRestaurantIds.get(req);
    if (alreadyValidated?.has(restaurantId)) return next();

    const decision = await restaurantAccessService.evaluate(restaurantId);
    if (!decision) {
      return res.status(404).json({ error: 'Restaurante não encontrado.' });
    }

    if ('code' in decision) {
      if (allowBillingRecovery && decision.reason === 'BILLING') {
        return next();
      }
      return res.status(403).json({
        code: decision.code,
        blocked: true,
        reason: decision.reason,
        error: decision.message,
        invoiceId: decision.invoiceId,
        paymentLink: decision.paymentLink,
        dueDate: decision.dueDate,
      });
    }

    const validated = alreadyValidated || new Set<number>();
    validated.add(restaurantId);
    validatedRestaurantIds.set(req, validated);
    return next();
  } catch {
    return res.status(500).json({ error: 'Erro ao validar acesso do restaurante.' });
  }
}

export function billingMiddleware(req: Request, res: Response, next: NextFunction) {
  return validateRestaurantAccess(req, res, next, false);
}

export function billingRecoveryMiddleware(req: Request, res: Response, next: NextFunction) {
  return validateRestaurantAccess(req, res, next, true);
}
