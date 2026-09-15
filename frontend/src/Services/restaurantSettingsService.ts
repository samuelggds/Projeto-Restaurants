import api from './api';
import { notifyRestaurantBrowserBrandingUpdated } from '../config/browserBranding';
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

function currentRestaurantId() {
  if (typeof window === 'undefined') return '';
  try {
    const user = JSON.parse(window.localStorage.getItem('user') || 'null');
    return String(
      user?.restaurantId ||
        user?.restaurant?.id ||
        window.localStorage.getItem('menuRestaurantId') ||
        '',
    ).trim();
  } catch {
    return String(window.localStorage.getItem('menuRestaurantId') || '').trim();
  }
}

function selectedWhatsappProfileImage() {
  if (typeof window === 'undefined') return '';
  const restaurantId = currentRestaurantId();
  if (!restaurantId) return '';
  return String(
    window.localStorage.getItem(`gastronexa:whatsapp-profile-image:${restaurantId}`) || '',
  ).trim();
}

async function syncWhatsappProfilePhoto(payload) {
  if (payload?.whatsappEnabled !== true) return;
  const imageDataUrl = selectedWhatsappProfileImage();
  if (!imageDataUrl) return;
  await api.put('/settings/whatsapp/profile-photo', { imageDataUrl });
}

class RestaurantSettingsService {
  async getMySettings() {
    const response = await api.get('/settings');
    return response.data;
  }

  async createSettings(payload) {
    const response = await api.post('/settings', payload);
    await syncWhatsappProfilePhoto(payload);
    notifyRestaurantBrowserBrandingUpdated();
    return response.data;
  }

  async updateSettings(id, payload) {
    const response = await api.put(`/settings/${id}`, payload);
    await syncWhatsappProfilePhoto(payload);
    notifyRestaurantBrowserBrandingUpdated();
    return response.data;
  }

  async getWhatsappConnection() {
    const response = await api.get('/settings/whatsapp/connection');
    return response.data;
  }

  async createWhatsappConnection() {
    const response = await api.post('/settings/whatsapp/connection');
    return response.data;
  }

  async linkWhatsappConnection(payload) {
    const response = await api.post('/settings/whatsapp/connection/link', payload);
    return response.data;
  }

  async getWhatsappQrCode() {
    const response = await api.get('/settings/whatsapp/connection/qr-code');
    return response.data;
  }

  async refreshWhatsappConnection() {
    const response = await api.post('/settings/whatsapp/connection/refresh');
    return response.data;
  }

  async disconnectWhatsappConnection() {
    const response = await api.post('/settings/whatsapp/connection/disconnect');
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
