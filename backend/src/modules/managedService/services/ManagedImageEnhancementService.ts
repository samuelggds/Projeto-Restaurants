import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { ImageEnhancementResultError } from '../../imageEnhancement/errors/ImageEnhancementErrors.js';
import { toImageEnhancementHttpError } from '../../imageEnhancement/controllers/EnhanceRestaurantImageController.js';
import { decodeManagedImage, managedImageInputSchema, managedImageRestaurantId, ManagedImageError, type ManagedImageActor } from '../domain/managedImageEnhancement.js';
import { assertManagedImageProviderConfigured, managedImageProvider } from './ManagedImageProvider.js';
import { managedImageEnhancementStore, type ManagedImageAttempt } from './ManagedImageEnhancementStore.js';

export type ManagedImageDependencies = {
  authorize: (restaurantId: number, actor: ManagedImageActor) => Promise<{ id: number; name: string }>;
  begin: (attempt: ManagedImageAttempt) => Promise<void>;
  record: (attempt: ManagedImageAttempt, action: 'MANAGED_IMAGE_AI_PROCESSED' | 'MANAGED_IMAGE_AI_FAILED', metadata: Prisma.InputJsonObject) => Promise<unknown>;
  configured: () => void;
  edit: typeof managedImageProvider.edit;
};

const dependencies: ManagedImageDependencies = {
  authorize: managedImageEnhancementStore.authorize,
  begin: managedImageEnhancementStore.begin,
  record: managedImageEnhancementStore.record,
  configured: assertManagedImageProviderConfigured,
  edit: (input) => managedImageProvider.edit(input),
};

export class ManagedImageEnhancementService {
  constructor(private readonly deps: ManagedImageDependencies = dependencies) {}

  async execute(restaurantIdInput: unknown, body: unknown, actor: ManagedImageActor) {
    const restaurantId = managedImageRestaurantId(restaurantIdInput);
    const restaurant = await this.deps.authorize(restaurantId, actor);
    const parsed = managedImageInputSchema.safeParse(body);
    if (!parsed.success) throw new ManagedImageError(400, 'MANAGED_IMAGE_INVALID_INPUT', 'Dados inválidos para a melhoria da imagem.');
    const input = parsed.data;
    const image = decodeManagedImage(input.imageDataUrl);
    this.deps.configured();
    const attempt: ManagedImageAttempt = {
      restaurantId, restaurantName: restaurant.name, actor,
      purpose: input.purpose, operationId: input.operationId,
      inputDigest: createHash('sha256').update(image.bytes).digest('hex'),
    };
    // A durable audit entry must exist before spending platform funds.
    await this.deps.begin(attempt);
    let processed = false;
    try {
      const output = await this.deps.edit({ ...image, purpose: input.purpose });
      await this.deps.record(attempt, 'MANAGED_IMAGE_AI_PROCESSED', {
        billingState: output.costUsd === null ? 'UNKNOWN' : 'MEASURED',
        costUsd: output.costUsd,
        inputTokens: output.tokens.input,
        outputTokens: output.tokens.output,
        providerRequestId: output.providerRequestId,
      });
      processed = true;
      if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/u.test(output.imageDataUrl)) {
        throw new ImageEnhancementResultError();
      }
      // Preview only. Catalog and settings writes remain explicitly user-approved.
      return { imageDataUrl: output.imageDataUrl, payer: 'PLATFORM' as const, operationId: input.operationId };
    } catch (error) {
      if (!processed) {
        const rejected = error instanceof OpenAI.APIError && [400, 401, 403, 404, 422, 429].includes(error.status ?? 0);
        await this.deps.record(attempt, 'MANAGED_IMAGE_AI_FAILED', {
          billingState: rejected ? 'REJECTED' : 'UNKNOWN',
          code: toImageEnhancementHttpError(error).body.code,
        });
      }
      // No automatic retry: a timeout does not establish that OpenAI did not bill.
      throw error;
    }
  }
}

export default new ManagedImageEnhancementService();
