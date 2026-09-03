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
} from '../domain/tableAccountRules.js';
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
import tableParticipantStateService from '../../tableSession/services/TableParticipantStateService.js';
import { tableParticipantStateEvents } from '../../tableSession/realtime/tableParticipantStateEvents.js';

export class ConfirmManualTablePaymentService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async execute(input: { publicId: string; actor: TableAccountActor }) {
    const restaurantId = Number(input.actor.restaurantId || 0);
    if (!canConfirmManualTablePayment(input.actor, restaurantId)) {
      throw new TablePaymentError(
        'Somente o administrador ou um garçom deste restaurante pode confirmar o pagamento.',
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

        if (!isManualTablePaymentIntent(intent)) {
          throw new TablePaymentError(
            'Somente solicitações presenciais em dinheiro ou maquininha podem ser confirmadas manualmente.',
            409,
            'NOT_A_MANUAL_PAYMENT',
          );
        }

        if (intent.status === TablePaymentIntentStatus.PAID && intent.manualConfirmedAt) {
          return { payment: intent, released: [] as Awaited<ReturnType<typeof tableParticipantStateService.releaseSettledParticipants>> };
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
            deduplicationKey: `table-payment:${intent.publicId}:manual-confirmed`,
            type: TablePaymentEventType.MANUAL_CONFIRMED,
            fromStatus: intent.status,
            toStatus: TablePaymentIntentStatus.PAID,
            amountCents: intent.totalCents,
            actorUserId: input.actor.id,
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
        return { payment, released };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await tableAccountEvents.updated({
      sessionId: outcome.payment.tableSessionId,
      restaurantId,
      reason: 'PAYMENT_CONFIRMED_MANUALLY',
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
    };
  }
}

export default new ConfirmManualTablePaymentService();
