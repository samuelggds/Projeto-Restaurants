import tableRepository from '../repositories/TableRepository.js';
import tableSessionRepository from '../../tableSession/repositories/TableSessionRepository.js';

class DeleteTableService {
  async execute({ id, restaurantId }: { id: number | string; restaurantId: number | string }) {
    const normalizedId = Number(id);
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error('Mesa inválida para exclusão.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para excluir mesa.');
    }

    const table = await tableRepository.findByIdForRestaurant(normalizedId, normalizedRestaurantId);
    if (!table) throw new Error('Mesa não encontrada!');

    const openSession = await tableSessionRepository.findActiveByTable(normalizedId);
    if (openSession) throw new Error('Feche o atendimento da mesa antes de excluí-la.');

    const deleted = await tableRepository.deleteIfUnused(normalizedId, normalizedRestaurantId);
    if (deleted !== 1) {
      throw new Error('Não é possível excluir uma mesa que possui pedidos no histórico.');
    }
    return { id: normalizedId };
  }
}

export default new DeleteTableService();
