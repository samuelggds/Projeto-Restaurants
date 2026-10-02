import { Prisma, TableSessionStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { forceCloseTableAccountInputSchema } from '../../tableAccount/domain/tableAccountSchemas.js';
import {
  expireTablePaymentReservations,
  loadTablePaymentLedgerItems,
  lockTablePaymentSession,
} from '../../tableAccount/services/tablePaymentLedger.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../../waiterCalls/realtime/tableServiceCallEvents.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';
import waiterCompensationProjectionService from '../../employeeCompensation/services/WaiterCompensationProjectionService.js';

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

    if (
      ![sessionId, restaurantId, actorUserId].every((value) => Number.isInteger(value) && value > 0)
    ) {
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

        const now = new Date();
        await expireTablePaymentReservations(tx, restaurantId, sessionId, now);

        const ledgerItems = await loadTablePaymentLedgerItems(
          tx,
          restaurantId,
          sessionId,
          now,
        );
        const financialPending = ledgerItems.some(
          (item) =>
            !item.canceled &&
            (item.paidCents < item.unitPriceCents ||
              item.reservedCents > 0 ||
              item.processingCents > 0 ||
              item.availableCents > 0),
        );
        if (financialPending) {
          throw new Error(
            'Não é possível usar o fechamento administrativo: a conta geral ainda possui pagamentos pendentes.',
          );
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
        await waiterCompensationProjectionService.project({
          db: tx,
          restaurantId,
          tableSessionId: sessionId,
          now,
        });

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
