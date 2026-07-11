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
  mercadoPagoAccessToken: string | null;
  picpayToken: string | null;
  asaasAccessToken: string | null;
  pagbankEmail: string | null;
  pagbankToken: string | null;
  pagbankEnvironment: string | null;
  stripeSecretKeyConfigured: boolean;
  mercadoPagoAccessTokenConfigured: boolean;
  picpayTokenConfigured: boolean;
  asaasAccessTokenConfigured: boolean;
  pagbankTokenConfigured: boolean;
  ownerDocumentFileUrl: string | null;
  bankProofFileUrl: string | null;
  companyContractFileUrl: string | null;
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
        mercadoPagoAccessToken: null,
        picpayToken: null,
        asaasAccessToken: null,
        pagbankEmail: null,
        pagbankToken: null,
        pagbankEnvironment: null,
        stripeSecretKeyConfigured: false,
        mercadoPagoAccessTokenConfigured: false,
        picpayTokenConfigured: false,
        asaasAccessTokenConfigured: false,
        pagbankTokenConfigured: false,
        ownerDocumentFileUrl: null,
        bankProofFileUrl: null,
        companyContractFileUrl: null,
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
      stripeSecretKey: null,
      mercadoPagoAccessToken: null,
      picpayToken: null,
      asaasAccessToken: null,
      pagbankToken: null,
      stripeSecretKeyConfigured: Boolean(
        String(settings?.stripeSecretKey || "").trim(),
      ),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(settings?.mercadoPagoAccessToken || "").trim(),
      ),
      picpayTokenConfigured: Boolean(
        String(settings?.picpayToken || "").trim(),
      ),
      asaasAccessTokenConfigured: Boolean(
        String(settings?.asaasAccessToken || "").trim(),
      ),
      pagbankTokenConfigured: Boolean(
        String(settings?.pagbankToken || "").trim(),
      ),
      whatsapp: String(settings?.restaurant?.whatsapp || "").trim() || null,
    };
  }
}

export default new GetRestaurantSettingsService();
