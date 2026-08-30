export function resolvePublicMediaSource(source: unknown, baseUrl: unknown) {
  const normalizedSource = String(source || '').trim();
  if (!normalizedSource.startsWith('/public-media/')) return source;
  const normalizedBaseUrl = String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '');
  return normalizedBaseUrl ? `${normalizedBaseUrl}${normalizedSource}` : normalizedSource;
}

export function resolvePublicProductImages(products: unknown, baseUrl: unknown) {
  if (!Array.isArray(products)) return [];
  return products.map((product) => {
    if (!product || typeof product !== 'object') return product;
    const record = product as Record<string, unknown>;
    return {
      ...record,
      image: resolvePublicMediaSource(record.image, baseUrl),
    };
  });
}
