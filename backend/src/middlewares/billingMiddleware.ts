import { NextFunction, Request, Response } from "express";
import { InvoiceStatus } from "@prisma/client";
import prisma from "../config/prisma.js";
import {
  hasBlockingInvoices,
  isInvoiceBlocking,
} from "../modules/billing/utils/billingRules.js";

const checkedRequests = new WeakSet<Request>();

export async function billingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (checkedRequests.has(req)) {
      return next();
    }

    checkedRequests.add(req);
    const restaurantId = req.user.restaurantId;

    if (
      String(req.user.role || "").toUpperCase() === "SUPER_ADMIN" ||
      !restaurantId
    ) {
      return next();
    }

    const openInvoices = await prisma.invoice.findMany({
      where: {
        restaurantId: Number(restaurantId),
        status: {
          in: [InvoiceStatus.PENDENTE, InvoiceStatus.ATRASADO],
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    if (!openInvoices.length) {
      return next();
    }

    const now = new Date();
    const shouldBlock = hasBlockingInvoices(openInvoices, now);

    if (shouldBlock) {
      const blockingInvoices = openInvoices.filter((invoice) =>
        isInvoiceBlocking(invoice, now),
      );

      const blockingInvoice =
        blockingInvoices.find((invoice) => Boolean(invoice.paymentLink)) ||
        blockingInvoices[0] ||
        null;

      const pendingToOverdue = openInvoices
        .filter((invoice) => invoice.status === InvoiceStatus.PENDENTE)
        .filter((invoice) => isInvoiceBlocking(invoice, now));

      if (pendingToOverdue.length) {
        await prisma.invoice.updateMany({
          where: {
            id: {
              in: pendingToOverdue.map((invoice) => invoice.id),
            },
          },
          data: {
            status: InvoiceStatus.ATRASADO,
          },
        });
      }

      const subscription = await prisma.subscription.findUnique({
        where: {
          restaurantId: Number(restaurantId),
        },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "EXPIRADA" },
        });
      }

      await prisma.restaurant.update({
        where: { id: Number(restaurantId) },
        data: { active: false },
      });

      return res.status(403).json({
        code: "BILLING_BLOCKED",
        blocked: true,
        error: "Restaurante bloqueado por inadimplência",
        invoiceId: blockingInvoice?.id ?? null,
        paymentLink: blockingInvoice?.paymentLink ?? null,
        dueDate: blockingInvoice?.dueDate ?? null,
      });
    }

    return next();
  } catch (_error: unknown) {
    return res.status(500).json({
      error: "Erro ao validar cobrança",
    });
  }
}
