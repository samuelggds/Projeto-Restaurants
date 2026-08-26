import tableSessionRepository from '../repositories/TableSessionRepository.js';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';
import joinTableParticipantService from './JoinTableParticipantService.js';
import { TableSessionStatus } from '@prisma/client';

type Input = {
  tableId?: number | string | null;
  tableNumber: number | string;
  tableToken: string;
  restaurantId?: number | string | null;
  restaurantSlug?: string | null;
  authenticatedUser?: { id: number | null; role: string } | null;
  cookies?: Record<string, string>;
  displayName?: unknown;
};

export class TableSessionJoinError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: 'TABLE_NOT_OPEN',
  ) {
    super(message);
    this.name = 'TableSessionJoinError';
  }
}

class JoinTableSessionService {
  async execute({
    tableId,
    tableNumber,
    tableToken,
    restaurantId,
    restaurantSlug,
    authenticatedUser,
    cookies,
    displayName,
  }: Input) {
    const resolvedTable = await resolvePublicTableService.execute({
      tableId,
      tableNumber,
      tableToken,
      restaurantId,
      restaurantSlug,
    });

    if (!resolvedTable.tableOrderingEnabled) {
      throw new Error('Os pedidos pelo cardápio de mesa estão desativados neste restaurante.');
    }

    const session = await tableSessionRepository.findActiveByTable(resolvedTable.id);
    if (!session) {
      throw new TableSessionJoinError(
        'Esta mesa ainda não foi aberta pelo garçom. Aguarde o atendimento e tente novamente.',
        409,
        'TABLE_NOT_OPEN',
      );
    }

    const closingRequested = session.status === TableSessionStatus.CLOSING_REQUESTED;

    const sessionRestaurantId = Number(
      session.restaurantId ?? session.table?.restaurantId ?? resolvedTable.restaurantId,
    );
    if (sessionRestaurantId !== Number(resolvedTable.restaurantId)) {
      throw new Error('A sessão aberta não pertence ao restaurante informado pelo QR Code.');
    }

    const participantResult = await joinTableParticipantService.execute({
      session: {
        id: session.id,
        publicId: session.publicId || `legacy-session-${session.id}`,
        restaurantId: sessionRestaurantId,
        expiresAt: session.expiresAt,
      },
      authenticatedUser,
      cookies,
      displayName,
    });

    return {
      sessionToken: session.sessionToken,
      sessionId: session.id,
      sessionPublicId: session.publicId || null,
      tableId: session.tableId,
      tableNumber: session.table?.number ?? resolvedTable.number,
      restaurantId: sessionRestaurantId,
      expiresAt: session.expiresAt,
      sessionStatus: session.status,
      // A sessão continua acessível para consultar e quitar a conta, mas o
      // cardápio não deve oferecer novos pedidos após a solicitação de fechamento.
      tableOrderingEnabled: resolvedTable.tableOrderingEnabled && !closingRequested,
      waiterCallEnabled: resolvedTable.waiterCallEnabled,
      billRequestEnabled: resolvedTable.billRequestEnabled,
      ...participantResult,
    };
  }
}

export default new JoinTableSessionService();
