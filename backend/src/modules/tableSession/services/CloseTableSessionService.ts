import tableSessionRepository from '../repositories/TableSessionRepository.js';
import { OrderStatus, Prisma, TableSessionStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../../waiterCalls/realtime/tableServiceCallEvents.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import tableAccountSettingsRepository from '../../tableAccount/repositories/TableAccountSettingsRepository.js';
import { lockTablePaymentSession } from '../../tableAccount/services/tablePaymentLedger.js';

type CloseTableSessionPayload = {
  sessionId: number | string;
  closedById: number | null;
  restaurantId: number;
};

class CloseTableSessionService {
  async execute({ sessionId, closedById, restaurantId }: CloseTableSessionPayload) {
    const normalizedSessionId = Number(sessionId);
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedClosedById = Number(closedById || 0);
    if (!Number.isInteger(normalizedSessionId) || normalizedSessionId <= 0) {
      throw new Error('Sessão inválida para encerrar a mesa.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para encerrar a mesa.');
    }
    if (!Number.isInteger(normalizedClosedById) || normalizedClosedById <= 0) {
      throw new Error('Funcionário inválido para encerrar a mesa.');
    }

    const result = await prisma.$transaction(
      async (tx) => {
        await lockTablePaymentSession(tx, normalizedRestaurantId, normalizedSessionId);
        const session = await tableSessionRepository.findById(
          normalizedSessionId,
          normalizedRestaurantId,
          tx,
        );
        if (!session) {
          throw new Error('Sessão não encontrada neste restaurante!');
        }
        if (session.status === TableSessionStatus.CLOSED) {
          throw new Error('Essa mesa já está fechada!');
        }

        const settings = await tableAccountSettingsRepository.findByRestaurantId(
          normalizedRestaurantId,
          tx,
        );
        const blockingOrders = settings.preventCloseWithOutstandingBalance
          ? await tableSessionRepository.findBlockingOrdersForSession(
              session.id,
              normalizedRestaurantId,
              tx,
            )
          : await tableSessionRepository.findOperationalBlockingOrdersForSession(
              session.id,
              normalizedRestaurantId,
              tx,
            );
        if (blockingOrders.length) {
          const orderReferences = blockingOrders
            .slice(0, 5)
            .map((order) => `#${order.id}`)
            .join(', ');
          const hasOperationalPending = blockingOrders.some(
            (order) => order.status !== OrderStatus.ENTREGUE,
          );
          const hasPaymentPending = blockingOrders.some((order) => order.paid !== true);
          const pendingReason =
            hasOperationalPending && hasPaymentPending
              ? 'existem pedidos aguardando entrega e pagamentos pendentes'
              : hasOperationalPending
                ? 'existem pedidos aguardando entrega'
                : 'existem pagamentos pendentes';
          throw new Error(
            settings.preventCloseWithOutstandingBalance
              ? `Não é possível fechar a mesa: ${pendingReason} (${orderReferences}).`
              : `Não é possível fechar a mesa: existem pedidos aguardando entrega (${orderReferences}).`,
          );
        }

        const activeCalls = await tableServiceCallRepository.listActiveBySession(
          session.id,
          normalizedRestaurantId,
          tx,
        );
        const closedSession = await tableSessionRepository.close(
          normalizedSessionId,
          normalizedRestaurantId,
          normalizedClosedById,
          tx,
        );
        await tableParticipantRepository.revokeActiveBySession(
          session.id,
          normalizedRestaurantId,
          tx,
        );
        if (activeCalls.length) {
          await tableServiceCallRepository.resolveActiveBySession(
            session.id,
            normalizedRestaurantId,
            normalizedClosedById,
            tx,
          );
        }

        return { session, closedSession, activeCalls };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.activeCalls.length) {
      for (const activeCall of result.activeCalls) {
        const resolvedCall = await tableServiceCallRepository.findByIdForRestaurant(
          activeCall.id,
          normalizedRestaurantId,
        );
        if (resolvedCall) {
          tableServiceCallEvents
            .updated(
              resolvedCall as unknown as Parameters<typeof tableServiceCallEvents.updated>[0],
            )
            .catch((error: unknown) => {
              console.error(
                '[WAITER_CALL_REALTIME_ERROR]',
                error instanceof Error ? error.message : String(error),
              );
            });
        }
      }
    }

    tableSessionEvents
      .closed({
        sessionId: result.session.id,
        tableId: result.session.tableId,
        tableNumber: result.session?.table?.number ?? null,
        restaurantId: normalizedRestaurantId,
        status: 'CLOSED',
        closedAt: result.closedSession.closedAt,
      })
      .catch((error: unknown) => {
        console.error(
          '[TABLE_SESSION_REALTIME_ERROR]',
          error instanceof Error ? error.message : String(error),
        );
      });

    return {
      id: result.closedSession.id,
      tableId: result.closedSession.tableId,
      status: result.closedSession.status,
      openedAt: result.closedSession.openedAt,
      closedAt: result.closedSession.closedAt,
      closedById: result.closedSession.closedById,
    };
  }
}

export default new CloseTableSessionService();
