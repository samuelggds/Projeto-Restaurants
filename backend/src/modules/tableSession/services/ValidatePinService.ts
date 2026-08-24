import bcrypt from 'bcrypt';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';

type ValidatePinPayload = {
  tableId: number | string;
  pin: string;
  tableNumber?: number | string | null;
  restaurantId?: number | string | null;
  restaurantSlug?: string | null;
};

class ValidatePinService {
  async execute({ tableId, pin, tableNumber, restaurantId, restaurantSlug }: ValidatePinPayload) {
    const normalizedTableId = Number(tableId);
    const normalizedPin = String(pin || '').trim();

    if (!Number.isInteger(normalizedTableId) || normalizedTableId <= 0) {
      throw new Error('Mesa inválida para validar o PIN.');
    }

    if (!/^\d{4}$/.test(normalizedPin)) {
      throw new Error('O PIN deve conter 4 dígitos.');
    }

    const session = await tableSessionRepository.findOpenedByTable(tableId);

    if (!session) {
      throw new Error('Essa mesa não está aberta!');
    }

    const resolvedTable = await resolvePublicTableService.execute({
      tableId: normalizedTableId,
      tableNumber: tableNumber ?? session.table.number,
      restaurantId,
      restaurantSlug,
    });

    if (!resolvedTable.tableOrderingEnabled) {
      throw new Error('Os pedidos pelo cardápio de mesa estão desativados neste restaurante.');
    }

    const pinMatch = await bcrypt.compare(normalizedPin, session.pinHash);

    if (!pinMatch) {
      throw new Error('PIN inválido!');
    }

    return {
      sessionToken: session.sessionToken,
      sessionId: session.id,
      tableId: session.tableId,
      tableNumber: session.table?.number ?? null,
      restaurantId: session.table?.restaurantId ?? null,
      tableOrderingEnabled: resolvedTable.tableOrderingEnabled,
      waiterCallEnabled: resolvedTable.waiterCallEnabled,
      billRequestEnabled: resolvedTable.billRequestEnabled,
    };
  }
}

export default new ValidatePinService();
