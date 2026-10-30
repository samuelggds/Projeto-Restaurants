import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { hasNfcCardAccess } from '../modules/billing/domain/planFeaturePolicy.js';

/** Fail closed. Use the tenant id established by authentication, never by client input. */
export async function premiumNfcPlanMiddleware(req: Request, res: Response, next: NextFunction) {
  const restaurantId = Number(req.user?.restaurantId || 0);
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
    return res.status(403).json({ code: 'NFC_TENANT_REQUIRED', error: 'Restaurante autenticado obrigatório.' });
  }
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId },
      select: { plan: true, status: true },
    });
    if (!hasNfcCardAccess(subscription?.plan, subscription?.status)) {
      return res.status(403).json({
        code: 'PREMIUM_NFC_PLAN_REQUIRED',
        error: 'Cartões NFC disponíveis apenas nos planos Premium e Gestão Total com assinatura ativa ou em teste.',
      });
    }
    return next();
  } catch {
    return res.status(503).json({ code: 'NFC_PLAN_CHECK_UNAVAILABLE', error: 'Não foi possível validar o plano NFC do restaurante.' });
  }
}
