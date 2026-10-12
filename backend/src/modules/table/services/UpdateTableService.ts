import tableRepository from '../repositories/TableRepository.js';
import { parseTableSeatCapacity } from '../domain/tableSeatCapacity.js';

type UpdateTablePayload = {
  id: number | string;
  restaurantId: number;
  number?: number | string;
  active?: boolean;
  seatCapacity?: number | string;
};

class UpdateTableService {
  async execute({ id, restaurantId, number, active, seatCapacity }: UpdateTablePayload) {
    const normalizedId = Number(id);
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error('Mesa inválida para atualização.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para atualizar mesa.');
    }

    const table = await tableRepository.findByIdForRestaurant(
      normalizedId,
      normalizedRestaurantId,
    );

    if (!table) {
      throw new Error('Mesa não encontrada!');
    }

    if (number !== undefined && number !== null && String(number).trim()) {
      const normalizedNumber = Number(number);
      if (!Number.isInteger(normalizedNumber) || normalizedNumber <= 0 || normalizedNumber > 9999) {
        throw new Error('Informe um número de mesa inteiro entre 1 e 9999.');
      }
      const tableExists = await tableRepository.findByNumber(
        normalizedNumber,
        normalizedRestaurantId,
      );

      if (tableExists && tableExists.id !== table.id) {
        throw new Error('Já existe uma mesa com esse número!');
      }
    }

    const hasNumber = number !== undefined && number !== null && String(number).trim() !== '';
    const hasActive = typeof active === 'boolean';
    const hasCapacity = seatCapacity !== undefined;

    if (!hasNumber && !hasActive && !hasCapacity) {
      throw new Error('Informe número e/ou status ativo da mesa.');
    }

    const updateData: { number?: number; active?: boolean; seatCapacity?: number } = {};

    if (hasNumber) {
      updateData.number = Number(number);
    }

    if (hasActive) {
      updateData.active = Boolean(active);
    }
    if (hasCapacity) updateData.seatCapacity = parseTableSeatCapacity(seatCapacity);

    return await tableRepository.update(normalizedId, normalizedRestaurantId, {
      ...updateData,
    });
  }
}

export default new UpdateTableService();
