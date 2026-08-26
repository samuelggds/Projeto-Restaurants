import { Prisma, TablePaymentEventType, TablePaymentIntentStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import type { TableAccountActor } from '../domain/tableAccountContracts.js';
import {
  refundTablePaymentInputSchema,
  type RefundTablePaymentInput,
} from '../domain/tableAccountSchemas.js';
import { canRefundTablePayment } from '../domain/tableAccountRules.js';
import fakePaymentProvider from '../providers/FakePaymentProvider.js';
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
    private readonly provider: PaymentProvider = fakePaymentProvider,
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

    if (initial.provider) {
      if (initial.provider !== this.provider.code || !initial.providerExternalId) {
        throw new TablePaymentError(
          'O provedor deste pagamento ainda não possui integração de estorno.',
          409,
          'TABLE_PAYMENT_PROVIDER_UNAVAILABLE',
        );
      }

      try {
        const providerPayment = await this.provider.refundPayment({
          externalId: initial.providerExternalId,
          idempotencyKey: `admin-refund:${initial.publicId}`,
        });
        if (providerPayment.status !== 'REFUNDED') {
          throw new Error('O provedor não confirmou o estorno.');
        }
      } catch (error) {
        console.error(
          '[REFUND_TABLE_PAYMENT_PROVIDER_ERROR]',
          error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        );
        throw new TablePaymentError(
          'O provedor não confirmou o estorno. Tente novamente sem alterar o pagamento.',
          502,
          'TABLE_PAYMENT_PROVIDER_REFUND_FAILED',
        );
      }
    }

    const now = this.now();
    const result = await prisma.$transaction(
      async (tx) => {
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
