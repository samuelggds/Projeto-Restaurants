export const ONLINE_PAYMENT_EXPIRATION_MINUTES = 30;

export function onlinePaymentExpiresAt(now = new Date()) {
  return new Date(now.getTime() + ONLINE_PAYMENT_EXPIRATION_MINUTES * 60_000);
}
