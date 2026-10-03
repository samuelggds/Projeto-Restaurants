import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import restaurantRepository from '../../restaurants/repositories/RestaurantRepository.js';
import { createPublicMediaReference } from '../../publicMedia/utils/publicMediaReference.js';
import { efiOpenFinanceConfigured } from '../../payments/providers/efiOpenFinance.js';
import {
  getMercadoPagoAccountReadiness,
  paymentConnectionConfiguration,
} from './RestaurantPaymentReadinessService.js';

type RestaurantIdPayload = {
  restaurantId?: number | string;
  slug?: string;
  useDefault?: boolean;
};

type RestaurantCategory =
  | 'RESTAURANTE'
  | 'PIZZARIA'
  | 'HAMBURGUERIA'
  | 'ACAITERIA'
  | 'CAFETERIA'
  | 'JAPONESA'
  | 'CHURRASCARIA'
  | 'DOCERIA'
  | 'LANCHONETE'
  | 'PADARIA'
  | 'OUTRO';

const RESTAURANT_CATEGORIES = new Set<RestaurantCategory>([
  'RESTAURANTE',
  'PIZZARIA',
  'HAMBURGUERIA',
  'ACAITERIA',
  'CAFETERIA',
  'JAPONESA',
  'CHURRASCARIA',
  'DOCERIA',
  'LANCHONETE',
  'PADARIA',
  'OUTRO',
]);

type PublicSettingsFallback = {
  restaurantId: number;
  primaryColor: string;
  deliveryFeeMode: 'FIXED' | 'DISTANCE';
  deliveryFee: number;
  minimumOrder: number;
  freeShippingMinimum: number | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  acceptsPix: boolean;
  openFinancePixEnabled: boolean;
  acceptsCard: boolean;
  acceptsDebitCard: boolean;
  tableOrderingEnabled: boolean;
  waiterCallEnabled: boolean;
  billRequestEnabled: boolean;
  pixProvider: string;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  fontFamily: string;
  seoTitle: string | null;
  seoDescription: string | null;
  landingPageEnabled: boolean;
  whatsapp: string | null;
  whatsappEnabled: boolean;
  whatsappDisplayName: string | null;
  whatsappDefaultMessage: string | null;
  receiveOrdersOnWhatsapp: boolean;
  receiveStatusNotifications: boolean;
  companyLegalName: string | null;
  businessHours: unknown;
  isOpenForOrders: boolean;
  averageDeliveryTime: string | null;
  deliveryTimeMin: number | null;
  deliveryTimeMax: number | null;
  autoAcceptOrders: boolean;
  trackingRequiresLogin: boolean;
  soundNotifications: boolean;
  maxConcurrentOrders: number;
  restaurantRatingAverage?: number | null;
  restaurantRatingCount?: number;
  restaurant: {
    updatedAt?: Date;
    name: string | null;
    slug: string | null;
    category: RestaurantCategory;
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
      updatedAt?: Date;
    }>;
  };
};

function normalizeRestaurantCategory(value: unknown): RestaurantCategory {
  const normalized = String(value || '').trim().toUpperCase() as RestaurantCategory;
  return RESTAURANT_CATEGORIES.has(normalized) ? normalized : 'RESTAURANTE';
}

async function loadRestaurantCategory(restaurantId: number): Promise<RestaurantCategory> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ category?: string | null }>>(
      'SELECT "category" FROM "Restaurant" WHERE "id" = $1 LIMIT 1',
      restaurantId,
    );
    return normalizeRestaurantCategory(rows[0]?.category);
  } catch {
    return 'RESTAURANTE';
  }
}

function externalizePublicRestaurantImages(
  restaurantId: number,
  restaurant: PublicSettingsFallback['restaurant'] | null,
) {
  if (!restaurant) return null;
  const { updatedAt, banners = [], ...publicRestaurant } = restaurant;
  return {
    ...publicRestaurant,
    logo: createPublicMediaReference(
      restaurant.logo,
      `/public-media/restaurants/${restaurantId}/logo`,
      updatedAt,
    ),
    coverImage: createPublicMediaReference(
      restaurant.coverImage,
      `/public-media/restaurants/${restaurantId}/cover`,
      updatedAt,
    ),
    banners: banners.map(({ updatedAt: bannerUpdatedAt, ...banner }) => ({
      ...banner,
      image:
        createPublicMediaReference(
          banner.image,
          `/public-media/restaurants/${restaurantId}/banners/${banner.id}`,
          bannerUpdatedAt,
        ) || '',
    })),
  };
}

function publicCommercialContact(value: unknown) {
  return String(value || '').replace(/\D/g, '') || null;
}

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

    const [settings, deliveryRatingSummary] = await Promise.all([
      restaurantSettingsRepository.findPublicByRestaurantId(normalizedRestaurantId),
      prisma.order.aggregate({
        where: {
          restaurantId: normalizedRestaurantId,
          type: 'DELIVERY',
          deliveryConfirmedAt: { not: null },
          deliveryRating: { not: null },
        },
        _avg: { deliveryRating: true },
        _count: { deliveryRating: true },
      }),
    ]);
    const restaurantRatingAverage =
      deliveryRatingSummary._count.deliveryRating > 0
        ? Number(deliveryRatingSummary._avg.deliveryRating || 0)
        : null;
    const restaurantRatingCount = Number(deliveryRatingSummary._count.deliveryRating || 0);
    const restaurantRatingFields =
      restaurantRatingCount > 0
        ? { restaurantRatingAverage, restaurantRatingCount }
        : {};

    if (!settings) {
      const restaurant =
        await restaurantSettingsRepository.findRestaurantById(normalizedRestaurantId);

      if (restaurant?.active === false) {
        throw new Error('Restaurante não encontrado ou indisponível.');
      }

      const category = await loadRestaurantCategory(normalizedRestaurantId);
      const commercialNumber = publicCommercialContact(restaurant?.whatsapp);
      const fallback: PublicSettingsFallback = {
        restaurantId: normalizedRestaurantId,
        primaryColor: '#c95d3d',
        deliveryFeeMode: 'FIXED',
        deliveryFee: 0,
        minimumOrder: 0,
        freeShippingMinimum: null,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsPix: false,
        openFinancePixEnabled: false,
        acceptsCard: false,
        acceptsDebitCard: false,
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
        pixProvider: 'MERCADO_PAGO',
        instagram: null,
        facebook: null,
        tiktok: null,
        youtube: null,
        fontFamily: 'Inter',
        seoTitle: null,
        seoDescription: null,
        landingPageEnabled: false,
        whatsapp: commercialNumber,
        // Na resposta pública este flag significa que há um contato disponível
        // para a Home. A automação de mensagens continua governada pelas configs
        // privadas e pelo notification outbox.
        whatsappEnabled: Boolean(commercialNumber),
        whatsappDisplayName: commercialNumber,
        whatsappDefaultMessage: null,
        receiveOrdersOnWhatsapp: false,
        receiveStatusNotifications: false,
        companyLegalName: null,
        businessHours: null,
        isOpenForOrders: true,
        averageDeliveryTime: null,
        deliveryTimeMin: null,
        deliveryTimeMax: null,
        autoAcceptOrders: false,
        trackingRequiresLogin: true,
        soundNotifications: true,
        maxConcurrentOrders: 20,
        ...restaurantRatingFields,
        restaurant: {
          updatedAt: restaurant?.updatedAt,
          name: restaurant?.name || null,
          slug: restaurant?.slug || null,
          category,
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

      return {
        ...fallback,
        restaurant: externalizePublicRestaurantImages(normalizedRestaurantId, fallback.restaurant),
      };
    }

    if (settings.restaurant?.active === false) {
      throw new Error('Restaurante não encontrado ou indisponível.');
    }

    const privateSettings =
      await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId);

    const pixProvider = String(privateSettings?.pixProvider || '').trim().toUpperCase();
    const cardProvider = String(privateSettings?.cardGateway || '').trim().toUpperCase();
    const mercadoPagoPlatformReady = paymentConnectionConfiguration('MERCADO_PAGO');
    const needsMercadoPagoReadiness =
      mercadoPagoPlatformReady &&
      ((settings.acceptsPix === true && pixProvider === 'MERCADO_PAGO') ||
        (settings.acceptsCard === true && cardProvider === 'MERCADO_PAGO'));
    const mercadoPagoReadiness = needsMercadoPagoReadiness
      ? await getMercadoPagoAccountReadiness({
          restaurantId: normalizedRestaurantId,
          settings: privateSettings,
        })
      : null;

    const acceptsPix =
      settings.acceptsPix === true &&
      pixProvider === 'MERCADO_PAGO' &&
      mercadoPagoReadiness?.readyForPix === true;
    const acceptsCard =
      settings.acceptsCard === true &&
      cardProvider === 'MERCADO_PAGO' &&
      mercadoPagoReadiness?.readyForCard === true;
    const acceptsDebitCard = acceptsCard;
    const openFinanceReady = Boolean(
      settings.openFinancePixEnabled &&
        efiOpenFinanceConfigured() &&
        String(privateSettings?.pixKey || '').trim(),
    );

    const rawRestaurant = settings.restaurant as unknown as Omit<
      PublicSettingsFallback['restaurant'],
      'category'
    > | null;
    const category = await loadRestaurantCategory(normalizedRestaurantId);
    const restaurant = rawRestaurant ? { ...rawRestaurant, category } : null;
    const commercialNumber = publicCommercialContact(settings.restaurant?.whatsapp);

    return {
      ...settings,
      ...restaurantRatingFields,
      ...(typeof settings.acceptsPix === 'boolean' ? { acceptsPix } : {}),
      ...(typeof settings.acceptsCard === 'boolean' ? { acceptsCard } : {}),
      acceptsDebitCard,
      openFinancePixEnabled: openFinanceReady,
      ...(restaurant
        ? { restaurant: externalizePublicRestaurantImages(normalizedRestaurantId, restaurant) }
        : {}),
      whatsapp: commercialNumber,
      whatsappEnabled: Boolean(commercialNumber),
      whatsappDisplayName: commercialNumber,
    };
  }
}

export default new GetPublicRestaurantSettingsService();
