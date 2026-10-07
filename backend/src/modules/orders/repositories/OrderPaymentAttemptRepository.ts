import { randomUUID } from 'node:crypto';
import { OrderPaymentAttemptStatus, PaymentMethod } from '@prisma/client';
import { withTenantDbContext, type TenantDbClient } from '../../../database/tenantDbContext.js';
import { normalizeStoredCardBrand } from '../domain/cardBrand.js';
import { onlinePaymentExpiresAt } from '../../payments/domain/onlinePaymentPolicy.js';

type CreateCardAttemptInput = {
  orderId: number;
  restaurantId: number;
  provider: string;
  amount: number;
  cardPaymentType?: 'credit' | 'debit';
  cardBrand?: string | null;
  cardLast4?: string | null;
};

const TERMINAL_ATTEMPT_STATUSES = new Set<OrderPaymentAttemptStatus>([
  OrderPaymentAttemptStatus.APPROVED,
  OrderPaymentAttemptStatus.DECLINED,
  OrderPaymentAttemptStatus.FAILED,
  OrderPaymentAttemptStatus.CANCELED,
  OrderPaymentAttemptStatus.EXPIRED,
  OrderPaymentAttemptStatus.REFUNDED,
]);

type AttemptDiagnostic = {
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  providerStatus?: string | null;
  providerStatusDetail?: string | null;
  providerRequestId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
};

class OrderPaymentAttemptRepository {
  private async createCardAttemptInTransaction(input: CreateCardAttemptInput, db: TenantDbClient) {
    const publicId = randomUUID();
    const idempotencyKey = randomUUID();
    const cardBrand = normalizeStoredCardBrand(input.cardBrand);
    const digits = String(input.cardLast4 || '').replace(/\D/g, '');
    const cardLast4 = digits.length === 4 ? digits : null;
    return db.orderPaymentAttempt.create({
      data: {
        publicId,
        orderId: input.orderId,
        restaurantId: input.restaurantId,
        method: PaymentMethod.CARTAO,
        cardPaymentType: input.cardPaymentType === 'debit' ? 'debit' : 'credit',
        cardBrand,
        cardLast4,
        provider: input.provider,
        status: OrderPaymentAttemptStatus.PENDING,
        amount: input.amount,
        idempotencyKey,
      },
    });
  }

  async createCardAttempt(input: CreateCardAttemptInput) {
    return withTenantDbContext(input.restaurantId, (db) =>
      this.createCardAttemptInTransaction(input, db),
    );
  }

  async claimCardRetry(input: CreateCardAttemptInput) {
    return withTenantDbContext(input.restaurantId, async (db) => {
      // Serialize retries with each other and payment confirmation. The provider
      // request runs after commit, while this durable attempt blocks new charges.
      await db.$queryRaw`
        SELECT "id" FROM "Order" WHERE "id" = ${input.orderId}
          AND "restaurantId" = ${input.restaurantId} FOR UPDATE
      `;
      const order = await db.order.findFirst({
        where: { id: input.orderId, restaurantId: input.restaurantId },
        select: {
          paid: true,
          status: true,
          paymentMethod: true,
          payOnDelivery: true,
          refundStatus: true,
          createdAt: true,
          total: true,
        },
      });
      if (order?.paid) return { kind: 'PAID' as const };
      if (
        !order ||
        order.status === 'CANCELADO' ||
        order.paymentMethod !== PaymentMethod.CARTAO ||
        order.payOnDelivery ||
        ['PROCESSING', 'SUCCEEDED'].includes(order.refundStatus) ||
        onlinePaymentExpiresAt(order.createdAt).getTime() <= Date.now()
      ) {
        return { kind: 'UNAVAILABLE' as const };
      }
      const latest = await db.orderPaymentAttempt.findFirst({
        where: {
          orderId: input.orderId,
          restaurantId: input.restaurantId,
          method: PaymentMethod.CARTAO,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      // An absent first attempt means checkout creation has not reserved its
      // charge yet. Never race that in-flight operation with a retry.
      if (!latest) return { kind: 'PROCESSING' as const };
      const active = await db.orderPaymentAttempt.findFirst({
        where: {
          orderId: input.orderId,
          restaurantId: input.restaurantId,
          method: PaymentMethod.CARTAO,
          status: {
            in: [
              OrderPaymentAttemptStatus.PENDING,
              OrderPaymentAttemptStatus.PROCESSING,
              OrderPaymentAttemptStatus.APPROVED,
            ],
          },
        },
      });
      if (active) return { kind: 'PROCESSING' as const };

      const attempt = await this.createCardAttemptInTransaction(
        { ...input, amount: Number(order.total) },
        db,
      );
      // A status poll must not reconcile the prior declined provider order into
      // this new attempt while its provider request has not returned yet.
      await db.order.updateMany({
        where: { id: input.orderId, restaurantId: input.restaurantId },
        data: { cardCheckoutSessionId: null },
      });
      return { kind: 'CLAIMED' as const, attempt };
    });
  }

  async latestForOrder(orderId: number, restaurantId: number) {
    return withTenantDbContext(restaurantId, (db) =>
      db.orderPaymentAttempt.findFirst({
        where: { orderId, restaurantId, method: PaymentMethod.CARTAO },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  }

  async countForOrder(orderId: number, restaurantId: number) {
    return withTenantDbContext(restaurantId, (db) =>
      db.orderPaymentAttempt.count({
        where: { orderId, restaurantId, method: PaymentMethod.CARTAO },
      }),
    );
  }

  async bindRecoveredProviderOrder(input: {
    orderId: number;
    restaurantId: number;
    attemptId: number;
    providerOrderId: string;
    amount: number;
  }) {
    return withTenantDbContext(input.restaurantId, async (db) => {
      await db.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${input.orderId}
        AND "restaurantId" = ${input.restaurantId} FOR UPDATE`;
      const order = await db.order.findFirst({
        where: { id: input.orderId, restaurantId: input.restaurantId },
        select: {
          cardCheckoutSessionId: true,
          total: true,
          paymentMethod: true,
          payOnDelivery: true,
        },
      });
      const sessionId = `mp_order:${input.providerOrderId}`;
      if (
        !order ||
        order.paymentMethod !== PaymentMethod.CARTAO ||
        order.payOnDelivery ||
        Math.round(Number(order.total) * 100) !== Math.round(input.amount * 100) ||
        (order.cardCheckoutSessionId && order.cardCheckoutSessionId !== sessionId)
      )
        return false;
      const latest = await db.orderPaymentAttempt.findFirst({
        where: {
          orderId: input.orderId,
          restaurantId: input.restaurantId,
          method: PaymentMethod.CARTAO,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      if (
        !latest ||
        latest.id !== input.attemptId ||
        latest.provider !== 'MERCADO_PAGO' ||
        (latest.providerOrderId && latest.providerOrderId !== input.providerOrderId) ||
        !['PENDING', 'PROCESSING', 'APPROVED'].includes(latest.status)
      )
        return false;
      const updated = await db.orderPaymentAttempt.updateMany({
        where: {
          id: latest.id,
          restaurantId: input.restaurantId,
          providerOrderId: latest.providerOrderId,
          status: latest.status,
        },
        data: { providerOrderId: input.providerOrderId },
      });
      if (updated.count !== 1) return false;
      await db.order.updateMany({
        where: {
          id: input.orderId,
          restaurantId: input.restaurantId,
          cardCheckoutSessionId: order.cardCheckoutSessionId,
        },
        data: { cardCheckoutSessionId: sessionId },
      });
      return true;
    });
  }

  async update(
    id: number,
    restaurantId: number,
    status: OrderPaymentAttemptStatus,
    diagnostic: AttemptDiagnostic = {},
  ) {
    return withTenantDbContext(restaurantId, (db) =>
      db.orderPaymentAttempt.update({
        where: { id },
        data: {
          status,
          ...(diagnostic.providerOrderId !== undefined
            ? { providerOrderId: diagnostic.providerOrderId }
            : {}),
          ...(diagnostic.providerPaymentId !== undefined
            ? { providerPaymentId: diagnostic.providerPaymentId }
            : {}),
          ...(diagnostic.providerStatus !== undefined
            ? { providerStatus: diagnostic.providerStatus }
            : {}),
          ...(diagnostic.providerStatusDetail !== undefined
            ? { providerStatusDetail: diagnostic.providerStatusDetail }
            : {}),
          ...(diagnostic.providerRequestId !== undefined
            ? { providerRequestId: diagnostic.providerRequestId }
            : {}),
          ...(diagnostic.failureCode !== undefined ? { failureCode: diagnostic.failureCode } : {}),
          ...(diagnostic.failureMessage !== undefined
            ? { failureMessage: diagnostic.failureMessage }
            : {}),
          ...(TERMINAL_ATTEMPT_STATUSES.has(status) ? { finalizedAt: new Date() } : {}),
        },
      }),
    );
  }
}

export default new OrderPaymentAttemptRepository();
