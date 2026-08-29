import OpenAI, { toFile } from 'openai';
import {
  ImageEnhancementConfigurationError,
  ImageEnhancementInputError,
  ImageEnhancementResultError,
} from '../errors/ImageEnhancementErrors.js';

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/;
export const IMAGE_ENHANCEMENT_PROVIDER_TIMEOUT_MS = 165_000;

export type RestaurantImagePurpose = 'COVER' | 'BANNER';

export function getImageEnhancementProfile(purpose: RestaurantImagePurpose) {
  if (purpose === 'BANNER') {
    return {
      filename: 'restaurant-promotion-banner.webp',
      size: '1536x1024' as const,
      prompt:
        'Transform this image into a premium, photorealistic restaurant promotion banner. Preserve the food, products, logo and brand identity faithfully. Compose a wide horizontal scene intended to be cropped to a 1440 by 560 banner, keeping the main subject in the center-right and leaving a clean, darker safe area on the left for promotional text. Improve lighting, sharpness, color balance and appetizing food detail. Do not add any words, prices, badges, logos, watermarks or invented products. Do not crop important brand elements.',
    };
  }

  return {
    filename: 'restaurant-cover.webp',
    size: '1024x1024' as const,
    prompt:
      'Create a polished high-definition square login hero from this restaurant brand image. Faithfully restore the complete original logo, lettering, colors and identity with crisp clean edges. Place the entire logo centered and clearly visible, occupying at most 55 percent of the canvas, with generous space around it. Build a tasteful, softly lit pizza restaurant background that complements the logo. Remove blur, pixelation and compression artifacts. Do not crop the logo, do not enlarge it to fill the canvas, do not alter its wording, and do not add new text, brands or watermarks.',
  };
}

class EnhanceRestaurantImageService {
  async execute(imageDataUrl: unknown, purpose: RestaurantImagePurpose = 'COVER') {
    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new ImageEnhancementConfigurationError();

    const match = String(imageDataUrl || '').match(DATA_URL_PATTERN);
    if (!match) {
      throw new ImageEnhancementInputError('Envie uma imagem JPG, PNG ou WebP válida.');
    }

    const input = Buffer.from(match[2], 'base64');
    if (!input.length || input.length > 5 * 1024 * 1024) {
      throw new ImageEnhancementInputError('A imagem deve ter no máximo 5 MB.');
    }

    // Edição de imagem é uma operação paga e não idempotente. Um timeout deve
    // encerrar a tentativa, sem o retry automático padrão do SDK.
    const client = new OpenAI({
      apiKey,
      timeout: IMAGE_ENHANCEMENT_PROVIDER_TIMEOUT_MS,
      maxRetries: 0,
    });
    const profile = getImageEnhancementProfile(purpose);
    const editRequest: OpenAI.Images.ImageEditParams = {
      model: 'gpt-image-2',
      image: await toFile(input, profile.filename, { type: match[1] }),
      prompt: profile.prompt,
      size: profile.size,
      quality: 'high',
    };
    const result = await client.images.edit(editRequest);

    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new ImageEnhancementResultError();
    return { imageDataUrl: `data:image/png;base64,${base64}` };
  }
}

export default new EnhanceRestaurantImageService();
