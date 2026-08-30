import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import restaurantSettingsService from './restaurantSettingsService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('restaurantSettingsService public performance contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { restaurantId: 7, revision: 'r1' } });
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
