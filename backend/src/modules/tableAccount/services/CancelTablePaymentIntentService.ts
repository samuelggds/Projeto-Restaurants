import { Prisma, TablePaymentEventType, TablePaymentIntentStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import fakePaymentProvider from '../providers/FakePaymentProvider.js';
import type { PaymentProvider } from '../providers/PaymentProvider.js';
import tablePaymentRepository, {
  tablePaymentIntentDtoSelect,
} from '../repositories/TablePaymentRepository.js';
import {
  expireTablePaymentReservations,
  lockTablePaymentSession,
  projectTableSessionFinancialState,
} from './tablePaymentLedger.js';
import { serializeTablePaymentIntent, TablePaymentError } from './tablePaymentSupport.js';
import { tableAccountEvents } from '../realtime/tableAccountEvents.js';

export class CancelTablePaymentIntentService {
  constructor(
    private readonly provider: PaymentProvider = fakePaymentProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    publicId: string;
    tableSessionId: number;
    sessionPublicId: string;
    restaurantId: number;
    participantId: number;
  }) {
    const now = this.now();
    const result = await prisma.$transaction(
      async (tx) => {
        await lockTablePaymentSession(tx, input.restaurantId, input.tableSessionId);
        await expireTablePaymentReservations(tx, input.restaurantId, input.tableSessionId, now);

        const intent = await tablePaymentRepository.findOwnedByPublicId(
          input.publicId,
          input.restaurantId,
          input.tableSessionId,
          input.participantId,
          tx,
        );
        if (!intent) {
          throw new TablePaymentError(
            'Pagamento não encontrado nesta participação.',
            404,
            'TABLE_PAYMENT_NOT_FOUND',
          );
        }

        if (intent.status === TablePaymentIntentStatus.CANCELED) {
          return { intent, previousStatus: intent.status, changed: false };
        }
        if (
          intent.status !== TablePaymentIntentStatus.RESERVED &&
          intent.status !== TablePaymentIntentStatus.PROCESSING
        ) {
          throw new TablePaymentError(
            'Este pagamento não pode mais ser cancelado pelo cliente.',
            409,
            'TABLE_PAYMENT_NOT_CANCELABLE',
          );
        }

        const changed = await tx.tablePaymentIntent.updateMany({
          where: {
            id: intent.id,
            restaurantId: input.restaurantId,
            tableSessionId: input.tableSessionId,
            payerParticipantId: input.participantId,
            status: intent.status,
          },
          data: {
            status: TablePaymentIntentStatus.CANCELED,
            canceledAt: now,
            failureCode: 'CANCELED_BY_PAYER',
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
            restaurantId: input.restaurantId,
            tableSessionId: input.tableSessionId,
            paymentIntentId: intent.id,
            deduplicationKey: `table-payment:${intent.publicId}:canceled-by-payer`,
            type: TablePaymentEventType.CANCELED,
            fromStatus: intent.status,
            toStatus: TablePaymentIntentStatus.CANCELED,
            provider: intent.provider,
            amountCents: intent.totalCents,
            occurredAt: now,
          },
        });
        await projectTableSessionFinancialState(tx, input.restaurantId, input.tableSessionId, now);

        const updated = await tx.tablePaymentIntent.findUniqueOrThrow({
          where: { id: intent.id },
          select: tablePaymentIntentDtoSelect,
        });
        return { intent: updated, previousStatus: intent.status, changed: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    let providerCancellationPending = false;
    if (
      result.changed &&
      result.previousStatus === TablePaymentIntentStatus.PROCESSING &&
      result.intent.provider === this.provider.code &&
      result.intent.providerExternalId
    ) {
      try {
        await this.provider.cancelPayment({
          externalId: result.intent.providerExternalId,
          idempotencyKey: `cancel:${result.intent.publicId}`,
        });
      } catch (error) {
        providerCancellationPending = true;
        console.error(
          '[CANCEL_TABLE_PAYMENT_PROVIDER_ERROR]',
          error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        );
      }
    }

    if (result.changed) {
      await tableAccountEvents.updated({
        sessionId: result.intent.tableSessionId,
        restaurantId: input.restaurantId,
        reason: 'PAYMENT_CANCELED',
        paymentPublicId: result.intent.publicId,
        paymentStatus: result.intent.status,
        occurredAt: result.intent.canceledAt || now,
      });
    }

    return {
      payment: serializeTablePaymentIntent(result.intent, input.sessionPublicId),
      providerCancellationPending,
    };
  }
}

export default new CancelTablePaymentIntentService();
