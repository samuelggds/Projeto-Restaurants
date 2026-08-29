import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import imageEnhancementService from './imageEnhancementService';

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
    expect(api.post).toHaveBeenCalledWith('/image-enhancement/banner', {
      imageDataUrl: 'data:image/webp;base64,original',
    });
  });
});
