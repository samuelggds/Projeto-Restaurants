import tableRepository from '../repositories/TableRepository.js';
import tableSessionRepository from '../../tableSession/repositories/TableSessionRepository.js';

type DeactivateTablePayload = {
  id: number | string;
  restaurantId: number;
};

class DeactivateTableService {
  async execute({ id, restaurantId }: DeactivateTablePayload) {
    const normalizedId = Number(id);
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error('Mesa inválida para desativação.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para desativar mesa.');
    }

    const table = await tableRepository.findByIdForRestaurant(
      normalizedId,
      normalizedRestaurantId,
    );

    if (!table) {
      throw new Error('Mesa não encontrada!');
    }

    const openSession = await tableSessionRepository.findOpenedByTable(normalizedId);
    if (openSession) {
      throw new Error('Feche o atendimento da mesa antes de desativá-la.');
    }

    return await tableRepository.deactivate(normalizedId);
  }
}

export default new DeactivateTableService();
