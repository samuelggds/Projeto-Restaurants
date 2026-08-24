import { io } from '../../../server.js';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';

type RequestPinAssistancePayload = {
  tableId: number | string;
  tableNumber: number | string;
  restaurantId?: number | string | null;
  restaurantSlug?: string | null;
};

class RequestPinAssistanceService {
  async execute({
    tableId,
    tableNumber,
    restaurantId,
    restaurantSlug,
  }: RequestPinAssistancePayload) {
    const parsedTableId = Number(tableId);

    if (!Number.isInteger(parsedTableId) || parsedTableId <= 0) {
      throw new Error('Mesa inválida para solicitar o PIN.');
    }

    const table = await resolvePublicTableService.execute({
      tableId: parsedTableId,
      tableNumber,
      restaurantId,
      restaurantSlug,
    });

    if (!table.tableOrderingEnabled) {
      throw new Error('O acesso ao cardápio de mesa está desativado neste restaurante.');
    }

    const payload = {
      tableId: table.id,
      tableNumber: table.number,
      restaurantId: table.restaurantId,
      requestedAt: new Date().toISOString(),
      message: `Cliente na mesa ${table.number} solicitou o PIN.`,
    };

    io.to(`restaurant:${table.restaurantId}`).emit('table:pin-requested', payload);

    return {
      ok: true,
      ...payload,
    };
  }
}

export default new RequestPinAssistanceService();
