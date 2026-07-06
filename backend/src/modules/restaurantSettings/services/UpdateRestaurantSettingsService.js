import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

class UpdateRestaurantSettingsService {
  async execute({
    restaurantId,
    deliveryFee,
    minimumOrder,
    pixKey,
    instagram,
    facebook,
  }) {
    const settings =
      await restaurantSettingsRepository.findByRestaurantId(restaurantId);

    if (!settings) {
      throw new Error("Configurações não encontradas!");
    }

    return restaurantSettingsRepository.update(restaurantId, {
      deliveryFee,
      minimumOrder,
      pixKey,
      instagram,
      facebook,
    });
  }
}

export default new UpdateRestaurantSettingsService();
