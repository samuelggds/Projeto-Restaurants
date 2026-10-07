import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import restaurantSettingsService from './restaurantSettingsService';
import { clearAuthSession, persistAuthSession } from '../modules/auth/session/authSession';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('restaurantSettingsService public performance contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearAuthSession();
    vi.mocked(api.get).mockResolvedValue({ data: { restaurantId: 7, revision: 'r1' } });
  });

  it('sincroniza somente a foto do WhatsApp do restaurante autenticado', async () => {
    persistAuthSession({ id: 7, role: 'ADMIN', restaurantId: 11 }, 'memory-token');
    localStorage.setItem('menuRestaurantId', '22');
    localStorage.setItem('gastronexa:whatsapp-profile-image:11', 'data:image/png;base64,current');
    localStorage.setItem('gastronexa:whatsapp-profile-image:22', 'data:image/png;base64,stale');
    vi.mocked(api.put).mockResolvedValue({ data: { id: 11 } });

    await restaurantSettingsService.updateSettings(11, { whatsappEnabled: true });

    expect(api.put).toHaveBeenNthCalledWith(2, '/settings/whatsapp/profile-photo', {
      imageDataUrl: 'data:image/png;base64,current',
    });
  });

  it('usa uma URL versionada somente ao baixar as configurações completas', async () => {
    await restaurantSettingsService.getPublicSettings(7, 'r1');

    expect(api.get).toHaveBeenCalledWith('/settings/public/7', {
      params: { revision: 'r1' },
    });
  });

  it('consulta revisões leves por id, slug e restaurante padrão', async () => {
    await restaurantSettingsService.getPublicSettingsRevision(7);
    await restaurantSettingsService.getPublicSettingsRevisionBySlug('pizza norte');
    await restaurantSettingsService.getDefaultPublicSettingsRevision();

    expect(api.get).toHaveBeenNthCalledWith(1, '/settings/public/7/revision');
    expect(api.get).toHaveBeenNthCalledWith(2, '/settings/public/slug/pizza%20norte/revision');
    expect(api.get).toHaveBeenNthCalledWith(3, '/settings/public/default/revision');
  });

  it('converte referências públicas de mídia para a origem real da API', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      config: { baseURL: 'http://localhost:5173/api' },
      data: {
        restaurantId: 7,
        restaurant: {
          logo: '/public-media/restaurants/7/logo?v=1',
          coverImage: 'https://cdn.example.com/cover.webp',
          banners: [{ id: 2, image: '/public-media/restaurants/7/banners/2?v=2' }],
        },
      },
    });

    const settings = await restaurantSettingsService.getPublicSettings(7, 'r1');

    expect(settings.restaurant.logo).toBe(
      'http://localhost:5173/api/public-media/restaurants/7/logo?v=1',
    );
    expect(settings.restaurant.coverImage).toBe('https://cdn.example.com/cover.webp');
    expect(settings.restaurant.banners[0].image).toBe(
      'http://localhost:5173/api/public-media/restaurants/7/banners/2?v=2',
    );
  });
});
