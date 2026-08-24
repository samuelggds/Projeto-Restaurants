import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';

type RestaurantIdPayload = {
  restaurantId: number | string;
};

type RestaurantSettingsFallback = {
  id: number | null;
  restaurantId: number;
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
  legalDocumentType: string | null;
  companyDocument: string | null;
  companyLegalName: string | null;
  companyTradeName: string | null;
  companyAddress: string | null;
  companyCnae: string | null;
  monthlyRevenue: number | null;
  ownerFullName: string | null;
  ownerCpf: string | null;
  ownerBirthDate: Date | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerAddress: string | null;
  bankName: string | null;
  bankCode: string | null;
  bankAccountType: string | null;
  bankBranch: string | null;
  bankAccount: string | null;
  bankHolderDocument: string | null;
  cardGateway: string | null;
  gatewayMerchantId: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  mercadoPagoAccessToken: string | null;
  picpayToken: string | null;
  asaasAccessToken: string | null;
  pagbankEmail: string | null;
  pagbankToken: string | null;
  pagbankEnvironment: string | null;
  stripeSecretKeyConfigured: boolean;
  stripeWebhookSecretConfigured: boolean;
  mercadoPagoAccessTokenConfigured: boolean;
  picpayTokenConfigured: boolean;
  asaasAccessTokenConfigured: boolean;
  pagbankTokenConfigured: boolean;
  ownerDocumentFileUrl: string | null;
  bankProofFileUrl: string | null;
  companyContractFileUrl: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  primaryColor: string;
  fontFamily: string;
  seoTitle: string | null;
  seoDescription: string | null;
  whatsapp: string | null;
  whatsappEnabled: boolean;
  whatsappDisplayName: string | null;
  whatsappDefaultMessage: string | null;
  receiveOrdersOnWhatsapp: boolean;
  receiveStatusNotifications: boolean;
  businessHours: null;
  isOpenForOrders: boolean;
  averageDeliveryTime: string | null;
  autoAcceptOrders: boolean;
  trackingRequiresLogin: boolean;
  soundNotifications: boolean;
  maxConcurrentOrders: number;
  restaurant: {
    name: string;
    logo: string | null;
    coverImage: string | null;
    description: string | null;
    whatsapp: string | null;
    address: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressDistrict: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
};

class GetRestaurantSettingsService {
  async execute({ restaurantId }: RestaurantIdPayload) {
    const normalizedRestaurantId = Number(restaurantId);
    const settings = await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId);

    if (!settings) {
      const restaurant =
        await restaurantSettingsRepository.findRestaurantById(normalizedRestaurantId);

      if (!restaurant) {
        throw new Error('Restaurante não encontrado!');
      }

      const fallback: RestaurantSettingsFallback = {
        id: null,
        restaurantId: normalizedRestaurantId,
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
        legalDocumentType: null,
        companyDocument: null,
        companyLegalName: null,
        companyTradeName: null,
        companyAddress: null,
        companyCnae: null,
        monthlyRevenue: null,
        ownerFullName: null,
        ownerCpf: null,
        ownerBirthDate: null,
        ownerEmail: null,
        ownerPhone: null,
        ownerAddress: null,
        bankName: null,
        bankCode: null,
        bankAccountType: null,
        bankBranch: null,
        bankAccount: null,
        bankHolderDocument: null,
        cardGateway: null,
        gatewayMerchantId: null,
        stripeSecretKey: null,
        stripeWebhookSecret: null,
        mercadoPagoAccessToken: null,
        picpayToken: null,
        asaasAccessToken: null,
        pagbankEmail: null,
        pagbankToken: null,
        pagbankEnvironment: null,
        stripeSecretKeyConfigured: false,
        stripeWebhookSecretConfigured: false,
        mercadoPagoAccessTokenConfigured: false,
        picpayTokenConfigured: false,
        asaasAccessTokenConfigured: false,
        pagbankTokenConfigured: false,
        ownerDocumentFileUrl: null,
        bankProofFileUrl: null,
        companyContractFileUrl: null,
        instagram: null,
        facebook: null,
        tiktok: null,
        youtube: null,
        primaryColor: '#c95d3d',
        fontFamily: 'Inter',
        seoTitle: null,
        seoDescription: null,
        whatsapp: String(restaurant.whatsapp || '').trim() || null,
        whatsappEnabled: false,
        whatsappDisplayName: null,
        whatsappDefaultMessage: null,
        receiveOrdersOnWhatsapp: false,
        receiveStatusNotifications: false,
        businessHours: null,
        isOpenForOrders: true,
        averageDeliveryTime: null,
        autoAcceptOrders: false,
        trackingRequiresLogin: true,
        soundNotifications: true,
        maxConcurrentOrders: 20,
        restaurant: {
          name: restaurant.name,
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          description: restaurant.description,
          whatsapp: String(restaurant.whatsapp || '').trim() || null,
          address: restaurant.address,
          addressNumber: restaurant.addressNumber,
          addressComplement: restaurant.addressComplement,
          addressDistrict: restaurant.addressDistrict,
          city: restaurant.city,
          state: restaurant.state,
          zipCode: restaurant.zipCode,
        },
      };

      return fallback;
    }

    return {
      ...settings,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      mercadoPagoAccessToken: null,
      picpayToken: null,
      asaasAccessToken: null,
      pagbankToken: null,
      stripeSecretKeyConfigured: Boolean(String(settings?.stripeSecretKey || '').trim()),
      stripeWebhookSecretConfigured: Boolean(String(settings?.stripeWebhookSecret || '').trim()),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(settings?.mercadoPagoAccessToken || '').trim(),
      ),
      picpayTokenConfigured: Boolean(String(settings?.picpayToken || '').trim()),
      asaasAccessTokenConfigured: Boolean(String(settings?.asaasAccessToken || '').trim()),
      pagbankTokenConfigured: Boolean(String(settings?.pagbankToken || '').trim()),
      whatsapp: String(settings?.restaurant?.whatsapp || '').trim() || null,
    };
  }
}

export default new GetRestaurantSettingsService();
