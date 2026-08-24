import tableSessionRepository from '../repositories/TableSessionRepository.js';
import tableRepository from '../../table/repositories/TableRepository.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';

type OpenTableSessionPayload = {
  tableId: number | string;
  restaurantId: number;
  openedById: number | string | null;
};

class OpenTableSessionService {
  async execute({ tableId, restaurantId, openedById }: OpenTableSessionPayload) {
    const table = await tableRepository.findById(tableId);

    if (!table || table.restaurantId !== restaurantId || !table.active) {
      throw new Error('Mesa não encontrada!');
    }

    const publicTable = await resolvePublicTableService.execute({
      tableId: table.id,
      tableNumber: table.number,
      restaurantId,
    });

    if (!publicTable.tableOrderingEnabled) {
      throw new Error('Os pedidos pelo cardápio de mesa estão desativados neste restaurante.');
    }

    const sessionOpened = await tableSessionRepository.findOpenedByTable(tableId);

    if (sessionOpened) {
      throw new Error('Essa mesa já está aberta!');
    }

    const pin = crypto.randomInt(1000, 10000).toString();

    const pinHash = await bcrypt.hash(pin, 10);

    const sessionToken = await crypto.randomBytes(32).toString('hex');
    const normalizedTableId = Number(tableId);
    const normalizedOpenedById = Number(openedById);

    if (!Number.isInteger(normalizedTableId) || normalizedTableId <= 0) {
      throw new Error('Mesa inválida para abrir sessão.');
    }

    if (!Number.isInteger(normalizedOpenedById) || normalizedOpenedById <= 0) {
      throw new Error('Usuário inválido para abrir sessão.');
    }

    const session = await tableSessionRepository.create({
      tableId: normalizedTableId,
      pinHash,
      sessionToken,
      openedById: normalizedOpenedById,
    });

    return {
      session,
      pin,
    };
  }
}

export default new OpenTableSessionService();
