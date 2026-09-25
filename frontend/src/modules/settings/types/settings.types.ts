export type SocialSettings = {
  instagram: string;
  facebook: string;
  whatsapp: string;
  tiktok: string;
  youtube: string;
};

export type BusinessHours = {
  id: string;
  label: string;
  enabled: boolean;
  openingTime: string;
  closingTime: string;
};

export type RestaurantSettings = {
  restaurantName: string;
  slogan: string;
  logoUrl: string;
  primaryColor: string;
  coverImageUrl: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  social: SocialSettings;
  businessHours: BusinessHours[];
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minimumOrder: number;
  deliveryFee: number;
  courierFeePerDelivery: number;
  averageDeliveryTime: string;
  acceptsPix: boolean;
  openFinancePixEnabled: boolean;
  acceptsCard: boolean;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  receiveOrdersOnWhatsapp: boolean;
  receiveStatusNotifications: boolean;
  instagram: string;
  pixProvider: string;
  pixKey: string;
  cardGateway: string;
  mercadoPagoAccessToken: string;
  mercadoPagoAccessTokenConfigured: boolean;
  pagarmeSecretKey: string;
  pagarmePublicKey: string;
  pagarmeEnvironment: 'sandbox' | 'production';
  pagarmeSecretKeyConfigured: boolean;
  asaasAccessToken: string;
  asaasAccessTokenConfigured: boolean;
  monthlyRevenue: number | null;
};

export type SettingsSectionId =
  'business' | 'appearance' | 'contact' | 'whatsapp' | 'about' | 'hours' | 'orders' | 'payments';
