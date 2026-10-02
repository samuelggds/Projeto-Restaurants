export function tablePixExternalReference(
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
    throw new Error('Referência Pix da mesa inválida.');
  }

  return `tablepix_${intentId}_${tenantId}`;
}

export function parseTablePixExternalReference(value: unknown) {
  const normalized = String(value || '').trim();
  const match = /^tablepix_(\d+)_(\d+)$/u.exec(normalized);
  if (!match) return null;

  const intentId = Number(match[1] || 0);
  const restaurantId = Number(match[2] || 0);
  if (
    !Number.isSafeInteger(intentId) ||
    intentId <= 0 ||
    !Number.isSafeInteger(restaurantId) ||
    restaurantId <= 0
  ) {
    return null;
  }

  return { intentId, restaurantId };
}
