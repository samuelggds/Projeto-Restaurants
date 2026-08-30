const PERSISTED_IMAGE_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,/i;

export function createPublicMediaReference(
  source: string | null | undefined,
  path: string,
  updatedAt?: Date | null,
) {
  if (!source || !updatedAt || !PERSISTED_IMAGE_PATTERN.test(source)) return source;
  return `${path}?v=${updatedAt.getTime()}`;
}

export function isPublicProductMediaReference(
  source: string | null | undefined,
  restaurantId: number,
  productId: number,
) {
  const normalized = String(source || '').trim();
  if (!normalized) return false;

  try {
    const pathname = new URL(normalized, 'http://local.invalid').pathname.replace(/\/+$/, '');
    const expectedPath = `/public-media/restaurants/${restaurantId}/products/${productId}`;
    return pathname === expectedPath || pathname.endsWith(`/api${expectedPath}`);
  } catch {
    return false;
  }
}
