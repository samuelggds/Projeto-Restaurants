import tableSessionRepository from '../repositories/TableSessionRepository.js';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';

type Input = {
  tableId?: number | string | null;
  tableNumber: number | string;
  tableToken: string;
  restaurantId?: number | string | null;
  restaurantSlug?: string | null;
};

class JoinTableSessionService {
  async execute({ tableId, tableNumber, tableToken, restaurantId, restaurantSlug }: Input) {
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

    return {
      sessionToken: session.sessionToken,
      sessionId: session.id,
      tableId: session.tableId,
      tableNumber: session.table?.number ?? resolvedTable.number,
      restaurantId: session.table?.restaurantId ?? resolvedTable.restaurantId,
      expiresAt: session.expiresAt,
      tableOrderingEnabled: resolvedTable.tableOrderingEnabled,
      waiterCallEnabled: resolvedTable.waiterCallEnabled,
      billRequestEnabled: resolvedTable.billRequestEnabled,
    };
  }
}

export default new JoinTableSessionService();
