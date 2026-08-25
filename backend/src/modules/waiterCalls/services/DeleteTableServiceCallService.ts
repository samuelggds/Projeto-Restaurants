import tableServiceCallRepository from '../repositories/TableServiceCallRepository.js';

class DeleteTableServiceCallService {
  async execute({ id, restaurantId }: { id: number | string; restaurantId: number | string }) {
    const normalizedId = Number(id);
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error('Chamado inválido.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante não identificado para excluir o chamado.');
    }

    const current = await tableServiceCallRepository.findByIdForRestaurant(
      normalizedId,
      normalizedRestaurantId,
    );
    if (!current) throw new Error('Chamado não encontrado neste restaurante.');
    if (current.status !== 'RESOLVED') {
      throw new Error('Somente chamados concluídos podem ser excluídos.');
    }

    const deleted = await tableServiceCallRepository.deleteResolved(
      normalizedId,
      normalizedRestaurantId,
    );
    if (deleted !== 1) throw new Error('O chamado já foi excluído. Atualize a tela.');
    return { id: normalizedId };
  }
}

export default new DeleteTableServiceCallService();
