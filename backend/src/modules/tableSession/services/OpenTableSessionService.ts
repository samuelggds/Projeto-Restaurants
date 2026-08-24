import tableSessionRepository from '../repositories/TableSessionRepository.js';
import tableRepository from '../../table/repositories/TableRepository.js';
import crypto from 'crypto';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../../waiterCalls/realtime/tableServiceCallEvents.js';

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

function logRealtimeError(error: unknown) {
  console.error(
    '[TABLE_SESSION_REALTIME_ERROR]',
    error instanceof Error ? error.message : String(error),
  );
}

type OpenTableSessionPayload = {
  tableId: number | string;
  restaurantId: number;
  openedById: number | string | null;
};

class OpenTableSessionService {
  async execute({ tableId, restaurantId, openedById }: OpenTableSessionPayload) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedTableId = Number(tableId);
    const normalizedOpenedById = Number(openedById);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para abrir a mesa.');
    }
    if (!Number.isInteger(normalizedTableId) || normalizedTableId <= 0) {
      throw new Error('Mesa inválida para abrir sessão.');
    }
    if (!Number.isInteger(normalizedOpenedById) || normalizedOpenedById <= 0) {
      throw new Error('Usuário inválido para abrir sessão.');
    }

    const table = await tableRepository.findByIdForRestaurant(
      normalizedTableId,
      normalizedRestaurantId,
    );

    if (!table || !table.active) {
      throw new Error('Mesa não encontrada!');
    }

    const publicTable = await resolvePublicTableService.execute({
      tableId: table.id,
      tableNumber: table.number,
      tableToken: table.token,
      restaurantId: normalizedRestaurantId,
    });

    if (!publicTable.tableOrderingEnabled) {
      throw new Error('Os pedidos pelo cardápio de mesa estão desativados neste restaurante.');
    }

    const activeSession = await tableSessionRepository.findOpenedByTable(normalizedTableId);
    if (activeSession) {
      throw new Error('Essa mesa já está aberta!');
    }

    const expiredSessions = await tableSessionRepository.listExpiredOpenByTable(normalizedTableId);
    for (const expiredSession of expiredSessions) {
      const activeCalls = await tableServiceCallRepository.listActiveBySession(
        expiredSession.id,
        normalizedRestaurantId,
      );
      const closedSession = await tableSessionRepository.close(
        expiredSession.id,
        normalizedOpenedById,
      );
      await tableServiceCallRepository.resolveActiveBySession(
        expiredSession.id,
        normalizedRestaurantId,
        normalizedOpenedById,
      );

      // Avisa clientes ainda conectados com o token antigo antes de expor a
      // nova sessão da mesa. Falha de socket nunca deve impedir a abertura.
      try {
        await tableSessionEvents.closed({
          sessionId: expiredSession.id,
          tableId: expiredSession.tableId,
          tableNumber: expiredSession.table?.number ?? table.number,
          restaurantId: normalizedRestaurantId,
          status: 'CLOSED',
          closedAt: closedSession.closedAt,
          reason: 'expired',
        });
      } catch (error: unknown) {
        logRealtimeError(error);
      }

      for (const activeCall of activeCalls) {
        const resolvedCall = await tableServiceCallRepository.findByIdForRestaurant(
          activeCall.id,
          normalizedRestaurantId,
        );
        if (!resolvedCall) continue;
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

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const configuredHours = Number(process.env.TABLE_SESSION_MAX_HOURS || 12);
    const maxHours = Number.isFinite(configuredHours)
      ? Math.min(Math.max(configuredHours, 1), 24)
      : 12;
    const expiresAt = new Date(Date.now() + maxHours * 60 * 60 * 1000);

    let session;
    try {
      session = await tableSessionRepository.create({
        tableId: normalizedTableId,
        // Kept only for backwards-compatible persistence. No PIN is generated or exposed.
        pinHash: 'PIN_FLOW_DISABLED',
        sessionToken,
        openedById: normalizedOpenedById,
        expiresAt,
      });
    } catch (error: unknown) {
      // O índice parcial no banco resolve duas tentativas concorrentes de
      // abertura sem permitir duas sessões OPEN para a mesma mesa.
      if (isUniqueConflict(error)) {
        throw new Error('Essa mesa já foi aberta por outra pessoa. Atualize a tela.');
      }
      throw error;
    }

    tableSessionEvents
      .opened({
        sessionId: session.id,
        tableId: session.tableId,
        tableNumber: session.table?.number ?? table.number,
        restaurantId: normalizedRestaurantId,
        status: 'OPEN',
        openedAt: session.openedAt,
      })
      .catch(logRealtimeError);

    return {
      sessionId: session.id,
      session: {
        id: session.id,
        tableId: session.tableId,
        status: session.status,
        openedAt: session.openedAt,
        expiresAt: session.expiresAt,
        table: {
          id: session.table.id,
          number: session.table.number,
          active: session.table.active,
          restaurantId: session.table.restaurantId,
        },
        openedBy: {
          id: session.openedBy.id,
          name: session.openedBy.name,
        },
      },
    };
  }
}

export default new OpenTableSessionService();
