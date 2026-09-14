import { Prisma, TablePaymentEventType, TablePaymentIntentStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import type { TableAccountActor } from '../domain/tableAccountContracts.js';
import {
  refundTablePaymentInputSchema,
  type RefundTablePaymentInput,
} from '../domain/tableAccountSchemas.js';
import { canRefundTablePayment } from '../domain/tableAccountRules.js';
import { executeTablePaymentRemoteOperation } from './tablePaymentRemoteOperation.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import type { PaymentProvider } from '../providers/PaymentProvider.js';
import tablePaymentRepository, {
  tablePaymentIntentDtoSelect,
} from '../repositories/TablePaymentRepository.js';
import {
  lockTablePaymentSession,
  projectTableSessionFinancialState,
} from './tablePaymentLedger.js';
import { serializeTablePaymentIntent, TablePaymentError } from './tablePaymentSupport.js';
import { tableAccountEvents } from '../realtime/tableAccountEvents.js';

export class RefundTablePaymentService {
  constructor(
    private readonly provider: PaymentProvider | null = null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    input: { publicId: string; actor: TableAccountActor },
    rawPayload: RefundTablePaymentInput,
  ) {
    const payload = refundTablePaymentInputSchema.parse(rawPayload);
    const restaurantId = Number(input.actor.restaurantId || 0);
    if (!canRefundTablePayment(input.actor, restaurantId)) {
      throw new TablePaymentError(
        'Somente o administrador deste restaurante pode estornar pagamentos da mesa.',
        403,
        'TABLE_PAYMENT_REFUND_FORBIDDEN',
      );
    }

    const initial = await tablePaymentRepository.findForStaffByPublicId(
      input.publicId,
      restaurantId,
    );
    if (!initial) {
      throw new TablePaymentError(
        'Pagamento não encontrado neste restaurante.',
        404,
        'TABLE_PAYMENT_NOT_FOUND',
      );
    }

    if (initial.status === TablePaymentIntentStatus.REFUNDED) {
      return {
        payment: serializeTablePaymentIntent(initial, initial.tableSession.publicId),
        idempotentReplay: true,
      };
    }
    if (initial.status !== TablePaymentIntentStatus.PAID) {
      throw new TablePaymentError(
        'Somente pagamentos confirmados podem ser estornados.',
        409,
        'TABLE_PAYMENT_NOT_REFUNDABLE',
      );
    }

    if (initial.provider || initial.method === 'PIX' || initial.method === 'CARD') {
      const operation = await executeTablePaymentRemoteOperation(initial, 'refund', this.provider);
      if (!operation.confirmed) {
        throw new TablePaymentError(
          'O estorno ainda não foi confirmado. O pagamento permanece pago; confira a devolução no gateway e concilie novamente. A solicitação não será reenviada automaticamente.',
          409,
          'TABLE_PAYMENT_REFUND_PENDING_MANUAL_REVIEW',
        );
      }
    }

    const now = this.now();
    const result = await prisma.$transaction(
      async (tx) => {
        await setTenantDbContext(tx, restaurantId);
        await lockTablePaymentSession(tx, restaurantId, initial.tableSessionId);

        const intent = await tablePaymentRepository.findForStaffByPublicId(
          input.publicId,
          restaurantId,
          tx,
        );
        if (!intent) {
          throw new TablePaymentError(
            'Pagamento não encontrado neste restaurante.',
            404,
            'TABLE_PAYMENT_NOT_FOUND',
          );
        }
        if (intent.status === TablePaymentIntentStatus.REFUNDED) {
          return { intent, idempotentReplay: true };
        }
        if (intent.status !== TablePaymentIntentStatus.PAID) {
          throw new TablePaymentError(
            'O pagamento foi atualizado por outra operação e não pode ser estornado.',
            409,
            'TABLE_PAYMENT_CONFLICT',
          );
        }

        const changed = await tx.tablePaymentIntent.updateMany({
          where: {
            id: intent.id,
            restaurantId,
            tableSessionId: intent.tableSessionId,
            status: TablePaymentIntentStatus.PAID,
          },
          data: {
            status: TablePaymentIntentStatus.REFUNDED,
            refundedAt: now,
          },
        });
        if (changed.count !== 1) {
          throw new TablePaymentError(
            'O pagamento foi atualizado por outra operação. Atualize a conta.',
            409,
            'TABLE_PAYMENT_CONFLICT',
          );
        }

        await tx.tablePaymentEvent.create({
          data: {
            restaurantId,
            tableSessionId: intent.tableSessionId,
            paymentIntentId: intent.id,
            deduplicationKey: `table-payment:${intent.publicId}:admin-refunded`,
            type: TablePaymentEventType.REFUNDED,
            fromStatus: TablePaymentIntentStatus.PAID,
            toStatus: TablePaymentIntentStatus.REFUNDED,
            provider: intent.provider,
            amountCents: intent.totalCents,
            actorUserId: input.actor.id,
            occurredAt: now,
            metadata: { reason: payload.reason },
          },
        });
        await projectTableSessionFinancialState(tx, restaurantId, intent.tableSessionId, now);

        const updated = await tx.tablePaymentIntent.findUniqueOrThrow({
          where: { id: intent.id },
          select: tablePaymentIntentDtoSelect,
        });
        return { intent: updated, idempotentReplay: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!result.idempotentReplay) {
      await tableAccountEvents.updated({
        sessionId: result.intent.tableSessionId,
        restaurantId,
        reason: 'PAYMENT_REFUNDED',
        paymentPublicId: result.intent.publicId,
        paymentStatus: result.intent.status,
        occurredAt: result.intent.refundedAt || now,
      });
    }

    return {
      payment: serializeTablePaymentIntent(result.intent, initial.tableSession.publicId),
      idempotentReplay: result.idempotentReplay,
    };
  }
}

export default new RefundTablePaymentService();
