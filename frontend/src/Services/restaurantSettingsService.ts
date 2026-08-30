import api from './api';
import { resolvePublicMediaSource } from './publicMediaSource';

function normalizePublicSettingsMedia(settings, baseUrl) {
  const restaurant = settings?.restaurant;
  if (!restaurant || typeof restaurant !== 'object') return settings;

  return {
    ...settings,
    restaurant: {
      ...restaurant,
      logo: resolvePublicMediaSource(restaurant.logo, baseUrl),
      coverImage: resolvePublicMediaSource(restaurant.coverImage, baseUrl),
      banners: Array.isArray(restaurant.banners)
        ? restaurant.banners.map((banner) => ({
            ...banner,
            image: resolvePublicMediaSource(banner?.image, baseUrl),
          }))
        : [],
    },
  };
}

function publicSettingsFromResponse(response) {
  return normalizePublicSettingsMedia(
    response.data,
    response.config?.baseURL || api.defaults?.baseURL || '',
  );
}

class RestaurantSettingsService {
  async getMySettings() {
    const response = await api.get('/settings');
    return response.data;
  }

  async createSettings(payload) {
    const response = await api.post('/settings', payload);
    return response.data;
  }

  async updateSettings(id, payload) {
    const response = await api.put(`/settings/${id}`, payload);
    return response.data;
  }

  async onboardAsaas(payload) {
    const response = await api.post('/settings/asaas/onboard', payload);
    return response.data;
  }

  async getAsaasWalletBalance() {
    const response = await api.get('/settings/asaas/wallet/balance');
    return response.data;
  }

  async withdrawAsaasWallet(payload) {
    const response = await api.post('/settings/asaas/wallet/withdraw', payload);
    return response.data;
  }

  async startMercadoPagoOAuth() {
    const response = await api.post('/settings/mercado-pago/oauth/start');
    return response.data;
  }

  async startPagBankOAuth() {
    const response = await api.post('/settings/pagbank/oauth/start');
    return response.data;
  }

  async getPublicSettings(restaurantId, revision = '') {
    const response = await api.get(`/settings/public/${restaurantId}`, {
      params: revision ? { revision } : { _t: Date.now() },
    });
    return publicSettingsFromResponse(response);
  }

  async getPublicSettingsRevision(restaurantId) {
    const response = await api.get(`/settings/public/${restaurantId}/revision`);
    return response.data;
  }

  async getDefaultPublicSettingsRevision() {
    const response = await api.get('/settings/public/default/revision');
    return response.data;
  }

  async getPublicSettingsRevisionBySlug(slug) {
    const response = await api.get(`/settings/public/slug/${encodeURIComponent(slug)}/revision`);
    return response.data;
  }

  async getDefaultPublicSettings() {
    const response = await api.get('/settings/public/default', {
      params: { _t: Date.now() },
    });
    return publicSettingsFromResponse(response);
  }

  async getPublicSettingsBySlug(slug) {
    const response = await api.get(`/settings/public/slug/${slug}`, {
      params: { _t: Date.now() },
    });
    return publicSettingsFromResponse(response);
  }
}

export default new RestaurantSettingsService();
