import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

class GetRestaurantSettingsService {
  async execute({ restaurantId }) {
    const normalizedRestaurantId = Number(restaurantId);
    const settings = await restaurantSettingsRepository.findByRestaurantId(
      normalizedRestaurantId,
    );

    if (!settings) {
      const restaurant = await restaurantSettingsRepository.findRestaurantById(
        normalizedRestaurantId,
      );

      if (!restaurant) {
        throw new Error("Restaurante não encontrado!");
      }

      return {
        id: null,
        restaurantId: normalizedRestaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: "MERCADO_PAGO",
        pixKey: null,
        instagram: null,
        facebook: null,
        whatsapp: String(restaurant.whatsapp || "").trim() || null,
        restaurant: {
          name: restaurant.name,
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          whatsapp: String(restaurant.whatsapp || "").trim() || null,
        },
      };
    }

    return {
      ...settings,
      whatsapp: String(settings?.restaurant?.whatsapp || "").trim() || null,
    };
  }
}

export default new GetRestaurantSettingsService();
