import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

class GetPublicRestaurantSettingsService {
  async execute({ restaurantId }) {
    const normalizedRestaurantId = Number(restaurantId);

    if (
      !Number.isInteger(normalizedRestaurantId) ||
      normalizedRestaurantId <= 0
    ) {
      throw new Error("Restaurante inválido.");
    }

    const settings =
      await restaurantSettingsRepository.findPublicByRestaurantId(
        normalizedRestaurantId,
      );

    if (!settings) {
      const restaurant = await restaurantSettingsRepository.findRestaurantById(
        normalizedRestaurantId,
      );

      return {
        restaurantId: normalizedRestaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: "MERCADO_PAGO",
        pixKey: null,
        instagram: null,
        restaurant: {
          name: restaurant?.name || null,
          logo: restaurant?.logo || null,
          coverImage: restaurant?.coverImage || null,
        },
      };
    }

    return settings;
  }
}

export default new GetPublicRestaurantSettingsService();
