export function mercadoPagoCardExternalReference(
  orderId: number | string,
  restaurantId: number | string,
) {
  return `ordercard_${Number(orderId)}_${Number(restaurantId)}`;
}

export function mercadoPagoCardAttemptExternalReference(
  orderId: number,
  restaurantId: number,
  attemptPublicId: string,
) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(attemptPublicId))
    throw new Error('Referência de tentativa de pagamento inválida.');
  return `${mercadoPagoCardExternalReference(orderId, restaurantId)}_${attemptPublicId.replace(/-/g, '').toLowerCase()}`;
}

export function mercadoPagoCardExternalReferenceCandidates(
  orderId: number | string,
  restaurantId: number | string,
  attemptPublicId?: string,
) {
  const normalizedOrderId = Number(orderId);
  const normalizedRestaurantId = Number(restaurantId);

  return [
    ...(attemptPublicId
      ? [
          mercadoPagoCardAttemptExternalReference(
            normalizedOrderId,
            normalizedRestaurantId,
            attemptPublicId,
          ),
        ]
      : []),
    mercadoPagoCardExternalReference(normalizedOrderId, normalizedRestaurantId),
    `ordercard:${normalizedOrderId}:${normalizedRestaurantId}`,
    `ordercard-${normalizedOrderId}-${normalizedRestaurantId}`,
  ];
}

export function parseMercadoPagoCardExternalReference(value: unknown) {
  const normalized = String(value || '').trim();
  const match = /^ordercard([:_-])(\d+)\1(\d+)(?:_([a-f0-9]{32}))?$/i.exec(normalized);
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

  const attempt = match[4]?.toLowerCase();
  return {
    orderId,
    restaurantId,
    ...(attempt
      ? {
          attemptPublicId: `${attempt.slice(0, 8)}-${attempt.slice(8, 12)}-${attempt.slice(12, 16)}-${attempt.slice(16, 20)}-${attempt.slice(20)}`,
        }
      : {}),
  };
}
