import {
  Prisma,
  TablePaymentEventType,
  TablePaymentIntentStatus,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';
import fakePaymentProvider from '../providers/FakePaymentProvider.js';
import type {
  PaymentProvider,
  ProviderWebhookInput,
  ValidatedPaymentWebhook,
} from '../providers/PaymentProvider.js';
import { tablePaymentIntentDtoSelect } from '../repositories/TablePaymentRepository.js';
import {
  lockTablePaymentSession,
  projectTableSessionFinancialState,
} from './tablePaymentLedger.js';
import { sha256, TablePaymentError } from './tablePaymentSupport.js';
import { resolveTablePaymentProviderTransition } from '../domain/tablePaymentProviderTransition.js';
import { tableAccountEvents } from '../realtime/tableAccountEvents.js';

export class ProcessTablePaymentWebhookService {
  constructor(private readonly provider: PaymentProvider = fakePaymentProvider) {}

  async execute(input: ProviderWebhookInput) {
    const event = await this.provider.validateWebhook(input);
    return this.executeValidated(event);
  }

  async executeValidated(event: ValidatedPaymentWebhook) {
    const initial = await prisma.tablePaymentIntent.findUnique({
      where: {
        provider_providerExternalId: {
          provider: this.provider.code,
          providerExternalId: event.externalId,
        },
      },
      select: tablePaymentIntentDtoSelect,
    });
    if (!initial) {
      return { received: true, ignored: true };
    }

    if (Number(initial.totalCents) !== event.amountCents) {
      throw new TablePaymentError(
        'O valor do evento não corresponde ao pagamento.',
        409,
        'PROVIDER_AMOUNT_MISMATCH',
      );
    }

    const deduplicationKey = `table-payment-webhook:${sha256(
      `${this.provider.code}:${event.eventId}`,
    )}`;
    const outcome = await prisma.$transaction(
      async (tx) => {
        await lockTablePaymentSession(tx, initial.restaurantId, initial.tableSessionId);

        const duplicate = await tx.tablePaymentEvent.findUnique({
          where: { deduplicationKey },
          select: { id: true },
        });
        const current = await tx.tablePaymentIntent.findUniqueOrThrow({
          where: { id: initial.id },
          select: tablePaymentIntentDtoSelect,
        });
        const transition = resolveTablePaymentProviderTransition(current.status, event.status);
        const latePayment = transition.latePayment;

        if (duplicate) {
          return { duplicate: true, latePayment, current };
        }

        const nextStatus = transition.nextStatus as TablePaymentIntentStatus | null;
        const eventType = transition.eventType as TablePaymentEventType;

        if (nextStatus) {
          const timestampData =
            nextStatus === TablePaymentIntentStatus.PAID
              ? { paidAt: event.occurredAt }
              : nextStatus === TablePaymentIntentStatus.REFUNDED
                ? { refundedAt: event.occurredAt }
                : nextStatus === TablePaymentIntentStatus.CANCELED
                  ? { canceledAt: event.occurredAt }
                  : { failedAt: event.occurredAt, failureCode: `PROVIDER_${event.status}` };

          const changed = await tx.tablePaymentIntent.updateMany({
            where: {
              id: current.id,
              restaurantId: current.restaurantId,
              tableSessionId: current.tableSessionId,
              status: current.status,
            },
            data: { status: nextStatus, ...timestampData },
          });
          if (changed.count !== 1) {
            throw new TablePaymentError(
              'O pagamento foi atualizado por outra operação.',
              409,
              'TABLE_PAYMENT_CONFLICT',
            );
          }
        }

        await tx.tablePaymentEvent.create({
          data: {
            restaurantId: current.restaurantId,
            tableSessionId: current.tableSessionId,
            paymentIntentId: current.id,
            deduplicationKey,
            type: eventType,
            fromStatus: current.status,
            toStatus: nextStatus || current.status,
            provider: this.provider.code,
            providerEventId: event.eventId,
            amountCents: BigInt(event.amountCents),
            occurredAt: event.occurredAt,
            metadata: latePayment ? { latePayment: true, refundRequired: true } : undefined,
          },
        });

        if (nextStatus) {
          await projectTableSessionFinancialState(
            tx,
            current.restaurantId,
            current.tableSessionId,
            event.occurredAt,
          );
        }

        const updated = await tx.tablePaymentIntent.findUniqueOrThrow({
          where: { id: current.id },
          select: tablePaymentIntentDtoSelect,
        });
        return { duplicate: false, latePayment, current: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (outcome.latePayment && outcome.current.providerExternalId) {
      await this.provider.refundPayment({
        externalId: outcome.current.providerExternalId,
        idempotencyKey: `late-refund:${outcome.current.publicId}`,
      });

      await prisma.tablePaymentEvent.upsert({
        where: {
          deduplicationKey: `table-payment:${outcome.current.publicId}:late-refunded`,
        },
        create: {
          restaurantId: outcome.current.restaurantId,
          tableSessionId: outcome.current.tableSessionId,
          paymentIntentId: outcome.current.id,
          deduplicationKey: `table-payment:${outcome.current.publicId}:late-refunded`,
          type: TablePaymentEventType.REFUNDED,
          fromStatus: outcome.current.status,
          toStatus: outcome.current.status,
          provider: this.provider.code,
          providerEventId: event.eventId,
          amountCents: outcome.current.totalCents,
          occurredAt: new Date(),
          metadata: { automaticLateRefund: true },
        },
        update: {},
      });
    }

    if (!outcome.duplicate) {
      await tableAccountEvents.updated({
        sessionId: outcome.current.tableSessionId,
        restaurantId: outcome.current.restaurantId,
        reason: 'PAYMENT_STATUS_CHANGED',
        paymentPublicId: outcome.current.publicId,
        paymentStatus: outcome.current.status,
        occurredAt: event.occurredAt,
      });
    }

    return {
      received: true,
      processed: true,
      duplicate: outcome.duplicate,
      latePaymentRefunded: outcome.latePayment,
    };
  }
}

export default new ProcessTablePaymentWebhookService();
