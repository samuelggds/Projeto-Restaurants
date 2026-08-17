const MAX_PERSISTENT_IMAGE_LENGTH = 750_000;

export function normalizeRestaurantImage(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  if (normalized.startsWith('blob:')) {
    throw new Error('A imagem enviada é temporária. Selecione o arquivo novamente.');
  }

  const isPersistentUrl = /^https?:\/\//i.test(normalized);
  const isPersistentImageData = /^data:image\/(jpeg|png|webp);base64,/i.test(normalized);
  if (!isPersistentUrl && !isPersistentImageData) {
    throw new Error('Formato de imagem inválido.');
  }

  if (normalized.length > MAX_PERSISTENT_IMAGE_LENGTH) {
    throw new Error('A imagem ultrapassa o tamanho permitido.');
  }

  return normalized;
}
