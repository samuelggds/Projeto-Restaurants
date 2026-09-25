import { randomUUID } from 'node:crypto';
import { OrderPaymentAttemptStatus, PaymentMethod } from '@prisma/client';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';

type CreateCardAttemptInput = {
  orderId: number;
  restaurantId: number;
  provider: string;
  amount: number;
};

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
  async createCardAttempt(input: CreateCardAttemptInput) {
    const publicId = randomUUID();
    const idempotencyKey = randomUUID();
    return withTenantDbContext(input.restaurantId, (db) =>
      db.orderPaymentAttempt.create({
        data: {
          publicId,
          orderId: input.orderId,
          restaurantId: input.restaurantId,
          method: PaymentMethod.CARTAO,
          provider: input.provider,
          status: OrderPaymentAttemptStatus.PENDING,
          amount: input.amount,
          idempotencyKey,
        },
      }),
    );
  }

  async latestForOrder(orderId: number, restaurantId: number) {
    return withTenantDbContext(restaurantId, (db) =>
      db.orderPaymentAttempt.findFirst({
        where: { orderId, restaurantId, method: PaymentMethod.CARTAO },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
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
          ...(diagnostic.failureCode !== undefined
            ? { failureCode: diagnostic.failureCode }
            : {}),
          ...(diagnostic.failureMessage !== undefined
            ? { failureMessage: diagnostic.failureMessage }
            : {}),
          ...([
            OrderPaymentAttemptStatus.APPROVED,
            OrderPaymentAttemptStatus.DECLINED,
            OrderPaymentAttemptStatus.FAILED,
            OrderPaymentAttemptStatus.CANCELED,
            OrderPaymentAttemptStatus.EXPIRED,
            OrderPaymentAttemptStatus.REFUNDED,
          ].includes(status)
            ? { finalizedAt: new Date() }
            : {}),
        },
      }),
    );
  }
}

export default new OrderPaymentAttemptRepository();
