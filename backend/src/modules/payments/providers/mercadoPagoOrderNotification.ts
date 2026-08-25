function appendRestaurantId(baseUrl: string, restaurantId: number) {
  try {
    const notificationUrl = new URL(baseUrl);
    notificationUrl.searchParams.set('restaurantId', String(restaurantId));
    return notificationUrl.toString();
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}restaurantId=${encodeURIComponent(String(restaurantId))}`;
  }
}

export function resolveMercadoPagoOrderNotificationUrl(restaurantId?: number | string | null) {
  const normalizedRestaurantId = Number(restaurantId || 0);
  if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
    return '';
  }

  const explicitOrderNotificationUrl = String(process.env.MP_ORDER_NOTIFICATION_URL || '').trim();
  const backendUrl = String(process.env.BACKEND_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const baseUrl =
    explicitOrderNotificationUrl || (backendUrl ? `${backendUrl}/orders/webhook/mercadopago` : '');

  if (!baseUrl) {
    return '';
  }

  return appendRestaurantId(baseUrl, normalizedRestaurantId);
}

export function mercadoPagoOrderNotificationFields(restaurantId?: number | string | null) {
  const notificationUrl = resolveMercadoPagoOrderNotificationUrl(restaurantId);

  return notificationUrl ? { notification_url: notificationUrl } : {};
}
