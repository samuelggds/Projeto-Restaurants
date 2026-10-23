import { z } from 'zod/v3';
import { getImageEnhancementProfile } from '../../imageEnhancement/services/EnhanceRestaurantImageService.js';

export const MANAGED_IMAGE_MODEL = 'gpt-image-2';
export const managedImageInputSchema = z.object({
  purpose: z.enum(['PRODUCT', 'COMBO', 'BANNER', 'COVER', 'LOGO']),
  imageDataUrl: z.string().max(700_000),
  operationId: z.string().uuid(),
}).strict();
export type ManagedImageInput = z.infer<typeof managedImageInputSchema>;
export type ManagedImagePurpose = ManagedImageInput['purpose'];
export type ManagedImageActor = { userId: number; userRole: string | null };

export class ManagedImageError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'ManagedImageError';
  }
}

export function managedImageRestaurantId(value: unknown) {
  const id = typeof value === 'number' ? value : Number(String(value));
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2_147_483_647) {
    throw new ManagedImageError(400, 'MANAGED_IMAGE_INVALID_INPUT', 'Restaurante inválido.');
  }
  return id;
}

/** No remote URLs, SVG, arbitrary MIME types or client-controlled prompts. */
export function decodeManagedImage(source: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/u.exec(source);
  if (!match || source.length > 700_000) {
    throw new ManagedImageError(400, 'MANAGED_IMAGE_INVALID_INPUT', 'Envie uma imagem JPG, PNG ou WebP válida.');
  }
  const bytes = Buffer.from(match[2], 'base64');
  const png = bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  const matchesMime = (match[1] === 'image/png' && png) || (match[1] === 'image/jpeg' && jpeg) || (match[1] === 'image/webp' && webp);
  if (!matchesMime || bytes.toString('base64') !== match[2]) {
    throw new ManagedImageError(400, 'MANAGED_IMAGE_INVALID_INPUT', 'O conteúdo não corresponde ao formato da imagem.');
  }
  return { bytes, mime: match[1] };
}

export function getManagedImageProfile(purpose: ManagedImagePurpose) {
  if (purpose === 'COMBO' || purpose === 'BANNER') return getImageEnhancementProfile(purpose);
  const prompts = {
    PRODUCT: 'Enhance this real restaurant product photograph with professional lighting, sharpness, color balance and natural texture. Preserve the exact foods, ingredients, quantities, portions and product identity. Do not add or remove foods, invent ingredients, enlarge portions, add packaging, text, prices, badges, logos, watermarks or people. Keep the complete product visible in a clean square composition. The result must remain a faithful photograph of the supplied product.',
    LOGO: 'Restore this restaurant logo faithfully. Improve resolution, clarity and clean edges while preserving the exact lettering, spelling, symbols, colors, proportions and identity. Keep the complete logo centered with generous safe margins in a square canvas. Do not invent or alter any letters, add text, food, backgrounds, brands or watermarks.',
    COVER: 'Enhance this restaurant cover photograph faithfully with balanced lighting, natural colors, sharpness and clean detail. Preserve the original scene, foods, products, lettering, logo and brand identity. Keep all important elements visible with safe margins. Do not invent food, alter portions, change logo wording, add people, words, prices, badges, brands or watermarks. Compose a professional square cover without misrepresenting the original image.',
  };
  return { filename: 'managed-restaurant-image.png', size: '1024x1024' as const, prompt: prompts[purpose] };
}
