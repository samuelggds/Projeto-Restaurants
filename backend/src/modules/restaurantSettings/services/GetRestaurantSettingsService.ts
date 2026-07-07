import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

type RestaurantIdPayload = {
  restaurantId: number | string;
};

type RestaurantSettingsFallback = {
  id: number | null;
  restaurantId: number;
  deliveryFee: number;
  minimumOrder: number;
  pixProvider: string;
  pixKey: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  restaurant: {
    name: string;
    logo: string | null;
    coverImage: string | null;
    whatsapp: string | null;
  };
};

class GetRestaurantSettingsService {
  async execute({ restaurantId }: RestaurantIdPayload) {
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

      const fallback: RestaurantSettingsFallback = {
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

      return fallback;
    }

    return {
      ...settings,
      whatsapp: String(settings?.restaurant?.whatsapp || "").trim() || null,
    };
  }
}

export default new GetRestaurantSettingsService();
