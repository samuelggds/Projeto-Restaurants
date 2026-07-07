import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma.js";

export async function subscriptionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const restaurantId = req.user.restaurantId;

    const subscription = await prisma.subscription.findUnique({
      where: {
        restaurantId: Number(restaurantId),
      },
    });

    if (!subscription) {
      return res.status(403).json({
        error: "Assinatura não encontrada",
      });
    }

    if (subscription.status === "CANCELADA") {
      return res.status(403).json({
        error: "Assinatura cancelada",
      });
    }

    if (subscription.status === "EXPIRADA") {
      return res.status(403).json({
        error: "Assinatura expirada",
      });
    }

    if (
      subscription.trialEndsAt &&
      new Date(subscription.trialEndsAt) < new Date()
    ) {
      return res.status(403).json({
        error: "Período de teste expirado",
      });
    }

    req.subscription = subscription;

    return next();
  } catch (_error: unknown) {
    return res.status(500).json({
      error: "Erro ao validar assinatura",
    });
  }
}
