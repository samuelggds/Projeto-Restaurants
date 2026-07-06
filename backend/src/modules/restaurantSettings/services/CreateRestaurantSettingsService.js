import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

class CreateRestaurantSettingsService {
  async execute({
    restaurantId,
    deliveryFee,
    minimumOrder,
    pixKey,
    instagram,
    facebook,
  }) {
    const settingsExists =
      await restaurantSettingsRepository.findByRestaurantId(restaurantId);

    if (settingsExists) {
      throw new Error("Configurações já existem para esse restaurante!");
    }

    return await restaurantSettingsRepository.create({
      restaurantId,
      deliveryFee,
      minimumOrder,
      pixKey,
      instagram,
      facebook,
    });
  }
}

export default new CreateRestaurantSettingsService();
