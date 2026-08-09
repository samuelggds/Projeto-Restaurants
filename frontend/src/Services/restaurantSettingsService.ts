import api from "./api";

class RestaurantSettingsService {
  async getMySettings() {
    const response = await api.get("/settings");
    return response.data;
  }

  async createSettings(payload) {
    const response = await api.post("/settings", payload);
    return response.data;
  }

  async updateSettings(id, payload) {
    const response = await api.put(`/settings/${id}`, payload);
    return response.data;
  }

  async onboardAsaas(payload) {
    const response = await api.post("/settings/asaas/onboard", payload);
    return response.data;
  }

  async getAsaasWalletBalance() {
    const response = await api.get("/settings/asaas/wallet/balance");
    return response.data;
  }

  async withdrawAsaasWallet(payload) {
    const response = await api.post("/settings/asaas/wallet/withdraw", payload);
    return response.data;
  }

  async startMercadoPagoOAuth() {
    const response = await api.post("/settings/mercado-pago/oauth/start");
    return response.data;
  }

  async startPagBankOAuth() {
    const response = await api.post("/settings/pagbank/oauth/start");
    return response.data;
  }

  async getPublicSettings(restaurantId) {
    const response = await api.get(`/settings/public/${restaurantId}`);
    return response.data;
  }

  async getPublicSettingsBySlug(slug) {
    const response = await api.get(`/settings/public/slug/${slug}`);
    return response.data;
  }
}

export default new RestaurantSettingsService();
