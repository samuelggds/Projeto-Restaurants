import OpenAI, { toFile } from 'openai';
import { IMAGE_ENHANCEMENT_PROVIDER_TIMEOUT_MS } from '../../imageEnhancement/services/EnhanceRestaurantImageService.js';
import { ImageEnhancementConfigurationError } from '../../imageEnhancement/errors/ImageEnhancementErrors.js';
import { calculateImageUsageCostUsd } from '../../aiSupport/services/openAiUsageCost.js';
import { getManagedImageProfile, MANAGED_IMAGE_MODEL, type ManagedImagePurpose } from '../domain/managedImageEnhancement.js';

export type ManagedImageOutput = {
  imageDataUrl: string;
  costUsd: number | null;
  providerRequestId: string | null;
  tokens: { input: number | null; output: number | null };
};

function safeTokenCount(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function assertManagedImageProviderConfigured() {
  if (!String(process.env.OPENAI_API_KEY || '').trim()) throw new ImageEnhancementConfigurationError();
}

/** Platform-paid entry point. Never calls the restaurant wallet or paidImageEdit. */
export const managedImageProvider = {
  async edit(input: { bytes: Buffer; mime: string; purpose: ManagedImagePurpose }): Promise<ManagedImageOutput> {
    assertManagedImageProviderConfigured();
    const client = new OpenAI({
      apiKey: String(process.env.OPENAI_API_KEY).trim(),
      timeout: IMAGE_ENHANCEMENT_PROVIDER_TIMEOUT_MS,
      maxRetries: 0,
    });
    const profile = getManagedImageProfile(input.purpose);
    const extension = input.mime === 'image/jpeg' ? 'jpg' : input.mime === 'image/webp' ? 'webp' : 'png';
    const result = await client.images.edit({
      model: MANAGED_IMAGE_MODEL,
      image: await toFile(input.bytes, `restaurant-image.${extension}`, { type: input.mime }),
      prompt: profile.prompt,
      size: profile.size,
      quality: 'high',
      n: 1,
    });
    const metadata = result as unknown as { usage?: unknown; _request_id?: string };
    const usage = metadata.usage as { input_tokens?: unknown; output_tokens?: unknown } | undefined;
    const cost = calculateImageUsageCostUsd(metadata.usage, 0);
    const base64 = result.data?.[0]?.b64_json;
    return {
      imageDataUrl: typeof base64 === 'string' && base64.length <= 24_000_000 ? `data:image/png;base64,${base64}` : '',
      costUsd: Number.isFinite(cost) && cost > 0 ? cost : null,
      providerRequestId: typeof metadata._request_id === 'string' && /^[A-Za-z0-9_-]{1,191}$/u.test(metadata._request_id) ? metadata._request_id : null,
      tokens: { input: safeTokenCount(usage?.input_tokens), output: safeTokenCount(usage?.output_tokens) },
    };
  },
};
