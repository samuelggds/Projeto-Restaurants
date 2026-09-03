import { TableServiceCallStatus, TableServiceCallType } from '@prisma/client';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import tableServiceCallRepository from '../repositories/TableServiceCallRepository.js';

type Input = {
  restaurantId: number;
  status?: string;
  type?: string;
  tableNumber?: string | number;
};

class ListTableServiceCallsService {
  async execute({ restaurantId, status, type, tableNumber }: Input) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante não identificado para listar chamados.');
    }

    const normalizedStatus = String(status || '').trim().toUpperCase();
    const normalizedType = String(type || '').trim().toUpperCase();
    const normalizedTableNumber = String(tableNumber || '').trim();

    if (
      normalizedStatus &&
      !Object.values(TableServiceCallStatus).includes(normalizedStatus as TableServiceCallStatus)
    ) {
      throw new Error('Status de chamado inválido.');
    }
    if (
      normalizedType &&
      !Object.values(TableServiceCallType).includes(normalizedType as TableServiceCallType)
    ) {
      throw new Error('Tipo de chamado inválido.');
    }

    let parsedTableNumber: number | undefined;
    if (normalizedTableNumber) {
      parsedTableNumber = Number(normalizedTableNumber);
      if (!Number.isInteger(parsedTableNumber) || parsedTableNumber <= 0) {
        throw new Error('Número da mesa inválido.');
      }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return withTenantDbContext(normalizedRestaurantId, (db) =>
      tableServiceCallRepository.listByRestaurant(
        normalizedRestaurantId,
        {
          status: normalizedStatus ? (normalizedStatus as TableServiceCallStatus) : undefined,
          type: normalizedType ? (normalizedType as TableServiceCallType) : undefined,
          tableNumber: parsedTableNumber,
          resolvedSince: startOfToday,
          take: 200,
        },
        db,
      ),
    );
  }
}

export default new ListTableServiceCallsService();
