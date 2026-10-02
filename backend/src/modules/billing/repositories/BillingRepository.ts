import { Prisma, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export type InvoiceReconciliationCandidate = {
  id: number;
  restaurantId: number;
  paymentAttemptId: number;
  paymentLink: string | null;
  paymentExternalId: string;
  total: Prisma.Decimal;
  reconciliationAttempts: number;
};

class BillingRepository {
  async findSubscriptionByRestaurantId(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.subscription.findUnique({
      where: {
        restaurantId,
      },
      include: {
        restaurant: {
          select: {
            name: true,
            email: true,
            active: true,
            accessBlockReason: true,
            createdAt: true,
            users: {
              where: { role: UserRole.ADMIN },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { id: true, name: true, email: true, createdAt: true },
            },
          },
        },
      },
    });
  }

  async updateSubscription(
    id: number | string,
    data: Prisma.SubscriptionUpdateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.subscription.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async createMonthlyInvoiceIfAbsent(
    data: Prisma.InvoiceUncheckedCreateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.invoice.upsert({
      where: {
        restaurantId_month_year: {
          restaurantId: data.restaurantId,
          month: data.month,
          year: data.year,
        },
      },
      create: data,
      update: {},
    });
  }

  async findPendingInvoices() {
    return prisma.invoice.findMany({
      where: {
        status: {
          in: ['PENDENTE', 'ATRASADO'],
        },
      },
      include: {
        restaurant: true,
      },
    });
  }

  /**
   * Seleciona e agenda atomicamente o próximo lote de reconciliação.
   *
   * Avançar nextReconciliationAt antes da chamada externa impede que as
   * primeiras faturas abertas monopolizem todos os ciclos. SKIP LOCKED mantém
   * a operação segura mesmo se o lease do job expirar durante um failover.
   */
  async claimInvoicesForReconciliation(
    limit: number,
    db: PrismaClientLike = prisma,
  ): Promise<InvoiceReconciliationCandidate[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
      throw new TypeError('O lote de reconciliação deve conter entre 1 e 200 faturas.');
    }

    return db.$queryRaw<InvoiceReconciliationCandidate[]>(Prisma.sql`
      WITH candidates AS (
        SELECT attempt."id"
        FROM "InvoicePaymentAttempt" AS attempt
        JOIN "Invoice" AS invoice
          ON invoice."id" = attempt."invoiceId"
         AND invoice."restaurantId" = attempt."restaurantId"
        WHERE attempt."method" = 'PIX'
          AND attempt."provider" = 'MERCADO_PAGO'
          AND attempt."status" IN ('PENDING', 'DUPLICATE')
          AND invoice."status" <> 'CANCELADO'
          AND attempt."nextReconciliationAt" <= clock_timestamp()
        ORDER BY attempt."nextReconciliationAt" ASC, attempt."id" ASC
        FOR UPDATE OF attempt SKIP LOCKED
        LIMIT ${limit}
      ),
      claimed AS (
        UPDATE "InvoicePaymentAttempt" AS attempt
        SET
          "lastReconciledAt" = clock_timestamp(),
          "reconciliationAttempts" = attempt."reconciliationAttempts" + 1,
          "nextReconciliationAt" = clock_timestamp() + make_interval(
            mins => LEAST(
              360,
              5 * CAST(power(2, LEAST(attempt."reconciliationAttempts", 6)) AS INTEGER)
            )
          ),
          "updatedAt" = clock_timestamp()
        FROM candidates
        WHERE attempt."id" = candidates."id"
        RETURNING attempt.*
      )
      SELECT
        invoice."id",
        invoice."restaurantId",
        claimed."id" AS "paymentAttemptId",
        invoice."paymentLink",
        claimed."providerPaymentId" AS "paymentExternalId",
        claimed."amount" AS "total",
        claimed."reconciliationAttempts"
      FROM claimed
      JOIN "Invoice" AS invoice
        ON invoice."id" = claimed."invoiceId"
       AND invoice."restaurantId" = claimed."restaurantId"
      ORDER BY claimed."id"
    `);
  }

  async updateInvoice(
    id: number | string,
    data: Prisma.InvoiceUpdateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.invoice.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async updateInvoicePaymentDetailsAndResetReconciliation(
    id: number | string,
    restaurantId: number | string,
    data: Prisma.InvoiceUpdateInput,
    paymentAttempt?: {
      method: 'PIX' | 'CARD';
      provider: string;
      providerPaymentId: string;
      amount: Prisma.Decimal | number | string;
      providerStatus?: string | null;
    },
  ) {
    const invoiceId = Number(id);
    const normalizedRestaurantId = Number(restaurantId);
    return prisma.$transaction(async (transaction) => {
      const invoice = await transaction.invoice.update({
        where: { id: invoiceId, restaurantId: normalizedRestaurantId },
        data,
      });

      if (paymentAttempt) {
        const provider = String(paymentAttempt.provider || '').trim().toUpperCase();
        const providerPaymentId = String(paymentAttempt.providerPaymentId || '').trim();
        if (!provider || !providerPaymentId) {
          throw new Error('Tentativa de pagamento da fatura inválida.');
        }

        const existingAttempt = await transaction.invoicePaymentAttempt.findUnique({
          where: {
            provider_providerPaymentId: {
              provider,
              providerPaymentId,
            },
          },
        });
        if (
          existingAttempt &&
          (existingAttempt.invoiceId !== invoiceId ||
            existingAttempt.restaurantId !== normalizedRestaurantId)
        ) {
          throw new Error('Identificador de pagamento já pertence a outra fatura.');
        }

        await transaction.invoicePaymentAttempt.upsert({
          where: {
            provider_providerPaymentId: {
              provider,
              providerPaymentId,
            },
          },
          create: {
            invoiceId,
            restaurantId: normalizedRestaurantId,
            method: paymentAttempt.method,
            provider,
            providerPaymentId,
            amount: paymentAttempt.amount,
            providerStatus: paymentAttempt.providerStatus || null,
          },
          update: {
            providerStatus: paymentAttempt.providerStatus || undefined,
            nextReconciliationAt: new Date(),
          },
        });
      }

      await transaction.$executeRaw(Prisma.sql`
        UPDATE "Invoice"
        SET
          "reconciliationAttempts" = 0,
          "lastReconciledAt" = NULL,
          "nextReconciliationAt" = clock_timestamp()
        WHERE "id" = ${invoiceId}
          AND "restaurantId" = ${normalizedRestaurantId}
      `);
      return invoice;
    });
  }

  async findInvoicePaymentAttempt(
    providerPaymentIdValue: string,
    provider = 'MERCADO_PAGO',
    db: PrismaClientLike = prisma,
  ) {
    const providerPaymentId = String(providerPaymentIdValue || '').trim();
    if (!providerPaymentId) return null;
    return db.invoicePaymentAttempt.findUnique({
      where: {
        provider_providerPaymentId: {
          provider: String(provider || '').trim().toUpperCase(),
          providerPaymentId,
        },
      },
    });
  }

  async registerInvoicePaymentAttempt(
    input: {
      invoiceId: number;
      restaurantId: number;
      method: 'PIX' | 'CARD';
      provider?: string;
      providerPaymentId: string;
      amount: Prisma.Decimal | number | string;
      providerStatus?: string | null;
    },
    db: PrismaClientLike = prisma,
  ) {
    const provider = String(input.provider || 'MERCADO_PAGO').trim().toUpperCase();
    const providerPaymentId = String(input.providerPaymentId || '').trim();
    if (!providerPaymentId) throw new Error('Identificador de pagamento inválido.');

    const existing = await db.invoicePaymentAttempt.findUnique({
      where: { provider_providerPaymentId: { provider, providerPaymentId } },
    });
    if (
      existing &&
      (existing.invoiceId !== input.invoiceId || existing.restaurantId !== input.restaurantId)
    ) {
      throw new Error('Identificador de pagamento já pertence a outra fatura.');
    }

    return db.invoicePaymentAttempt.upsert({
      where: { provider_providerPaymentId: { provider, providerPaymentId } },
      create: {
        invoiceId: input.invoiceId,
        restaurantId: input.restaurantId,
        method: input.method,
        provider,
        providerPaymentId,
        amount: input.amount,
        providerStatus: input.providerStatus || null,
      },
      update: {
        providerStatus: input.providerStatus || undefined,
      },
    });
  }

  /**
   * Confirma o pagamento somente enquanto a fatura ainda esta aberta.
   *
   * O updateMany funciona como compare-and-set: duas confirmacoes concorrentes
   * podem observar a mesma fatura aberta, mas apenas uma delas grava paidAt. A
   * leitura seguinte sempre devolve o estado vencedor, preservando o primeiro
   * instante de pagamento nas repeticoes idempotentes.
   */
  async markInvoicePaidIfOpen(id: number | string, paidAt: Date, db: PrismaClientLike = prisma) {
    const invoiceId = Number(id);
    const updated = await db.invoice.updateMany({
      where: {
        id: invoiceId,
        status: {
          in: ['PENDENTE', 'ATRASADO'],
        },
      },
      data: {
        status: 'PAGO',
        paidAt,
      },
    });

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    return {
      invoice,
      marked: updated.count === 1,
    };
  }

  async deactivateRestaurant(id: number | string, db: PrismaClientLike = prisma) {
    return db.restaurant.updateMany({
      where: {
        id: Number(id),
        accessBlockReason: { not: 'MANUAL' },
      },
      data: {
        active: false,
        accessBlockReason: 'BILLING',
      },
    });
  }

  async activateRestaurant(id: number | string, db: PrismaClientLike = prisma) {
    return db.restaurant.updateMany({
      where: {
        id: Number(id),
        accessBlockReason: 'BILLING',
      },
      data: {
        active: true,
        accessBlockReason: 'NONE',
      },
    });
  }

  async findPaidOrdersByPeriod(restaurantId: number, startDate: Date, endDate: Date) {
    return prisma.order.findMany({
      where: {
        restaurantId,
        paid: true,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  async findExpiredTrials() {
    return prisma.subscription.findMany({
      where: {
        status: 'TESTE',
        trialEndsAt: {
          lte: new Date(),
        },
      },
      include: {
        restaurant: true,
      },
    });
  }

  async findExpiredInvoices() {
    return prisma.invoice.findMany({
      where: {
        status: 'PENDENTE',
        dueDate: {
          lt: new Date(),
        },
      },
      include: {
        restaurant: true,
      },
    });
  }

  async findInvoiceById(id: number | string, db: PrismaClientLike = prisma) {
    return db.invoice.findUnique({
      where: { id: Number(id) },
    });
  }

  async findInvoiceByIdAndRestaurantId(id: number | string, restaurantId: number) {
    return prisma.invoice.findFirst({
      where: {
        id: Number(id),
        restaurantId,
      },
      include: {
        restaurant: { select: { name: true, email: true } },
      },
    });
  }

  async findAllSubscriptions() {
    return prisma.subscription.findMany();
  }

  async findInvoicesByRestaurantId(restaurantId: number) {
    return prisma.invoice.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export default new BillingRepository();
