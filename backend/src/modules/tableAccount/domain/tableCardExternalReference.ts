export function tableCardExternalReference(
  paymentIntentId: number | string,
  restaurantId: number | string,
) {
  const intentId = Number(paymentIntentId);
  const tenantId = Number(restaurantId);
  if (
    !Number.isSafeInteger(intentId) ||
    intentId <= 0 ||
    !Number.isSafeInteger(tenantId) ||
    tenantId <= 0
  ) {
    throw new Error('Referência de cartão da mesa inválida.');
  }
  return `tablecard_${intentId}_${tenantId}`;
}

export function tableCardExternalReferenceCandidates(
  paymentIntentId: number | string,
  restaurantId: number | string,
) {
  const canonical = tableCardExternalReference(paymentIntentId, restaurantId);
  const intentId = Number(paymentIntentId);
  const tenantId = Number(restaurantId);
  return [
    canonical,
    `tablecard:${intentId}:${tenantId}`,
    // Compatibilidade com intents criados durante a evolução deste fluxo antes do deploy.
    `ordercard_${intentId}_${tenantId}`,
    `ordercard:${intentId}:${tenantId}`,
    `ordercard-${intentId}-${tenantId}`,
  ];
}
