import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { hasTableQrAccess } from '../modules/billing/domain/planFeaturePolicy.js';

export async function premiumTablePlanMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = Number(req.user?.restaurantId || req.tableSession?.restaurantId || 0);
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId },
      select: { plan: true, status: true, restaurant: { select: { active: true, accessBlockReason: true, billingTemporaryAccessUntil: true } } },
    });

    if (!hasTableQrAccess(subscription?.plan, subscription?.status, subscription?.restaurant)) {
      return res.status(403).json({
        error: 'O acesso às mesas exige uma assinatura ativa dos planos Entrada ou Avançado.',
        code: 'PREMIUM_TABLE_PLAN_REQUIRED',
      });
    }

    return next();
  } catch {
    return res.status(500).json({
      error: 'Não foi possível validar o plano do restaurante.',
    });
  }
}
