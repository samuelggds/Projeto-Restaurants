import tableSessionRepository from '../repositories/TableSessionRepository.js';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';
import joinTableParticipantService from './JoinTableParticipantService.js';

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

    const session = await tableSessionRepository.findOpenedByTable(resolvedTable.id);
    if (!session) {
      throw new Error(
        'Esta mesa ainda não foi aberta pelo garçom. Aguarde o atendimento e tente novamente.',
      );
    }

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
      tableOrderingEnabled: resolvedTable.tableOrderingEnabled,
      waiterCallEnabled: resolvedTable.waiterCallEnabled,
      billRequestEnabled: resolvedTable.billRequestEnabled,
      ...participantResult,
    };
  }
}

export default new JoinTableSessionService();
