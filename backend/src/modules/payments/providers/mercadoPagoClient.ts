import { MercadoPagoConfig, Payment, PaymentRefund, Preference } from 'mercadopago';
import { getMercadoPagoAccessToken } from '../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';

async function getAccessToken(restaurantId?: number | null) {
  const normalizedRestaurantId = Number(restaurantId || 0);
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
  if (Number.isSafeInteger(normalizedRestaurantId) && normalizedRestaurantId > 0) {
    return getMercadoPagoAccessToken(normalizedRestaurantId);
  }
  const globalToken = String(process.env.MP_ACCESS_TOKEN || '').trim();
  const token = allowGlobalFallback ? globalToken : '';

  if (!token) {
    throw new Error(
      'Pagamento Mercado Pago indisponivel. Configure access token do Mercado Pago nas configuracoes do restaurante.',
    );
  }

  return token;
}

export async function getMercadoPagoClient(restaurantId?: number | null) {
  return new MercadoPagoConfig({
    accessToken: await getAccessToken(restaurantId),
  });
}

export async function getMercadoPagoPaymentApi(restaurantId?: number | null) {
  return new Payment(await getMercadoPagoClient(restaurantId));
}

export async function getMercadoPagoPaymentRefundApi(restaurantId?: number | null) {
  return new PaymentRefund(await getMercadoPagoClient(restaurantId));
}

export async function getMercadoPagoPreferenceApi(restaurantId?: number | null) {
  return new Preference(await getMercadoPagoClient(restaurantId));
}
