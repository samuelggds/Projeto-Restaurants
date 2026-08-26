import tableAccountSettingsRepository from '../repositories/TableAccountSettingsRepository.js';

export class GetTableAccountSettingsService {
  async execute(restaurantId: number) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para consultar as configurações da conta da mesa.');
    }
    return tableAccountSettingsRepository.findByRestaurantId(normalizedRestaurantId);
  }
}

export default new GetTableAccountSettingsService();
