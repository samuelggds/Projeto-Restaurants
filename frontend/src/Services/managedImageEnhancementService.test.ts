import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('./api', () => ({ default: { post: mocks.post } }));
import { enhanceManagedRestaurantImage } from './managedImageEnhancementService';

const input = { restaurantId: 12, purpose: 'PRODUCT' as const, imageDataUrl: 'data:image/png;base64,AA==', operationId: '00000000-0000-4000-8000-000000000012' };
beforeEach(() => vi.resetAllMocks());

describe('managed platform image requests', () => {
  it('uses the dedicated tenant path, no payer override and no automatic fallback', async () => {
    mocks.post.mockResolvedValue({ data: { imageDataUrl: input.imageDataUrl, payer: 'PLATFORM' } });
    await expect(enhanceManagedRestaurantImage(input)).resolves.toBe(input.imageDataUrl);
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/super-admin/managed-service/restaurants/12/images/enhance', {
      purpose: 'PRODUCT', imageDataUrl: input.imageDataUrl, operationId: input.operationId,
    }, { timeout: 180_000, skipBaseUrlFallback: true });
  });
  it('sanitizes provider errors and never retries', async () => {
    mocks.post.mockRejectedValue({ isAxiosError: true, response: { status: 500, data: { error: 'private-provider-content', code: 'UNRECOGNIZED' } } });
    await expect(enhanceManagedRestaurantImage(input)).rejects.toThrow('A imagem original foi mantida');
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
  it('requires a platform-paid image response', async () => {
    mocks.post.mockResolvedValue({ data: { imageDataUrl: input.imageDataUrl, payer: 'RESTAURANT' } });
    await expect(enhanceManagedRestaurantImage(input)).rejects.toThrow('não retornou uma imagem válida');
  });
  it('rejects invalid restaurant IDs before HTTP', async () => {
    await expect(enhanceManagedRestaurantImage({ ...input, restaurantId: 0 })).rejects.toThrow('Restaurante inválido');
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
