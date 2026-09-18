export function mercadoPagoCardExternalReference(
  orderId: number | string,
  restaurantId: number | string,
) {
  return `ordercard_${Number(orderId)}_${Number(restaurantId)}`;
}

export function mercadoPagoCardExternalReferenceCandidates(
  orderId: number | string,
  restaurantId: number | string,
) {
  const normalizedOrderId = Number(orderId);
  const normalizedRestaurantId = Number(restaurantId);

  return [
    mercadoPagoCardExternalReference(normalizedOrderId, normalizedRestaurantId),
    `ordercard:${normalizedOrderId}:${normalizedRestaurantId}`,
    `ordercard-${normalizedOrderId}-${normalizedRestaurantId}`,
  ];
}

export function parseMercadoPagoCardExternalReference(value: unknown) {
  const normalized = String(value || '').trim();
  const match = /^ordercard([:_-])(\d+)\1(\d+)$/i.exec(normalized);
  if (!match) return null;

  const orderId = Number(match[2] || 0);
  const restaurantId = Number(match[3] || 0);
  if (
    !Number.isSafeInteger(orderId) ||
    orderId <= 0 ||
    !Number.isSafeInteger(restaurantId) ||
    restaurantId <= 0
  ) {
    return null;
  }

  return { orderId, restaurantId };
}
