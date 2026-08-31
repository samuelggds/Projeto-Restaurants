import { Prisma, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export type InvoiceReconciliationCandidate = {
  id: number;
  paymentLink: string;
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
        SELECT "id"
        FROM "Invoice"
        WHERE "status" IN ('PENDENTE', 'ATRASADO')
          AND "paymentLink" IS NOT NULL
          AND "paymentLink" <> ''
          AND "paymentExternalId" IS NOT NULL
          AND "paymentExternalId" <> ''
          AND "nextReconciliationAt" <= clock_timestamp()
        ORDER BY "nextReconciliationAt" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE "Invoice" AS invoice
      SET
        "lastReconciledAt" = clock_timestamp(),
        "reconciliationAttempts" = invoice."reconciliationAttempts" + 1,
        "nextReconciliationAt" = clock_timestamp() + make_interval(
          mins => LEAST(
            360,
            5 * CAST(power(2, LEAST(invoice."reconciliationAttempts", 6)) AS INTEGER)
          )
        )
      FROM candidates
      WHERE invoice."id" = candidates."id"
      RETURNING
        invoice."id",
        invoice."paymentLink",
        invoice."paymentExternalId",
        invoice."total",
        invoice."reconciliationAttempts"
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
  ) {
    const invoiceId = Number(id);
    const normalizedRestaurantId = Number(restaurantId);
    return prisma.$transaction(async (transaction) => {
      const invoice = await transaction.invoice.update({
        where: { id: invoiceId, restaurantId: normalizedRestaurantId },
        data,
      });
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
