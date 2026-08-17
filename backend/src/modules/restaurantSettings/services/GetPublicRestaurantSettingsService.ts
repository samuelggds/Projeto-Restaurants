import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import restaurantRepository from '../../restaurants/repositories/RestaurantRepository.js';

type RestaurantIdPayload = {
  restaurantId?: number | string;
  slug?: string;
  useDefault?: boolean;
};

type PublicSettingsFallback = {
  restaurantId: number;
  primaryColor: string;
  deliveryFee: number;
  minimumOrder: number;
  pixProvider: string;
  pixKey: string | null;
  instagram: string | null;
  facebook: string | null;
  companyLegalName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  businessHours: unknown;
  isOpenForOrders: boolean;
  averageDeliveryTime: string | null;
  autoAcceptOrders: boolean;
  trackingRequiresLogin: boolean;
  soundNotifications: boolean;
  maxConcurrentOrders: number;
  restaurant: {
    name: string | null;
    slug: string | null;
    logo: string | null;
    coverImage: string | null;
    description: string | null;
    address: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressDistrict: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    banners: Array<{ id: number; title: string; image: string }>;
  };
};

class GetPublicRestaurantSettingsService {
  async execute({ restaurantId, slug, useDefault }: RestaurantIdPayload) {
    let normalizedRestaurantId = Number(restaurantId);

    if ((!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) && slug) {
      const restaurant = await restaurantRepository.findBySlug(String(slug).trim());
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }

    if (useDefault && (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0)) {
      const restaurant = await restaurantSettingsRepository.findDefaultActiveRestaurant();
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido.');
    }

    const settings =
      await restaurantSettingsRepository.findPublicByRestaurantId(normalizedRestaurantId);

    if (!settings) {
      const restaurant =
        await restaurantSettingsRepository.findRestaurantById(normalizedRestaurantId);

      const fallback: PublicSettingsFallback = {
        restaurantId: normalizedRestaurantId,
        primaryColor: '#c95d3d',
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: 'MERCADO_PAGO',
        pixKey: null,
        instagram: null,
        facebook: null,
        companyLegalName: null,
        ownerEmail: null,
        ownerPhone: null,
        businessHours: null,
        isOpenForOrders: true,
        averageDeliveryTime: null,
        autoAcceptOrders: false,
        trackingRequiresLogin: true,
        soundNotifications: true,
        maxConcurrentOrders: 20,
        restaurant: {
          name: restaurant?.name || null,
          slug: restaurant?.slug || null,
          logo: restaurant?.logo || null,
          coverImage: restaurant?.coverImage || null,
          description: restaurant?.description || null,
          address: restaurant?.address || null,
          addressNumber: restaurant?.addressNumber || null,
          addressComplement: restaurant?.addressComplement || null,
          addressDistrict: restaurant?.addressDistrict || null,
          city: restaurant?.city || null,
          state: restaurant?.state || null,
          zipCode: restaurant?.zipCode || null,
          banners: restaurant?.banners || [],
        },
      };

      return fallback;
    }

    return settings;
  }
}

export default new GetPublicRestaurantSettingsService();
