import tableRepository from '../repositories/TableRepository.js';

type GetTableByIdPayload = {
  id: number | string;
  restaurantId: number;
  includeQrToken?: boolean;
};

class GetTableByIdService {
  async execute({ id, restaurantId, includeQrToken = false }: GetTableByIdPayload) {
    const normalizedId = Number(id);
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error('Mesa inválida para consulta.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para consultar mesa.');
    }

    const table = await tableRepository.findByIdForRestaurant(
      normalizedId,
      normalizedRestaurantId,
    );

    if (!table) {
      throw new Error('Mesa não encontrada!');
    }

    if (includeQrToken) {
      return table;
    }

    const { token: _token, ...safeTable } = table;
    return safeTable;
  }
}

export default new GetTableByIdService();
