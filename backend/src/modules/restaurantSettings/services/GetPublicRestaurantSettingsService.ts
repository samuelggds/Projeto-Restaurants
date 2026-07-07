import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

type RestaurantIdPayload = {
  restaurantId: number | string;
};

type PublicSettingsFallback = {
  restaurantId: number;
  deliveryFee: number;
  minimumOrder: number;
  pixProvider: string;
  pixKey: string | null;
  instagram: string | null;
  restaurant: {
    name: string | null;
    logo: string | null;
    coverImage: string | null;
  };
};

class GetPublicRestaurantSettingsService {
  async execute({ restaurantId }: RestaurantIdPayload) {
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

      const fallback: PublicSettingsFallback = {
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

      return fallback;
    }

    return settings;
  }
}

export default new GetPublicRestaurantSettingsService();
