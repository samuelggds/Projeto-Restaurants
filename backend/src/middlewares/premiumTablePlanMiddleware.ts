import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';

export async function premiumTablePlanMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = Number(req.user?.restaurantId || 0);
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId },
      select: { plan: true, status: true },
    });

    const isActive = subscription?.status === 'ATIVA' || subscription?.status === 'TESTE';
    if (!isActive || subscription?.plan !== 'PREMIUM') {
      return res.status(403).json({
        error: 'O cardápio digital com QR Code de mesa está disponível no plano Premium.',
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
