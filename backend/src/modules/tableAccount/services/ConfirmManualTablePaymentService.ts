import {
  Prisma,
  TablePaymentEventType,
  TablePaymentIntentStatus,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import type { TableAccountActor } from '../domain/tableAccountContracts.js';
import {
  canConfirmManualTablePayment,
  isManualTablePaymentIntent,
  tableCashConfirmationAuthority,
} from '../domain/tableAccountRules.js';
import tablePaymentRepository, {
  tablePaymentIntentDtoSelect,
} from '../repositories/TablePaymentRepository.js';
import {
  expireTablePaymentReservations,
  lockTablePaymentSession,
  projectTableSessionFinancialState,
  staffCashReceiptDeduplicationKey,
} from './tablePaymentLedger.js';
import { serializeTablePaymentIntent, TablePaymentError } from './tablePaymentSupport.js';
import { tableAccountEvents } from '../realtime/tableAccountEvents.js';
import tableParticipantStateService from '../../tableSession/services/TableParticipantStateService.js';
import { tableParticipantStateEvents } from '../../tableSession/realtime/tableParticipantStateEvents.js';

export class ConfirmManualTablePaymentService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async execute(input: { publicId: string; actor: TableAccountActor }) {
    const restaurantId = Number(input.actor.restaurantId || 0);
    const authority = tableCashConfirmationAuthority(input.actor, restaurantId);
    if (!authority || !canConfirmManualTablePayment(input.actor, restaurantId)) {
      throw new TablePaymentError(
        'Somente o administrador, garçom ou atendente deste restaurante pode registrar este pagamento.',
        403,
        'MANUAL_PAYMENT_FORBIDDEN',
      );
    }

    const initial = await tablePaymentRepository.findForStaffByPublicId(
      input.publicId,
      restaurantId,
    );
    if (!initial) {
      throw new TablePaymentError(
        'Pagamento presencial não encontrado neste restaurante.',
        404,
        'TABLE_PAYMENT_NOT_FOUND',
      );
    }

    const now = this.now();
    const outcome = await prisma.$transaction(
      async (tx) => {
        await setTenantDbContext(tx, restaurantId);
        await lockTablePaymentSession(tx, restaurantId, initial.tableSessionId);
        await expireTablePaymentReservations(tx, restaurantId, initial.tableSessionId, now);

        const intent = await tablePaymentRepository.findForStaffByPublicId(
          input.publicId,
          restaurantId,
          tx,
        );
        if (!intent) {
          throw new TablePaymentError(
            'Pagamento presencial não encontrado neste restaurante.',
            404,
            'TABLE_PAYMENT_NOT_FOUND',
          );
        }

        if (!isManualTablePaymentIntent(intent) || intent.method !== 'CASH') {
          throw new TablePaymentError(
            'Somente pagamentos em dinheiro podem ser confirmados por este fluxo.',
            409,
            'NOT_A_CASH_PAYMENT',
          );
        }

        if (intent.status === TablePaymentIntentStatus.PAID && intent.manualConfirmedAt) {
          return {
            payment: intent,
            released: [] as Awaited<
              ReturnType<typeof tableParticipantStateService.releaseSettledParticipants>
            >,
            stage: 'PAID' as const,
          };
        }

        if (
          intent.status !== TablePaymentIntentStatus.RESERVED &&
          intent.status !== TablePaymentIntentStatus.PROCESSING
        ) {
          throw new TablePaymentError(
            'Este pagamento não está mais aguardando confirmação.',
            409,
            'MANUAL_PAYMENT_NOT_PENDING',
          );
        }

        if (authority === 'STAFF') {
          const deduplicationKey = staffCashReceiptDeduplicationKey(intent.publicId);
          await tx.tablePaymentEvent.upsert({
            where: { deduplicationKey },
            update: {},
            create: {
              restaurantId,
              tableSessionId: intent.tableSessionId,
              paymentIntentId: intent.id,
              deduplicationKey,
              type: TablePaymentEventType.MANUAL_CONFIRMED,
              fromStatus: intent.status,
              toStatus: intent.status,
              amountCents: intent.totalCents,
              actorUserId: input.actor.id,
              metadata: {
                stage: 'STAFF_RECEIVED',
                staffSubRole: input.actor.subRole,
              },
              occurredAt: now,
            },
          });

          const payment = await tx.tablePaymentIntent.findUniqueOrThrow({
            where: { id: intent.id },
            select: tablePaymentIntentDtoSelect,
          });

          return {
            payment,
            released: [] as Awaited<
              ReturnType<typeof tableParticipantStateService.releaseSettledParticipants>
            >,
            stage: 'AWAITING_ADMIN' as const,
          };
        }

        const changed = await tx.tablePaymentIntent.updateMany({
          where: {
            id: intent.id,
            restaurantId,
            tableSessionId: intent.tableSessionId,
            status: intent.status,
          },
          data: {
            status: TablePaymentIntentStatus.PAID,
            paidAt: now,
            manualConfirmedAt: now,
            manualConfirmedById: input.actor.id,
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
            deduplicationKey: `table-payment:${intent.publicId}:admin-confirmed`,
            type: TablePaymentEventType.MANUAL_CONFIRMED,
            fromStatus: intent.status,
            toStatus: TablePaymentIntentStatus.PAID,
            amountCents: intent.totalCents,
            actorUserId: input.actor.id,
            metadata: { stage: 'ADMIN_CONFIRMED' },
            occurredAt: now,
          },
        });

        await projectTableSessionFinancialState(tx, restaurantId, intent.tableSessionId, now);
        const released = await tableParticipantStateService.releaseSettledParticipants(tx, {
          restaurantId,
          tableSessionId: intent.tableSessionId,
          now,
        });

        const payment = await tx.tablePaymentIntent.findUniqueOrThrow({
          where: { id: intent.id },
          select: tablePaymentIntentDtoSelect,
        });

        return { payment, released, stage: 'PAID' as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await tableAccountEvents.updated({
      sessionId: outcome.payment.tableSessionId,
      restaurantId,
      reason:
        outcome.stage === 'AWAITING_ADMIN'
          ? 'CASH_RECEIVED_BY_STAFF'
          : 'PAYMENT_CONFIRMED_MANUALLY',
      paymentPublicId: outcome.payment.publicId,
      paymentStatus: outcome.payment.status,
      occurredAt: outcome.payment.paidAt || now,
    });

    for (const released of outcome.released) {
      await tableParticipantStateEvents.orderingUpdated({
        restaurantId,
        tableId: released.tableId,
        tableSessionId: outcome.payment.tableSessionId,
        participantPublicId: released.participantPublicId,
        orderingBlocked: false,
        reason: 'PAYMENT_SETTLED',
        occurredAt: outcome.payment.paidAt || now,
      });
    }

    return {
      payment: serializeTablePaymentIntent(outcome.payment, initial.tableSession.publicId),
      confirmationStage: outcome.stage,
    };
  }
}

export default new ConfirmManualTablePaymentService();
