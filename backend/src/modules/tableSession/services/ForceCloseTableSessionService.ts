import {
  Prisma,
  TablePaymentEventType,
  TablePaymentIntentStatus,
  TableSessionStatus,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { forceCloseTableAccountInputSchema } from '../../tableAccount/domain/tableAccountSchemas.js';
import {
  lockTablePaymentSession,
  projectTableSessionFinancialState,
} from '../../tableAccount/services/tablePaymentLedger.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../../waiterCalls/realtime/tableServiceCallEvents.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';

type ForceCloseTableSessionPayload = {
  sessionId: number | string;
  actorUserId: number | string;
  restaurantId: number | string;
  reason: unknown;
};

export class ForceCloseTableSessionService {
  async execute(input: ForceCloseTableSessionPayload) {
    const sessionId = Number(input.sessionId);
    const restaurantId = Number(input.restaurantId);
    const actorUserId = Number(input.actorUserId);
    const { reason } = forceCloseTableAccountInputSchema.parse({ reason: input.reason });

    if (![sessionId, restaurantId, actorUserId].every((value) => Number.isInteger(value) && value > 0)) {
      throw new Error('Dados inválidos para o fechamento administrativo da mesa.');
    }

    const result = await prisma.$transaction(
      async (tx) => {
        await lockTablePaymentSession(tx, restaurantId, sessionId);
        const session = await tableSessionRepository.findById(sessionId, restaurantId, tx);
        if (!session) {
          throw new Error('Sessão não encontrada neste restaurante.');
        }
        if (session.status === TableSessionStatus.CLOSED) {
          throw new Error('Essa mesa já está fechada.');
        }

        const activePayments = await tx.tablePaymentIntent.findMany({
          where: {
            restaurantId,
            tableSessionId: sessionId,
            status: {
              in: [TablePaymentIntentStatus.RESERVED, TablePaymentIntentStatus.PROCESSING],
            },
          },
          select: { id: true, publicId: true, status: true, totalCents: true },
        });
        const now = new Date();
        for (const payment of activePayments) {
          const changed = await tx.tablePaymentIntent.updateMany({
            where: {
              id: payment.id,
              restaurantId,
              tableSessionId: sessionId,
              status: payment.status,
            },
            data: {
              status: TablePaymentIntentStatus.CANCELED,
              canceledAt: now,
              failureCode: 'ADMIN_FORCE_CLOSE',
            },
          });
          if (changed.count === 1) {
            await tx.tablePaymentEvent.create({
              data: {
                restaurantId,
                tableSessionId: sessionId,
                paymentIntentId: payment.id,
                deduplicationKey: `table-payment:${payment.publicId}:force-close`,
                type: TablePaymentEventType.CANCELED,
                fromStatus: payment.status,
                toStatus: TablePaymentIntentStatus.CANCELED,
                amountCents: payment.totalCents,
                actorUserId,
                metadata: { reason, action: 'FORCE_CLOSE' },
                occurredAt: now,
              },
            });
          }
        }
        if (activePayments.length > 0) {
          await projectTableSessionFinancialState(tx, restaurantId, sessionId, now);
        }

        const activeCalls = await tableServiceCallRepository.listActiveBySession(
          sessionId,
          restaurantId,
          tx,
        );
        const closedSession = await tableSessionRepository.forceClose(
          sessionId,
          restaurantId,
          actorUserId,
          reason,
          tx,
        );
        await tableParticipantRepository.revokeActiveBySession(sessionId, restaurantId, tx);
        if (activeCalls.length) {
          await tableServiceCallRepository.resolveActiveBySession(
            sessionId,
            restaurantId,
            actorUserId,
            tx,
          );
        }

        return { session, closedSession, activeCalls };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    for (const activeCall of result.activeCalls) {
      const resolvedCall = await tableServiceCallRepository.findByIdForRestaurant(
        activeCall.id,
        restaurantId,
      );
      if (resolvedCall) {
        void tableServiceCallEvents.updated(
          resolvedCall as unknown as Parameters<typeof tableServiceCallEvents.updated>[0],
        );
      }
    }

    void tableSessionEvents.closed({
      sessionId: result.session.id,
      tableId: result.session.tableId,
      tableNumber: result.session.table.number,
      restaurantId,
      status: 'CLOSED',
      closedAt: result.closedSession.closedAt,
    });

    return {
      id: result.closedSession.id,
      tableId: result.closedSession.tableId,
      status: result.closedSession.status,
      openedAt: result.closedSession.openedAt,
      closedAt: result.closedSession.closedAt,
      closedById: result.closedSession.closedById,
      forcedClosed: result.closedSession.forcedClosed,
      forceCloseReason: result.closedSession.forceCloseReason,
    };
  }
}

export default new ForceCloseTableSessionService();
