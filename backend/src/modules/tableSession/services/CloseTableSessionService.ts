import tableSessionRepository from '../repositories/TableSessionRepository.js';
import { Prisma, TableSessionStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../../waiterCalls/realtime/tableServiceCallEvents.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';

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
        const session = await tableSessionRepository.findById(normalizedSessionId, tx);
        if (!session || session.table.restaurantId !== normalizedRestaurantId) {
          throw new Error('Sessão não encontrada neste restaurante!');
        }
        if (session.status === TableSessionStatus.CLOSED) {
          throw new Error('Essa mesa já está fechada!');
        }

        const blockingOrders = await tableSessionRepository.findBlockingOrdersForSession(
          session.tableId,
          normalizedRestaurantId,
          session.openedAt,
          tx,
        );
        if (blockingOrders.length) {
          const orderReferences = blockingOrders
            .slice(0, 5)
            .map((order) => `#${order.id}`)
            .join(', ');
          throw new Error(
            `Não é possível fechar a mesa: existem pedidos ou pagamentos pendentes (${orderReferences}).`,
          );
        }

        const activeCalls = await tableServiceCallRepository.listActiveBySession(
          session.id,
          normalizedRestaurantId,
          tx,
        );
        const closedSession = await tableSessionRepository.close(
          normalizedSessionId,
          normalizedClosedById,
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
