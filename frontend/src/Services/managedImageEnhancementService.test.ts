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

  it.each([
    { name: 'known provider code', serverCode: 'IMAGE_AI_PROVIDER_ERROR', transportCode: '', status: 502, message: 'O serviço de IA não respondeu corretamente' },
    { name: 'aborted request', serverCode: '', transportCode: 'ECONNABORTED', status: 0, message: 'A OpenAI demorou demais' },
    { name: 'timed out request', serverCode: '', transportCode: 'ETIMEDOUT', status: 0, message: 'A OpenAI demorou demais' },
    { name: 'forbidden session', serverCode: '', transportCode: '', status: 403, message: 'A sessão não está autorizada' },
    { name: 'unauthorized session', serverCode: '', transportCode: '', status: 401, message: 'A sessão não está autorizada' },
    { name: 'unknown provider response', serverCode: 'UNRECOGNIZED', transportCode: '', status: 500, message: 'Não foi possível obter a melhoria' },
  ])('preserves the original cause with a safe message for $name', async ({ serverCode, transportCode, status, message }) => {
    const failure = {
      isAxiosError: true,
      code: transportCode,
      response: status ? { status, data: { code: serverCode, error: 'private-provider-content' } } : undefined,
    };
    mocks.post.mockRejectedValue(failure);
    const request = enhanceManagedRestaurantImage(input);
    await expect(request).rejects.toMatchObject({ cause: failure, message: expect.stringContaining(message) });
    await expect(request).rejects.not.toThrow('private-provider-content');
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
});
