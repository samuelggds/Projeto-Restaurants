import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";
import restaurantRepository from "../../restaurants/repositories/RestaurantRepository.js";
class GetPublicRestaurantSettingsService {
    async execute({ restaurantId, slug }) {
        let normalizedRestaurantId = Number(restaurantId);
        if ((!Number.isInteger(normalizedRestaurantId) ||
            normalizedRestaurantId <= 0) &&
            slug) {
            const restaurant = await restaurantRepository.findBySlug(String(slug).trim());
            normalizedRestaurantId = Number(restaurant?.id || 0);
        }
        if (!Number.isInteger(normalizedRestaurantId) ||
            normalizedRestaurantId <= 0) {
            throw new Error("Restaurante inválido.");
        }
        const settings = await restaurantSettingsRepository.findPublicByRestaurantId(normalizedRestaurantId);
        if (!settings) {
            const restaurant = await restaurantSettingsRepository.findRestaurantById(normalizedRestaurantId);
            const fallback = {
                restaurantId: normalizedRestaurantId,
                deliveryFee: 0,
                minimumOrder: 0,
                pixProvider: "MERCADO_PAGO",
                pixKey: null,
                instagram: null,
                restaurant: {
                    name: restaurant?.name || null,
                    slug: restaurant?.slug || null,
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
