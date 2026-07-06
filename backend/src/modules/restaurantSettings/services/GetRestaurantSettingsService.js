import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

class GetRestaurantSettingsService {
  async execute({ restaurantId }) {
    const settings =
      await restaurantSettingsRepository.findByRestaurantId(restaurantId);

    if (!settings) {
      throw new Error("Configurações não encontradas!");
    }

    return settings;
  }
}

export default new GetRestaurantSettingsService();
