import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import bannerService, { type BannerPayload } from './bannerService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const payload: BannerPayload = {
  title: 'Festival de pizzas',
  highlight: '30% OFF',
  description: 'Oferta especial da semana.',
  buttonLabel: 'Ver cardápio',
  image: 'https://cdn.example.com/banner.webp',
  active: true,
  position: 0,
};

describe('bannerService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista e persiste o contrato completo dos banners', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 7, ...payload }] });
    vi.mocked(api.post).mockResolvedValue({ data: { id: 8, ...payload } });
    vi.mocked(api.put).mockResolvedValue({ data: { id: 7, ...payload } });

    await expect(bannerService.list()).resolves.toEqual([{ id: 7, ...payload }]);
    await bannerService.create(payload);
    await bannerService.update(7, payload);

    expect(api.post).toHaveBeenCalledWith('/banners', payload);
    expect(api.put).toHaveBeenCalledWith('/banners/7', payload);
  });

  it('remove um banner persistido pela rota administrativa', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { message: 'Banner removido' } });

    await bannerService.delete(9);

    expect(api.delete).toHaveBeenCalledWith('/banners/9');
  });
});
