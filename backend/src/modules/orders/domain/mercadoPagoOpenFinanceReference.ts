export const MERCADO_PAGO_OPEN_FINANCE_PAYMENT_PREFIX = 'mp_open_finance_order:';

export function mercadoPagoOpenFinanceExternalReference(
  orderId: number | string,
  restaurantId: number | string,
) {
  return `orderopenfinance:${Number(restaurantId)}:${Number(orderId)}`;
}

export function parseMercadoPagoOpenFinanceExternalReference(value: unknown) {
  const match = /^orderopenfinance:(\d+):(\d+)$/i.exec(String(value || '').trim());
  if (!match) return null;

  const restaurantId = Number(match[1] || 0);
  const orderId = Number(match[2] || 0);
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) return null;
  if (!Number.isSafeInteger(orderId) || orderId <= 0) return null;

  return { restaurantId, orderId };
}

export function mercadoPagoOpenFinancePaymentId(providerOrderId: unknown) {
  const normalized = String(providerOrderId || '').trim();
  if (!normalized) return '';
  return `${MERCADO_PAGO_OPEN_FINANCE_PAYMENT_PREFIX}${normalized}`;
}

export function parseMercadoPagoOpenFinancePaymentId(value: unknown) {
  const normalized = String(value || '').trim();
  if (!normalized.toLowerCase().startsWith(MERCADO_PAGO_OPEN_FINANCE_PAYMENT_PREFIX)) {
    return '';
  }
  return normalized.slice(MERCADO_PAGO_OPEN_FINANCE_PAYMENT_PREFIX.length).trim();
}
