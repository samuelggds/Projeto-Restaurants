import { NextFunction, Request, Response } from "express";
import { InvoiceStatus } from "@prisma/client";
import prisma from "../config/prisma.js";
import { hasBlockingInvoices } from "../modules/billing/utils/billingRules.js";

async function resolveRestaurantId(req: Request) {
  const directId = Number(
    req.params.restaurantId ||
      req.query.restaurantId ||
      req.body?.restaurantId ||
      0,
  );

  if (Number.isInteger(directId) && directId > 0) {
    return directId;
  }

  const slug = String(req.params.slug || req.query.slug || "").trim();
  if (slug) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    });
    return restaurant?.id || null;
  }

  if (req.path.endsWith("/default")) {
    const restaurant = await prisma.restaurant.findFirst({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    return restaurant?.id || null;
  }

  return null;
}

export async function publicRestaurantBillingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const restaurantId = await resolveRestaurantId(req);

    if (!restaurantId) {
      return next();
    }

    const openInvoices = await prisma.invoice.findMany({
      where: {
        restaurantId,
        status: { in: [InvoiceStatus.PENDENTE, InvoiceStatus.ATRASADO] },
      },
      select: { status: true, dueDate: true },
    });

    if (!hasBlockingInvoices(openInvoices, new Date())) {
      return next();
    }

    return res.status(403).json({
      code: "BILLING_BLOCKED",
      blocked: true,
      error: "Restaurante temporariamente indisponível",
    });
  } catch {
    return res.status(500).json({
      error: "Erro ao validar disponibilidade do restaurante",
    });
  }
}
