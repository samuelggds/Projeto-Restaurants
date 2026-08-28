import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { hasBlockingInvoices, isInvoiceBlocking } from '../utils/billingRules.js';

export const BILLING_BLOCKED_CODE = 'BILLING_BLOCKED';
export const RESTAURANT_ACCESS_BLOCKED_CODE = 'RESTAURANT_ACCESS_BLOCKED';

export type RestaurantAccessDecision =
  | { allowed: true; restaurantId: number }
  | {
      allowed: false;
      restaurantId: number;
      reason: 'MANUAL' | 'BILLING';
      code: typeof BILLING_BLOCKED_CODE | typeof RESTAURANT_ACCESS_BLOCKED_CODE;
      message: string;
      invoiceId: number | null;
      paymentLink: string | null;
      dueDate: Date | null;
    };

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

function normalizeBlockReason(value: unknown) {
  const reason = String(value || '').toUpperCase();
  return reason === 'MANUAL' || reason === 'BILLING' ? reason : 'NONE';
}

export class RestaurantAccessService {
  async evaluate(
    restaurantIdValue: number | string,
    db: DatabaseClient = prisma,
    now = new Date(),
  ): Promise<RestaurantAccessDecision | null> {
    const restaurantId = Number(restaurantIdValue);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) return null;

    if (db === prisma) {
      const fastPathDecision = await this.evaluateFastPath(restaurantId, now);
      if (fastPathDecision !== undefined) return fastPathDecision;

      return prisma.$transaction((transaction) =>
        this.evaluateLocked(restaurantId, transaction, now),
      );
    }

    return this.evaluateLocked(restaurantId, db, now);
  }

  private async evaluateFastPath(
    restaurantId: number,
    now: Date,
  ): Promise<RestaurantAccessDecision | null | undefined> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, active: true, accessBlockReason: true },
    });
    if (!restaurant) return null;

    const configuredReason = normalizeBlockReason(restaurant.accessBlockReason);
    if (configuredReason === 'MANUAL' || (!restaurant.active && configuredReason === 'NONE')) {
      return this.manualBlockDecision(restaurantId);
    }

    const openInvoices = await prisma.invoice.findMany({
      where: {
        restaurantId,
        status: { in: ['PENDENTE', 'ATRASADO'] },
      },
      select: { id: true, status: true, dueDate: true },
    });

    if (!hasBlockingInvoices(openInvoices, now) && configuredReason !== 'BILLING') {
      return { allowed: true, restaurantId };
    }

    // Apenas estados que podem gravar uma transição entram na seção crítica.
    return undefined;
  }

  private manualBlockDecision(restaurantId: number): RestaurantAccessDecision {
    return {
      allowed: false,
      restaurantId,
      reason: 'MANUAL',
      code: RESTAURANT_ACCESS_BLOCKED_CODE,
      message: 'Restaurante temporariamente indisponível.',
      invoiceId: null,
      paymentLink: null,
      dueDate: null,
    };
  }

  private async evaluateLocked(
    restaurantId: number,
    db: DatabaseClient,
    now: Date,
  ): Promise<RestaurantAccessDecision | null> {
    // Mantém a mesma ordem de locks do processamento de pagamentos
    // (fatura -> assinatura -> restaurante). Assim, uma confirmação concorrente
    // não pode ser sobrescrita por uma decisão calculada com dados antigos.
    if (typeof db.$queryRaw === 'function') {
      await db.$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "Invoice"
        WHERE "restaurantId" = ${restaurantId}
          AND "status" IN ('PENDENTE', 'ATRASADO')
        ORDER BY "id"
        FOR UPDATE
      `);
      await db.$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "Subscription"
        WHERE "restaurantId" = ${restaurantId}
        FOR UPDATE
      `);
      await db.$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "Restaurant"
        WHERE "id" = ${restaurantId}
        FOR UPDATE
      `);
    }

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        active: true,
        accessBlockReason: true,
      },
    });
    if (!restaurant) return null;

    const configuredReason = normalizeBlockReason(restaurant.accessBlockReason);
    if (configuredReason === 'MANUAL' || (!restaurant.active && configuredReason === 'NONE')) {
      return this.manualBlockDecision(restaurantId);
    }

    const openInvoices = await db.invoice.findMany({
      where: {
        restaurantId,
        status: { in: ['PENDENTE', 'ATRASADO'] },
      },
      orderBy: { dueDate: 'asc' },
    });
    const blockingInvoices = openInvoices.filter((invoice) => isInvoiceBlocking(invoice, now));
    const hasFinancialBlock = hasBlockingInvoices(openInvoices, now);

    if (!hasFinancialBlock && configuredReason !== 'BILLING') {
      return { allowed: true, restaurantId };
    }

    const subscription = await db.subscription.findUnique({
      where: { restaurantId },
      select: { status: true },
    });

    // Uma assinatura cancelada nunca é reativada implicitamente. Neste caso a
    // liberação exige uma decisão explícita do SUPER_ADMIN.
    if (!hasFinancialBlock && subscription?.status === 'CANCELADA') {
      return {
        allowed: false,
        restaurantId,
        reason: 'MANUAL',
        code: RESTAURANT_ACCESS_BLOCKED_CODE,
        message: 'Assinatura inativa. Entre em contato com o suporte da plataforma.',
        invoiceId: null,
        paymentLink: null,
        dueDate: null,
      };
    }

    if (!hasFinancialBlock) {
      await db.restaurant.updateMany({
        where: { id: restaurantId, accessBlockReason: 'BILLING' },
        data: { active: true, accessBlockReason: 'NONE' },
      });
      if (subscription?.status === 'EXPIRADA') {
        await db.subscription.updateMany({
          where: { restaurantId, status: 'EXPIRADA' },
          data: { status: 'ATIVA' },
        });
      }
      return { allowed: true, restaurantId };
    }

    const pendingToOverdue = blockingInvoices.filter((invoice) => invoice.status === 'PENDENTE');
    if (pendingToOverdue.length) {
      await db.invoice.updateMany({
        where: {
          id: { in: pendingToOverdue.map((invoice) => invoice.id) },
          status: 'PENDENTE',
        },
        data: { status: 'ATRASADO' },
      });
    }

    await db.subscription.updateMany({
      where: { restaurantId, status: { not: 'CANCELADA' } },
      data: { status: 'EXPIRADA' },
    });
    await db.restaurant.updateMany({
      where: { id: restaurantId, accessBlockReason: { not: 'MANUAL' } },
      data: { active: false, accessBlockReason: 'BILLING' },
    });

    const blockingInvoice =
      blockingInvoices.find((invoice) => Boolean(invoice.paymentLink)) ||
      blockingInvoices[0] ||
      null;

    return {
      allowed: false,
      restaurantId,
      reason: 'BILLING',
      code: BILLING_BLOCKED_CODE,
      message: 'Restaurante bloqueado por inadimplência',
      invoiceId: blockingInvoice?.id ?? null,
      paymentLink: blockingInvoice?.paymentLink ?? null,
      dueDate: blockingInvoice?.dueDate ?? null,
    };
  }
}

export const restaurantAccessService = new RestaurantAccessService();
export default restaurantAccessService;
