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
  freeShippingMinimum: number | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  acceptsPix: boolean;
  acceptsCard: boolean;
  tableOrderingEnabled: boolean;
  waiterCallEnabled: boolean;
  billRequestEnabled: boolean;
  pixProvider: string;
  pixKey: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  fontFamily: string;
  seoTitle: string | null;
  seoDescription: string | null;
  whatsapp: string | null;
  whatsappEnabled: boolean;
  whatsappDisplayName: string | null;
  whatsappDefaultMessage: string | null;
  receiveOrdersOnWhatsapp: boolean;
  receiveStatusNotifications: boolean;
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
    banners: Array<{
      id: number;
      title: string;
      highlight: string | null;
      description: string | null;
      buttonLabel: string | null;
      image: string;
      position: number;
    }>;
  };
};

class GetPublicRestaurantSettingsService {
  async execute({ restaurantId, slug, useDefault }: RestaurantIdPayload) {
    let normalizedRestaurantId = Number(restaurantId);

    if ((!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) && slug) {
      const restaurant = await restaurantRepository.findBySlug(String(slug).trim());
      normalizedRestaurantId = restaurant?.active === false ? 0 : Number(restaurant?.id || 0);
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

      if (restaurant?.active === false) {
        throw new Error('Restaurante não encontrado ou indisponível.');
      }

      const fallback: PublicSettingsFallback = {
        restaurantId: normalizedRestaurantId,
        primaryColor: '#c95d3d',
        deliveryFee: 0,
        minimumOrder: 0,
        freeShippingMinimum: null,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsPix: true,
        acceptsCard: true,
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
        pixProvider: 'MERCADO_PAGO',
        pixKey: null,
        instagram: null,
        facebook: null,
        tiktok: null,
        youtube: null,
        fontFamily: 'Inter',
        seoTitle: null,
        seoDescription: null,
        whatsapp: String(restaurant?.whatsapp || '').replace(/\D/g, '') || null,
        whatsappEnabled: false,
        whatsappDisplayName: null,
        whatsappDefaultMessage: null,
        receiveOrdersOnWhatsapp: false,
        receiveStatusNotifications: false,
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

    if (settings.restaurant?.active === false) {
      throw new Error('Restaurante não encontrado ou indisponível.');
    }

    return {
      ...settings,
      whatsapp: String(settings.restaurant?.whatsapp || '').replace(/\D/g, '') || null,
    };
  }
}

export default new GetPublicRestaurantSettingsService();
