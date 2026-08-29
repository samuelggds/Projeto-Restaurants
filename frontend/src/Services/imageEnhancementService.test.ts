import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import api from './api';
import imageEnhancementService, { IMAGE_ENHANCEMENT_TIMEOUT_MS } from './imageEnhancementService';

vi.mock('./api', () => ({
  default: { post: vi.fn() },
}));

describe('imageEnhancementService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa o fluxo de IA específico para banners promocionais', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { imageDataUrl: 'data:image/png;base64,melhorada' },
    });

    await expect(
      imageEnhancementService.enhanceBannerImage('data:image/webp;base64,original'),
    ).resolves.toBe('data:image/png;base64,melhorada');
    expect(api.post).toHaveBeenCalledWith(
      '/image-enhancement/banner',
      {
        imageDataUrl: 'data:image/webp;base64,original',
      },
      {
        timeout: IMAGE_ENHANCEMENT_TIMEOUT_MS,
        skipBaseUrlFallback: true,
      },
    );
  });

  it('aplica a mesma proteção à melhoria da capa do restaurante', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { imageDataUrl: 'data:image/png;base64,capa-melhorada' },
    });

    await imageEnhancementService.enhanceRestaurantImage('data:image/png;base64,capa');

    expect(api.post).toHaveBeenCalledWith(
      '/image-enhancement/restaurant',
      { imageDataUrl: 'data:image/png;base64,capa' },
      {
        timeout: IMAGE_ENHANCEMENT_TIMEOUT_MS,
        skipBaseUrlFallback: true,
      },
    );
  });

  it('traduz timeout longo para uma orientação compreensível', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new AxiosError('timeout of 180000ms exceeded', 'ECONNABORTED'),
    );

    await expect(
      imageEnhancementService.enhanceBannerImage('data:image/webp;base64,original'),
    ).rejects.toThrow('demorou mais de 3 minutos');
  });
});
