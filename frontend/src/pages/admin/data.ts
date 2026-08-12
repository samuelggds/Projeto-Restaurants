import type { AdminSettings, Employee } from "./types";

export const adminMockSettings: AdminSettings = {
  restaurantName: "",
  coverImageUrl: "",
  primaryColor: "#d64d08",
  description: "",
  whatsapp: "",
  instagram: "",
  facebook: "",
  minimumOrder: 0,
  deliveryTime: 0,
  tableOrderingEnabled: false,
  pixProvider: "MERCADO_PAGO",
  pixKey: "",
  cardGateway: "",
  stripeSecretKey: "",
  stripeSecretKeyConfigured: false,
  stripeWebhookSecret: "",
  stripeWebhookSecretConfigured: false,
  mercadoPagoAccessToken: "",
  mercadoPagoAccessTokenConfigured: false,
  asaasAccessToken: "",
  asaasAccessTokenConfigured: false,
  pagbankEmail: "",
  pagbankToken: "",
  pagbankTokenConfigured: false,
  mainBannerUrl: "",
};

export const adminMockEmployees: Employee[] = [];
